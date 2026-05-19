import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { moderate } from "@/lib/moderation";

const Body = z.object({
  userId: z.string(),
  meetingId: z.string(),
  line: z.string().min(1).max(200)
});

export async function POST(req: NextRequest) {
  try {
    const { userId, meetingId, line } = Body.parse(await req.json());
    const m = await prisma.coincidenceMeeting.findUnique({ where: { id: meetingId } });
    if (!m) return NextResponse.json({ error: "미팅을 찾을 수 없어요." }, { status: 404 });

    const iAmAlice = m.aliceId === userId;
    const iAmBob = m.bobId === userId;
    if (!iAmAlice && !iAmBob) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const myExisting = iAmAlice ? m.aliceLine : m.bobLine;
    if (myExisting) {
      return NextResponse.json({ error: "이미 한 줄을 흘려보냈어요." }, { status: 409 });
    }

    const mod = moderate(line, { maxLen: 200 });
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });

    const now = new Date();
    const otherLine = iAmAlice ? m.bobLine : m.aliceLine;
    const sealed = !!otherLine; // 양쪽 모두 글을 남겼으면 sealed

    await prisma.coincidenceMeeting.update({
      where: { id: meetingId },
      data: iAmAlice
        ? { aliceLine: mod.text, aliceAt: now, sealedAt: sealed ? now : null }
        : { bobLine: mod.text, bobAt: now, sealedAt: sealed ? now : null }
    });

    return NextResponse.json({ ok: true, sealed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
