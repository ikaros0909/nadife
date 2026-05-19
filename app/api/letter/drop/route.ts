import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({ userId: z.string(), threadId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const { userId, threadId } = Body.parse(await req.json());
    const t = await prisma.letterThread.findUnique({ where: { id: threadId } });
    if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (t.initiatorId !== userId && t.receiverId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (t.status !== "ACTIVE") return NextResponse.json({ ok: true, already: true });

    await prisma.letterThread.update({
      where: { id: threadId },
      data: { status: "DROPPED", archivedAt: new Date() }
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
