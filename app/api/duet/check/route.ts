import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    const partnerId = url.searchParams.get("t");
    if (!userId || !partnerId) {
      return NextResponse.json({ error: "u, t required" }, { status: 400 });
    }

    // 양방향 SUCCESS 천리안이 있어야 자격
    const [my, their] = await Promise.all([
      prisma.sightUse.findFirst({
        where: { viewerId: userId, targetId: partnerId, status: "SUCCESS" }
      }),
      prisma.sightUse.findFirst({
        where: { viewerId: partnerId, targetId: userId, status: "SUCCESS" }
      })
    ]);

    const eligible = !!my && !!their;

    // 이미 책이 있나? (방향 무관)
    const [a, b] = [userId, partnerId].sort();
    const book = await prisma.duetBook.findFirst({
      where: {
        OR: [
          { authorAId: a, authorBId: b },
          { authorAId: b, authorBId: a }
        ]
      }
    });

    return NextResponse.json({
      eligible,
      mineDone: !!my,
      theirsDone: !!their,
      bookId: book?.id ?? null,
      bookStatus: book?.status ?? null
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
