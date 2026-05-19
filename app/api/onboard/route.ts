import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { analyzePersona } from "@/lib/openai";
import { getWorldType } from "@/lib/world-map";
import { setUidCookie } from "@/lib/session";

const Body = z.object({
  email: z.string().email(),
  nickname: z.string().max(40).optional().nullable(),
  birthYear: z.number().int().min(1940).max(2020).optional().nullable(),
  interests: z.array(z.string()).max(20).default([]),
  platforms: z.array(z.string()).max(20).default([]),
  activeHours: z.string().max(20).optional().nullable(),
  vibe: z.string().max(200).optional().nullable()
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const data = Body.parse(json);

    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        nickname: data.nickname ?? undefined,
        birthYear: data.birthYear ?? undefined,
        interests: data.interests,
        platforms: data.platforms,
        activeHours: data.activeHours ?? undefined,
        vibe: data.vibe ?? undefined
      },
      create: {
        email: data.email,
        nickname: data.nickname ?? undefined,
        birthYear: data.birthYear ?? undefined,
        interests: data.interests,
        platforms: data.platforms,
        activeHours: data.activeHours ?? undefined,
        vibe: data.vibe ?? undefined
      }
    });

    const ai = await analyzePersona(
      {
        email: data.email,
        nickname: data.nickname ?? null,
        birthYear: data.birthYear ?? null,
        interests: data.interests,
        platforms: data.platforms,
        activeHours: data.activeHours ?? null,
        vibe: data.vibe ?? null
      },
      "MAIN"
    );

    const world = getWorldType(ai.worldSlug);

    const persona = await prisma.persona.create({
      data: {
        userId: user.id,
        kind: "MAIN",
        worldType: ai.worldSlug,
        title: ai.title || world.title,
        oneLiner: ai.oneLiner,
        rhythm: ai.rhythm,
        speed: ai.speed,
        emotion: ai.emotion,
        recovery: ai.recovery,
        energy: ai.energy,
        narrative: ai.narrative,
        axisX: world.axisX,
        axisY: world.axisY,
        revealed: true,
        revealAt: new Date()
      }
    });

    return setUidCookie(
      NextResponse.json({ userId: user.id, personaId: persona.id }),
      user.id
    );
  } catch (err: unknown) {
    console.error("[onboard]", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
