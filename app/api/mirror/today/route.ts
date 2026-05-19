import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/utils";
import { generateAlias } from "@/lib/alias";
import { getWorldType, worldDistance } from "@/lib/world-map";

const Query = z.object({ u: z.string() });

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { u: userId } = Query.parse(Object.fromEntries(url.searchParams));
    const date = todayKey();

    // 오늘 이미 거울이 있다면 그대로
    const existing = await prisma.mirrorEncounter.findUnique({
      where: { userId_date: { userId, date } }
    });

    let otherUserId: string;
    let mirrorId: string;
    let signal: string | null = null;
    let signalAt: Date | null = null;

    if (existing) {
      otherUserId = existing.otherUserId;
      mirrorId = existing.id;
      signal = existing.signal;
      signalAt = existing.signalAt;
    } else {
      // 내 메인캐 좌표
      const mine = await prisma.persona.findFirst({
        where: { userId, kind: "MAIN" },
        orderBy: { createdAt: "desc" }
      });
      if (!mine) {
        return NextResponse.json(
          { error: "먼저 페르소나 분석이 필요해요." },
          { status: 400 }
        );
      }
      const myWorld = getWorldType(mine.worldType);

      // 후보군: 본인 제외 + 메인캐 보유자
      const candidates = await prisma.user.findMany({
        where: {
          id: { not: userId },
          personas: { some: { kind: "MAIN" } }
        },
        include: {
          personas: { where: { kind: "MAIN" }, orderBy: { createdAt: "desc" }, take: 1 }
        },
        take: 200
      });
      if (candidates.length === 0) {
        return NextResponse.json({ empty: true });
      }

      // 가장 먼 거리 우선 + 약간의 무작위성
      const ranked = candidates
        .map((c) => {
          const p = c.personas[0];
          const w = getWorldType(p.worldType);
          return { user: c, persona: p, world: w, d: worldDistance(myWorld, w) };
        })
        .sort((a, b) => b.d - a.d);

      // 상위 30%에서 랜덤 선택 (decisive contrast + 약간의 즐거움)
      const pool = ranked.slice(0, Math.max(1, Math.ceil(ranked.length * 0.3)));
      const pick = pool[Math.floor(Math.random() * pool.length)];

      otherUserId = pick.user.id;

      // race-safe: 동시 요청이 먼저 만들었다면 그것을 사용
      try {
        const created = await prisma.mirrorEncounter.create({
          data: { userId, otherUserId, date }
        });
        mirrorId = created.id;
      } catch (err: unknown) {
        const code =
          err instanceof Object && "code" in err ? (err as { code?: string }).code : undefined;
        if (code !== "P2002") throw err; // unique 위반이 아니면 다시 던짐
        const reFound = await prisma.mirrorEncounter.findUnique({
          where: { userId_date: { userId, date } }
        });
        if (!reFound) throw err;
        otherUserId = reFound.otherUserId;
        mirrorId = reFound.id;
        signal = reFound.signal;
        signalAt = reFound.signalAt;
      }
    }

    // 상대 정보 — 익명으로
    const other = await prisma.user.findUnique({
      where: { id: otherUserId },
      include: {
        personas: { where: { kind: "MAIN" }, orderBy: { createdAt: "desc" }, take: 1 },
        daily: { where: { date }, take: 1 }
      }
    });
    if (!other || other.personas.length === 0) {
      return NextResponse.json({ empty: true });
    }
    const otherMain = other.personas[0];
    const otherDaily = other.daily[0] ?? null;
    const otherAlias = generateAlias(other.id, date, "mirror");

    // 상대가 나에게 보낸 신호가 있나? (오늘자 그 사람의 거울에서)
    const reverse = await prisma.mirrorEncounter.findFirst({
      where: { userId: otherUserId, otherUserId: userId, date, signal: { not: null } }
    });

    return NextResponse.json({
      mirrorId,
      date,
      other: {
        id: other.id,
        alias: otherAlias,
        worldType: otherMain.worldType,
        title: otherMain.title,
        oneLiner: otherMain.oneLiner,
        narrative: otherMain.narrative,
        rhythm: otherMain.rhythm,
        speed: otherMain.speed,
        emotion: otherMain.emotion,
        recovery: otherMain.recovery,
        energy: otherMain.energy,
        todayMood: otherDaily?.mood ?? null,
        todayTitle: otherDaily?.title ?? null
      },
      mySignal: signal,
      mySignalAt: signalAt,
      reciprocated: !!reverse,
      reciprocatedSignal: reverse?.signal ?? null
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
