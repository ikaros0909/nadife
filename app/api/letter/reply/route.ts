import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { generateAlias } from "@/lib/alias";
import { todayKey } from "@/lib/utils";
import { deliveryDelayMs, distanceKm } from "@/lib/match";

const Body = z.object({
  senderId: z.string(),
  threadId: z.string(),
  text: z.string().min(20).max(400)
});

const MAX_LETTERS = 10; // 5왕복 = 10통 (unlimited 채널이면 무시)

export async function POST(req: NextRequest) {
  try {
    const { senderId, threadId, text } = Body.parse(await req.json());

    const thread = await prisma.letterThread.findUnique({
      where: { id: threadId },
      include: { letters: { orderBy: { createdAt: "asc" } } }
    });
    if (!thread) return NextResponse.json({ error: "편지함을 찾을 수 없어요." }, { status: 404 });
    if (thread.status !== "ACTIVE") {
      return NextResponse.json({ error: "이미 닫힌 편지함이에요." }, { status: 410 });
    }
    if (thread.initiatorId !== senderId && thread.receiverId !== senderId) {
      return NextResponse.json({ error: "이 편지함의 사람이 아니에요." }, { status: 403 });
    }

    // 답장 차례인지 확인 — 마지막 편지가 본인이면 안 됨 (unlimited여도 동일)
    const last = thread.letters[thread.letters.length - 1];
    if (last && last.senderId === senderId) {
      return NextResponse.json(
        { error: "상대의 답을 기다리고 있어요." },
        { status: 409 }
      );
    }

    // unlimited 채널이 아닐 때만 10통 캡 적용
    if (!thread.unlimited && thread.letterCount >= MAX_LETTERS) {
      return NextResponse.json({ error: "이 편지함은 이미 가득 찼어요." }, { status: 410 });
    }

    const mod = moderate(text, { maxLen: 400 });
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });

    const date = todayKey();
    const alias = generateAlias(senderId, date, "letter");

    const newCount = thread.letterCount + 1;
    // unlimited면 archived 안 됨. 한정 채널이면 10통 도달 시 archived.
    const shouldArchive = !thread.unlimited && newCount >= MAX_LETTERS;

    // 비행 시간 계산 — unlimited 채널일 때만 거리 기반 지연 적용
    let arrivesAt: Date | null = null;
    if (thread.unlimited) {
      const partnerId =
        thread.initiatorId === senderId ? thread.receiverId : thread.initiatorId;
      const [me, partner] = await Promise.all([
        prisma.user.findUnique({
          where: { id: senderId },
          select: { geoOptIn: true, geoLat: true, geoLng: true }
        }),
        prisma.user.findUnique({
          where: { id: partnerId },
          select: { geoOptIn: true, geoLat: true, geoLng: true }
        })
      ]);
      let dist: number | null = null;
      if (
        me?.geoOptIn &&
        partner?.geoOptIn &&
        me.geoLat != null && me.geoLng != null &&
        partner.geoLat != null && partner.geoLng != null
      ) {
        dist = distanceKm(me.geoLat, me.geoLng, partner.geoLat, partner.geoLng);
      }
      const delay = deliveryDelayMs(dist);
      arrivesAt = new Date(Date.now() + delay);
    }

    await prisma.$transaction(async (tx) => {
      await tx.letter.create({
        data: { threadId, senderId, alias, text: mod.text, isAI: false, arrivesAt }
      });
      await tx.letterThread.update({
        where: { id: threadId },
        data: {
          letterCount: newCount,
          lastLetterAt: new Date(),
          status: shouldArchive ? "ARCHIVED" : "ACTIVE",
          archivedAt: shouldArchive ? new Date() : undefined
        }
      });
    });

    return NextResponse.json({
      ok: true,
      archived: shouldArchive,
      arrivesAt: arrivesAt?.toISOString() ?? null
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
