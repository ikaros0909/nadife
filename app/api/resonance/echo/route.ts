import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/utils";

const Body = z.object({
  userId: z.string(),
  noteId: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const { userId, noteId } = Body.parse(await req.json());
    const date = todayKey();

    const note = await prisma.resonanceNote.findUnique({ where: { id: noteId } });
    if (!note) return NextResponse.json({ error: "글이 없어요." }, { status: 404 });
    if (note.userId === userId) {
      return NextResponse.json({ error: "내 글에는 공명할 수 없어요." }, { status: 400 });
    }

    // 하루 1회 제한 — 오늘자 노트에 대한 공명 카운트
    const todayCount = await prisma.resonanceEcho.count({
      where: { userId, note: { date } }
    });
    if (todayCount >= 1) {
      return NextResponse.json(
        { error: "오늘은 이미 한 번 공명했어요." },
        { status: 429 }
      );
    }

    await prisma.resonanceEcho.upsert({
      where: { noteId_userId: { noteId, userId } },
      update: {},
      create: { noteId, userId }
    });

    const newCount = await prisma.resonanceEcho.count({ where: { noteId } });
    return NextResponse.json({ noteId, echoCount: newCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
