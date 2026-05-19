import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { moderate } from "@/lib/moderation";

const Body = z.object({
  userId: z.string(),
  campfireId: z.string(),
  text: z.string().min(1).max(160)
});

const MAX_PER_DAY = 5;

export async function POST(req: NextRequest) {
  try {
    const { userId, campfireId, text } = Body.parse(await req.json());

    // 모닥불에 있는지 확인
    const presence = await prisma.campfirePresence.findUnique({
      where: { campfireId_userId: { campfireId, userId } }
    });
    if (!presence) {
      return NextResponse.json({ error: "이 모닥불에 들어와 있지 않아요." }, { status: 403 });
    }

    // 하루 5개 제한
    const todayCount = await prisma.campfireWhisper.count({
      where: { campfireId, userId }
    });
    if (todayCount >= MAX_PER_DAY) {
      return NextResponse.json(
        { error: `하루에 ${MAX_PER_DAY}개까지만 속삭일 수 있어요.` },
        { status: 429 }
      );
    }

    const mod = moderate(text, { maxLen: 140 });
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });

    const whisper = await prisma.campfireWhisper.create({
      data: {
        campfireId,
        userId,
        alias: presence.alias,
        text: mod.text
      }
    });

    return NextResponse.json({
      whisper: {
        id: whisper.id,
        userId: whisper.userId,
        alias: whisper.alias,
        text: whisper.text,
        isMe: true,
        createdAt: whisper.createdAt
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
