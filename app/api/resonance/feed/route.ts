import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/utils";

const Query = z.object({ u: z.string() });

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { u: userId } = Query.parse(Object.fromEntries(url.searchParams));
    const date = todayKey();

    // 내 오늘 페르소나
    const myDaily = await prisma.dailyPersona.findUnique({
      where: { userId_date: { userId, date } }
    });

    // 내 오늘 메모
    const myNote = await prisma.resonanceNote.findUnique({
      where: { userId_date: { userId, date } },
      include: { _count: { select: { echoes: true } } }
    });

    // 같은 컨디션(mood)인 사람들의 노트 — 또는 같은 worldType
    const where = myDaily
      ? {
          date,
          OR: [{ mood: myDaily.mood }, { worldType: myDaily.worldType }],
          userId: { not: userId }
        }
      : { date, userId: { not: userId } };

    const notes = await prisma.resonanceNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { _count: { select: { echoes: true } } }
    });

    // 내가 공명한 노트 id
    const myEchoes = await prisma.resonanceEcho.findMany({
      where: { userId, note: { date } },
      select: { noteId: true }
    });
    const echoedSet = new Set(myEchoes.map((e) => e.noteId));

    // 오늘 내가 공명을 이미 썼는지 (하루 1회)
    const myEchoCount = myEchoes.length;

    return NextResponse.json({
      date,
      todayMood: myDaily?.mood ?? null,
      todayWorld: myDaily?.worldType ?? null,
      myNote: myNote
        ? {
            id: myNote.id,
            text: myNote.text,
            alias: myNote.alias,
            worldType: myNote.worldType,
            mood: myNote.mood,
            echoCount: myNote._count.echoes,
            createdAt: myNote.createdAt
          }
        : null,
      canEcho: myEchoCount < 1,
      myEchoCount,
      notes: notes.map((n) => ({
        id: n.id,
        text: n.text,
        alias: n.alias,
        worldType: n.worldType,
        mood: n.mood,
        echoCount: n._count.echoes,
        echoed: echoedSet.has(n.id),
        createdAt: n.createdAt
      }))
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
