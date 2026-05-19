import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maybeProcessThread } from "@/lib/ai-reply-runner";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    if (!userId) return NextResponse.json({ error: "u required" }, { status: 400 });

    const thread = await prisma.letterThread.findUnique({
      where: { id },
      include: { letters: { orderBy: { createdAt: "asc" } } }
    });
    if (!thread) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (thread.initiatorId !== userId && thread.receiverId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 내가 받은 안 읽은 편지 read 처리
    await prisma.letter.updateMany({
      where: { threadId: id, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() }
    });

    // 이 thread에 AI 답장이 필요하면 백그라운드로 처리 시작
    maybeProcessThread(id);

    const last = thread.letters[thread.letters.length - 1];
    const myTurn =
      thread.status === "ACTIVE" && thread.letterCount < 10 && (!last || last.senderId !== userId);

    return NextResponse.json({
      thread: {
        id: thread.id,
        status: thread.status,
        letterCount: thread.letterCount,
        archivedAt: thread.archivedAt
      },
      myTurn,
      letters: thread.letters.map((l) => ({
        id: l.id,
        senderIsMe: l.senderId === userId,
        alias: l.alias,
        text: l.text,
        createdAt: l.createdAt
      }))
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
