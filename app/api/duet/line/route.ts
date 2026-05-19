import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { generateAlias } from "@/lib/alias";
import { todayKey } from "@/lib/utils";

const Body = z.object({
  userId: z.string(),
  bookId: z.string(),
  themeIdx: z.number().int().min(0).max(4),
  text: z.string().min(1).max(200)
});

export async function POST(req: NextRequest) {
  try {
    const { userId, bookId, themeIdx, text } = Body.parse(await req.json());
    const book = await prisma.duetBook.findUnique({
      where: { id: bookId },
      include: { lines: true }
    });
    if (!book) return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
    if (book.status === "COMPLETE")
      return NextResponse.json({ error: "이미 완성된 책이에요." }, { status: 410 });
    if (book.authorAId !== userId && book.authorBId !== userId)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const existing = book.lines.find((l) => l.themeIdx === themeIdx && l.authorId === userId);
    if (existing) {
      return NextResponse.json(
        { error: "이 시제에는 이미 한 줄을 적었어요." },
        { status: 409 }
      );
    }

    const mod = moderate(text, { maxLen: 200 });
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });

    const date = todayKey();
    const alias = generateAlias(userId, date, "duet");

    await prisma.duetLine.create({
      data: { bookId, authorId: userId, themeIdx, text: mod.text, alias }
    });

    // 모든 시제(5) × 2명 = 10줄이 다 모이면 완성
    const totalLines = book.lines.length + 1;
    if (totalLines >= book.themes.length * 2) {
      await prisma.duetBook.update({
        where: { id: bookId },
        data: { status: "COMPLETE", completedAt: new Date() }
      });
    }

    return NextResponse.json({ ok: true, completed: totalLines >= book.themes.length * 2 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
