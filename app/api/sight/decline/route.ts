import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  userId: z.string(),
  useId: z.string().optional() // 미지정 시 나를 향한 모든 PENDING을 거절
});

export async function POST(req: NextRequest) {
  try {
    const { userId, useId } = Body.parse(await req.json());

    const where = useId
      ? { id: useId, targetId: userId, status: "PENDING" as const }
      : { targetId: userId, status: "PENDING" as const };

    const r = await prisma.sightUse.updateMany({
      where,
      data: { status: "FAILED", resolvedAt: new Date() }
    });

    return NextResponse.json({ declined: r.count });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
