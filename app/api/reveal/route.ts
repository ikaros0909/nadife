import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { analyzePersona } from "@/lib/openai";
import { getWorldType } from "@/lib/world-map";

const Body = z.object({ userId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const { userId } = Body.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { personas: true }
    });
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

    const main = user.personas.find((p) => p.kind === "MAIN");
    if (!main) return NextResponse.json({ error: "no main persona" }, { status: 400 });

    const existingSub = user.personas.find((p) => p.kind === "SUB");
    if (existingSub) {
      return NextResponse.json({ personaId: existingSub.id, alreadyRevealed: true });
    }

    const ai = await analyzePersona(
      {
        email: user.email,
        nickname: user.nickname,
        birthYear: user.birthYear,
        interests: user.interests,
        platforms: user.platforms,
        activeHours: user.activeHours,
        vibe: user.vibe
      },
      "SUB",
      { avoidSlug: main.worldType }
    );

    const world = getWorldType(ai.worldSlug);

    // race-safe: AI 분석 동안 다른 요청이 SUB을 만들었을 수도 있음.
    // 트랜잭션 안에서 재확인 후 생성.
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.persona.findFirst({
        where: { userId: user.id, kind: "SUB" }
      });
      if (fresh) return { persona: fresh, alreadyRevealed: true };
      const created = await tx.persona.create({
        data: {
          userId: user.id,
          kind: "SUB",
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
      return { persona: created, alreadyRevealed: false };
    });

    return NextResponse.json({
      personaId: result.persona.id,
      alreadyRevealed: result.alreadyRevealed
    });
  } catch (err: unknown) {
    console.error("[reveal]", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
