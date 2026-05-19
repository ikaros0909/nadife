import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildReveal, decideInitialStatus } from "@/lib/sight";

const SOURCES = ["mirror", "campfire", "postbox", "resonance", "letter", "coincidence"] as const;

const Body = z.object({
  viewerId: z.string(),
  targetId: z.string(),
  source: z.enum(SOURCES).optional()
});

export async function POST(req: NextRequest) {
  try {
    const { viewerId, targetId, source } = Body.parse(await req.json());
    if (viewerId === targetId) {
      return NextResponse.json(
        { error: "자기 자신에게는 천리안을 쓸 수 없어요." },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ error: "대상이 존재하지 않아요." }, { status: 404 });
    }

    // 이미 같은 대상으로 사용한 SightUse가 있고 SUCCESS면 — 토큰 안 쓰고 그대로 reveal
    const previous = await prisma.sightUse.findFirst({
      where: { viewerId, targetId },
      orderBy: { createdAt: "desc" }
    });
    if (previous && previous.status === "SUCCESS") {
      const reveal = await buildReveal(viewerId, targetId, previous.id, "SUCCESS");
      return NextResponse.json({ ...reveal, reused: true });
    }
    // PENDING 상태가 살아있다면 그것도 재사용 (토큰은 이미 소비됨)
    if (previous && previous.status === "PENDING") {
      const reveal = await buildReveal(viewerId, targetId, previous.id, "PENDING");
      return NextResponse.json({ ...reveal, reused: true });
    }

    // 잔량 확인 + 차감 (원자적)
    const viewer = await prisma.user.findUnique({ where: { id: viewerId } });
    if (!viewer) return NextResponse.json({ error: "viewer not found" }, { status: 404 });
    if (viewer.sightBalance < 1) {
      return NextResponse.json(
        { error: "천리안이 없어요. 오늘의 디지털 관상을 먼저 만들어주세요." },
        { status: 402 }
      );
    }

    // 차감
    const decrement = await prisma.user.updateMany({
      where: { id: viewerId, sightBalance: { gte: 1 } },
      data: { sightBalance: { decrement: 1 } }
    });
    if (decrement.count === 0) {
      return NextResponse.json({ error: "천리안이 없어요." }, { status: 402 });
    }

    const status = decideInitialStatus({
      isAI: target.isAI,
      gender: target.gender,
      country: target.country,
      occupation: target.occupation,
      region: target.region,
      birthYear: target.birthYear
    });

    const use = await prisma.sightUse.create({
      data: {
        viewerId,
        targetId,
        status,
        source: source ?? null,
        resolvedAt: status === "PENDING" ? null : new Date()
      }
    });

    const reveal = await buildReveal(viewerId, targetId, use.id, status);
    return NextResponse.json(reveal);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
