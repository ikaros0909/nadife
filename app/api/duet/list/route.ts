import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    if (!userId) return NextResponse.json({ error: "u required" }, { status: 400 });

    const books = await prisma.duetBook.findMany({
      where: { OR: [{ authorAId: userId }, { authorBId: userId }] },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 30,
      include: {
        _count: { select: { lines: true } }
      }
    });

    return NextResponse.json({
      books: books.map((b) => ({
        id: b.id,
        status: b.status,
        themes: b.themes,
        progress: b._count.lines,
        total: b.themes.length * 2,
        createdAt: b.createdAt,
        completedAt: b.completedAt
      }))
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
