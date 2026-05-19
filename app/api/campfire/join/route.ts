import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/utils";
import { generateAlias } from "@/lib/alias";
import { maybeSeedTodayInBackground } from "@/lib/seed-runner";

const Body = z.object({
  userId: z.string(),
  worldType: z.string().optional() // 미지정 시 자동 (오늘 페르소나 → 메인캐 순)
});

export async function POST(req: NextRequest) {
  try {
    const { userId, worldType: requested } = Body.parse(await req.json());
    const date = todayKey();
    maybeSeedTodayInBackground();

    // 사용할 worldType 결정 — 오늘 페르소나 우선, 없으면 메인캐
    let worldType = requested;
    if (!worldType) {
      const daily = await prisma.dailyPersona.findUnique({
        where: { userId_date: { userId, date } }
      });
      if (daily) worldType = daily.worldType;
      else {
        const main = await prisma.persona.findFirst({
          where: { userId, kind: "MAIN" },
          orderBy: { createdAt: "desc" }
        });
        if (!main) {
          return NextResponse.json(
            { error: "먼저 페르소나 분석이 필요해요." },
            { status: 400 }
          );
        }
        worldType = main.worldType;
      }
    }

    // 오늘의 모닥불 — 없으면 생성
    const campfire = await prisma.campfire.upsert({
      where: { worldType_date: { worldType, date } },
      update: {},
      create: { worldType, date }
    });

    const alias = generateAlias(userId, date, worldType);

    // 입장 — 이미 있으면 그대로
    await prisma.campfirePresence.upsert({
      where: { campfireId_userId: { campfireId: campfire.id, userId } },
      update: {},
      create: { campfireId: campfire.id, userId, alias }
    });

    const [presences, whispers] = await Promise.all([
      prisma.campfirePresence.findMany({
        where: { campfireId: campfire.id },
        orderBy: { joinedAt: "asc" },
        select: { id: true, alias: true, joinedAt: true, userId: true }
      }),
      prisma.campfireWhisper.findMany({
        where: { campfireId: campfire.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, alias: true, text: true, createdAt: true, userId: true },
        take: 80
      })
    ]);

    return NextResponse.json({
      campfire: { id: campfire.id, worldType: campfire.worldType, date: campfire.date },
      me: { alias },
      presences: presences.map((p) => ({
        id: p.id,
        userId: p.userId,
        alias: p.alias,
        isMe: p.userId === userId,
        joinedAt: p.joinedAt
      })),
      whispers: whispers.map((w) => ({
        id: w.id,
        userId: w.userId,
        alias: w.alias,
        text: w.text,
        isMe: w.userId === userId,
        createdAt: w.createdAt
      }))
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
