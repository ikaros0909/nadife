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

    // 내가 받은 안 읽은 편지 — 이미 도착한 것만 read 처리
    const now = new Date();
    await prisma.letter.updateMany({
      where: {
        threadId: id,
        senderId: { not: userId },
        readAt: null,
        OR: [{ arrivesAt: null }, { arrivesAt: { lte: now } }]
      },
      data: { readAt: new Date() }
    });

    // 이 thread에 AI 답장이 필요하면 백그라운드로 처리 시작
    maybeProcessThread(id);

    const last = thread.letters[thread.letters.length - 1];
    const myTurn =
      thread.status === "ACTIVE" &&
      (thread.unlimited || thread.letterCount < 10) &&
      (!last || last.senderId !== userId);

    const partnerId =
      thread.initiatorId === userId ? thread.receiverId : thread.initiatorId;
    const partnerAlias =
      thread.letters.find((l) => l.senderId !== userId)?.alias ?? null;

    return NextResponse.json({
      thread: {
        id: thread.id,
        status: thread.status,
        letterCount: thread.letterCount,
        archivedAt: thread.archivedAt,
        unlimited: thread.unlimited,
        partnerId,
        partnerAlias
      },
      myTurn,
      letters: thread.letters.map((l) => {
        const senderIsMe = l.senderId === userId;
        const inTransit = !!l.arrivesAt && l.arrivesAt > now;
        return {
          id: l.id,
          senderIsMe,
          alias: l.alias,
          // 내가 보낸 글은 항상 텍스트 보임. 받은 글은 도착해야 보임 (in-transit이면 숨김)
          text: senderIsMe ? l.text : inTransit ? null : l.text,
          createdAt: l.createdAt,
          arrivesAt: l.arrivesAt,
          inTransit
        };
      })
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
