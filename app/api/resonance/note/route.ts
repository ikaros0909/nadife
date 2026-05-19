import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/utils";
import { generateAlias } from "@/lib/alias";
import { moderate } from "@/lib/moderation";

const Body = z.object({
  userId: z.string(),
  text: z.string().min(1).max(160)
});

export async function POST(req: NextRequest) {
  try {
    const { userId, text } = Body.parse(await req.json());
    const date = todayKey();

    // 오늘 페르소나가 있어야 mood/worldType이 잡힘
    const daily = await prisma.dailyPersona.findUnique({
      where: { userId_date: { userId, date } }
    });
    if (!daily) {
      return NextResponse.json(
        { error: "먼저 오늘의 페르소나를 정해주세요." },
        { status: 400 }
      );
    }

    const existing = await prisma.resonanceNote.findUnique({
      where: { userId_date: { userId, date } }
    });
    if (existing) {
      return NextResponse.json(
        { error: "오늘은 이미 한 줄을 흘려보냈어요." },
        { status: 409 }
      );
    }

    const mod = moderate(text, { maxLen: 140 });
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });

    const alias = generateAlias(userId, date, "resonance");
    try {
      const note = await prisma.resonanceNote.create({
        data: {
          userId,
          date,
          mood: daily.mood,
          worldType: daily.worldType,
          text: mod.text,
          alias
        }
      });
      return NextResponse.json({
        note: {
          id: note.id,
          text: note.text,
          alias: note.alias,
          worldType: note.worldType,
          mood: note.mood,
          echoCount: 0
        }
      });
    } catch (err: unknown) {
      // race: 동시 요청이 먼저 한 줄을 적었음 — friendly 409
      const code =
        err instanceof Object && "code" in err ? (err as { code?: string }).code : undefined;
      if (code === "P2002") {
        return NextResponse.json(
          { error: "오늘은 이미 한 줄을 흘려보냈어요." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
