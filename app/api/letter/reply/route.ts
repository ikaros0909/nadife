import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { generateAlias } from "@/lib/alias";
import { todayKey } from "@/lib/utils";

const Body = z.object({
  senderId: z.string(),
  threadId: z.string(),
  text: z.string().min(20).max(400)
});

const MAX_LETTERS = 10; // 5왕복 = 10통

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

    // 답장 차례인지 확인 — 마지막 편지가 본인이면 안 됨
    const last = thread.letters[thread.letters.length - 1];
    if (last && last.senderId === senderId) {
      return NextResponse.json(
        { error: "상대의 답을 기다리고 있어요." },
        { status: 409 }
      );
    }

    if (thread.letterCount >= MAX_LETTERS) {
      return NextResponse.json({ error: "이 편지함은 이미 가득 찼어요." }, { status: 410 });
    }

    const mod = moderate(text, { maxLen: 400 });
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });

    const date = todayKey();
    const alias = generateAlias(senderId, date, "letter");

    const newCount = thread.letterCount + 1;
    const shouldArchive = newCount >= MAX_LETTERS;

    await prisma.$transaction(async (tx) => {
      await tx.letter.create({
        data: { threadId, senderId, alias, text: mod.text, isAI: false }
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

    // AI 답장은 별도 스케줄러(ai-reply-runner)가 처리. 즉시 트리거는 sweep이 발동하는
    // /home, /api/inbox, /api/letter/thread/[id] 가 다음 호출될 때.
    return NextResponse.json({ ok: true, archived: shouldArchive });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
