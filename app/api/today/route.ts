import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { analyzeToday } from "@/lib/openai";
import { todayKey } from "@/lib/utils";
import { setUidCookie } from "@/lib/session";

const Body = z.object({
  userId: z.string(),
  mood: z.string().min(1).max(40)
});

export async function POST(req: NextRequest) {
  try {
    const { userId, mood } = Body.parse(await req.json());
    const date = todayKey();

    const existing = await prisma.dailyPersona.findUnique({
      where: { userId_date: { userId, date } }
    });
    if (existing)
      return setUidCookie(
        NextResponse.json({ daily: existing, alreadyToday: true }),
        userId
      );

    const main = await prisma.persona.findFirst({
      where: { userId, kind: "MAIN" }
    });

    const ai = await analyzeToday(mood, main?.worldType);

    const daily = await prisma.dailyPersona.create({
      data: {
        userId,
        date,
        mood,
        worldType: ai.worldSlug,
        title: ai.title,
        oneLiner: ai.oneLiner
      }
    });

    // 하루의 첫 디지털 관상이면 천리안 1개 지급. unique(userId,date)로 2회차 이상은 무시.
    let sightGranted = false;
    try {
      await prisma.sightGrant.create({ data: { userId, date } });
      await prisma.user.update({
        where: { id: userId },
        data: { sightBalance: { increment: 1 } }
      });
      sightGranted = true;
    } catch {
      // 이미 오늘 발급됨 — 무시
    }

    return setUidCookie(NextResponse.json({ daily, sightGranted }), userId);
  } catch (err: unknown) {
    console.error("[today]", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
