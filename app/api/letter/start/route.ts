import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { generateAlias } from "@/lib/alias";
import { todayKey } from "@/lib/utils";

const Body = z.object({
  senderId: z.string(),
  receiverId: z.string(),
  text: z.string().min(20).max(400)
});

const MAX_ACTIVE_PER_USER = 5;

export async function POST(req: NextRequest) {
  try {
    const { senderId, receiverId, text } = Body.parse(await req.json());
    if (senderId === receiverId) {
      return NextResponse.json({ error: "자기 자신에게는 보낼 수 없어요." }, { status: 400 });
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return NextResponse.json({ error: "받는 사람이 없어요." }, { status: 404 });

    const mod = moderate(text, { maxLen: 400 });
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });

    // 이미 두 사람 간 ACTIVE 스레드가 있으면 그쪽으로 라우팅
    const existing = await prisma.letterThread.findFirst({
      where: {
        status: "ACTIVE",
        OR: [
          { initiatorId: senderId, receiverId },
          { initiatorId: receiverId, receiverId: senderId }
        ]
      }
    });
    if (existing) {
      return NextResponse.json({ threadId: existing.id, alreadyExists: true });
    }

    // 동시 ACTIVE 스레드 상한
    const myActive = await prisma.letterThread.count({
      where: {
        status: "ACTIVE",
        OR: [{ initiatorId: senderId }, { receiverId: senderId }]
      }
    });
    if (myActive >= MAX_ACTIVE_PER_USER) {
      return NextResponse.json(
        { error: `동시에 주고받을 수 있는 편지는 ${MAX_ACTIVE_PER_USER}통까지예요. 먼저 정리해주세요.` },
        { status: 429 }
      );
    }

    const date = todayKey();
    const senderAlias = generateAlias(senderId, date, "letter");

    const thread = await prisma.letterThread.create({
      data: {
        initiatorId: senderId,
        receiverId,
        status: "ACTIVE",
        letterCount: 1,
        lastLetterAt: new Date(),
        letters: {
          create: {
            senderId,
            alias: senderAlias,
            text: mod.text,
            isAI: false
          }
        }
      },
      include: { letters: true }
    });

    // AI 답장은 별도 스케줄러(ai-reply-runner)가 thread를 sweep 하면서 처리.
    // 사용자가 thread 페이지/홈/인박스로 돌아오면 트리거됨.
    return NextResponse.json({ threadId: thread.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
