import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  userId: z.string(),
  mirrorId: z.string(),
  signal: z.enum(["curious", "echo", "song", "pass"])
});

export async function POST(req: NextRequest) {
  try {
    const { userId, mirrorId, signal } = Body.parse(await req.json());
    const mirror = await prisma.mirrorEncounter.findUnique({ where: { id: mirrorId } });
    if (!mirror || mirror.userId !== userId) {
      return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
    }
    if (mirror.signal) {
      return NextResponse.json({ error: "오늘은 이미 신호를 보냈어요." }, { status: 409 });
    }

    const updated = await prisma.mirrorEncounter.update({
      where: { id: mirrorId },
      data: { signal, signalAt: new Date() }
    });
    return NextResponse.json({ signal: updated.signal, signalAt: updated.signalAt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
