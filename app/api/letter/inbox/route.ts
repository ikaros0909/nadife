import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    if (!userId) return NextResponse.json({ error: "u required" }, { status: 400 });

    const threads = await prisma.letterThread.findMany({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }]
      },
      orderBy: [{ status: "asc" }, { lastLetterAt: "desc" }],
      take: 50,
      include: {
        letters: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            senderId: true,
            text: true,
            alias: true,
            createdAt: true,
            readAt: true,
            isAI: true
          }
        }
      }
    });

    const items = threads.map((t) => {
      const last = t.letters[0];
      const waitingForMe = !!last && last.senderId !== userId;
      return {
        id: t.id,
        status: t.status,
        letterCount: t.letterCount,
        lastLetterAt: t.lastLetterAt,
        archivedAt: t.archivedAt,
        partnerAlias: last?.alias && last.senderId !== userId ? last.alias : null,
        last: last
          ? {
              text: last.text.slice(0, 60),
              alias: last.alias,
              senderIsMe: last.senderId === userId,
              createdAt: last.createdAt,
              unread: waitingForMe && !last.readAt
            }
          : null,
        waitingForMe
      };
    });

    const unreadCount = items.filter((i) => i.last?.unread).length;

    return NextResponse.json({ threads: items, unreadCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
