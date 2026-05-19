import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    if (!userId) return NextResponse.json({ error: "u required" }, { status: 400 });

    const book = await prisma.duetBook.findUnique({
      where: { id },
      include: { lines: { orderBy: { createdAt: "asc" } } }
    });
    if (!book) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (book.authorAId !== userId && book.authorBId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const partnerId = book.authorAId === userId ? book.authorBId : book.authorAId;
    const lines = book.lines.map((l) => ({
      id: l.id,
      themeIdx: l.themeIdx,
      isMine: l.authorId === userId,
      alias: l.alias,
      text: l.text,
      createdAt: l.createdAt
    }));

    return NextResponse.json({
      book: {
        id: book.id,
        status: book.status,
        themes: book.themes,
        completedAt: book.completedAt
      },
      partnerId,
      lines
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
