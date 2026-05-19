import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { weekKey } from "@/lib/dialogue";
import { todayKey } from "@/lib/utils";
import { generateAlias } from "@/lib/alias";

const Body = z.object({
  userId: z.string(),
  text: z.string().min(2).max(200)
});

export async function POST(req: NextRequest) {
  try {
    const { userId, text } = Body.parse(await req.json());

    const mod = moderate(text, { maxLen: 200 });
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });

    const wk = weekKey();
    const existing = await prisma.postbox.findUnique({
      where: { authorId_weekKey: { authorId: userId, weekKey: wk } }
    });
    if (existing) {
      return NextResponse.json(
        { error: "이번 주에는 이미 한 줄을 띄웠어요.", postboxId: existing.id },
        { status: 409 }
      );
    }

    const alias = generateAlias(userId, todayKey(), "postbox");
    try {
      const p = await prisma.postbox.create({
        data: { authorId: userId, weekKey: wk, text: mod.text, alias }
      });
      return NextResponse.json({ postboxId: p.id });
    } catch (err: unknown) {
      const code = err instanceof Object && "code" in err ? (err as { code?: string }).code : undefined;
      if (code === "P2002") {
        return NextResponse.json(
          { error: "이번 주에는 이미 한 줄을 띄웠어요." },
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
