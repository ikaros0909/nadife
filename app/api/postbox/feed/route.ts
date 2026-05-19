import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { weekKey } from "@/lib/dialogue";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    if (!userId) return NextResponse.json({ error: "u required" }, { status: 400 });

    const wk = weekKey();

    const [drops, myDrop, myStarred, myRepliesCount] = await Promise.all([
      prisma.postbox.findMany({
        where: {
          weekKey: wk,
          authorId: { not: userId }
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          _count: { select: { replies: true } },
          replies: {
            where: { replierId: userId },
            select: { id: true }
          }
        }
      }),
      prisma.postbox.findUnique({
        where: { authorId_weekKey: { authorId: userId, weekKey: wk } },
        include: {
          replies: { orderBy: { createdAt: "desc" } }
        }
      }),
      prisma.postboxReply.findFirst({
        where: { replierId: userId, postbox: { starredReplyId: { not: null } } },
        include: { postbox: { select: { starredReplyId: true } } }
      }),
      prisma.postboxReply.count({ where: { replierId: userId } })
    ]);

    return NextResponse.json({
      weekKey: wk,
      drops: drops.map((d) => ({
        id: d.id,
        authorId: d.authorId,
        alias: d.alias,
        text: d.text,
        replyCount: d._count.replies,
        iReplied: d.replies.length > 0,
        createdAt: d.createdAt
      })),
      myDrop: myDrop
        ? {
            id: myDrop.id,
            text: myDrop.text,
            alias: myDrop.alias,
            starredReplyId: myDrop.starredReplyId,
            replies: myDrop.replies.map((r) => ({
              id: r.id,
              replierId: r.replierId,
              alias: r.alias,
              text: r.text,
              createdAt: r.createdAt,
              isStarred: r.id === myDrop.starredReplyId
            }))
          }
        : null,
      // 내가 별표받은 적 있나? (이번 주 어딘가의 노트에서)
      iWasStarred:
        !!myStarred && myStarred.id === myStarred.postbox.starredReplyId,
      myRepliesCount
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
