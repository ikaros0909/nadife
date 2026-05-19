import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { pickDuetThemes } from "@/lib/dialogue";

const Body = z.object({
  userId: z.string(),
  partnerId: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const { userId, partnerId } = Body.parse(await req.json());
    if (userId === partnerId) {
      return NextResponse.json({ error: "혼자서는 듀엣이 안 돼요." }, { status: 400 });
    }

    // 양방향 SUCCESS 천리안 검증
    const [my, their] = await Promise.all([
      prisma.sightUse.findFirst({
        where: { viewerId: userId, targetId: partnerId, status: "SUCCESS" }
      }),
      prisma.sightUse.findFirst({
        where: { viewerId: partnerId, targetId: userId, status: "SUCCESS" }
      })
    ]);
    if (!my || !their) {
      return NextResponse.json(
        { error: "양쪽이 서로 천리안으로 바라본 적이 있어야 듀엣을 열 수 있어요." },
        { status: 403 }
      );
    }

    const [a, b] = [userId, partnerId].sort();

    // 이미 책이 있으면 그것을 반환
    const existing = await prisma.duetBook.findFirst({
      where: {
        OR: [
          { authorAId: a, authorBId: b },
          { authorAId: b, authorBId: a }
        ]
      }
    });
    if (existing) return NextResponse.json({ bookId: existing.id, already: true });

    const themes = pickDuetThemes(`${a}::${b}`);
    const book = await prisma.duetBook.create({
      data: {
        authorAId: a,
        authorBId: b,
        themes,
        status: "OPEN"
      }
    });
    return NextResponse.json({ bookId: book.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
