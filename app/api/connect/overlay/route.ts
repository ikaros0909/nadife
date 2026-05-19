import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canonicalPair } from "@/lib/affinity";
import { getWorldType } from "@/lib/world-map";
import type { JourneyPoint } from "@/lib/journey";

/**
 * 연결된 두 사람의 궤적을 같은 평면에 겹쳐 보여주기 위한 데이터.
 * CONNECTED 상태에서만 양쪽 데이터 모두 반환. 그 외엔 내 것만.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    const partnerId = url.searchParams.get("t");
    if (!userId || !partnerId) {
      return NextResponse.json({ error: "u, t required" }, { status: 400 });
    }

    const [a, b] = canonicalPair(userId, partnerId);
    const conn = await prisma.connection.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      select: { status: true }
    });
    const isConnected = conn?.status === "CONNECTED";

    const targets = isConnected ? [userId, partnerId] : [userId];
    const results: Record<string, JourneyPoint[]> = {};

    for (const uid of targets) {
      const [personas, daily] = await Promise.all([
        prisma.persona.findMany({ where: { userId: uid }, orderBy: { createdAt: "asc" } }),
        prisma.dailyPersona.findMany({ where: { userId: uid }, orderBy: { date: "asc" } })
      ]);
      const points: JourneyPoint[] = [
        ...personas.map((p) => ({
          id: p.id,
          source: p.kind as "MAIN" | "SUB",
          date: p.createdAt.toISOString(),
          worldSlug: p.worldType,
          title: p.title,
          oneLiner: p.oneLiner,
          axisX: p.axisX,
          axisY: p.axisY
        })),
        ...daily.map((d) => {
          const w = getWorldType(d.worldType);
          return {
            id: d.id,
            source: "DAILY" as const,
            date: d.date,
            worldSlug: d.worldType,
            title: d.title,
            oneLiner: d.oneLiner,
            axisX: w.axisX,
            axisY: w.axisY
          };
        })
      ].sort((a, b) => a.date.localeCompare(b.date));
      results[uid] = points;
    }

    return NextResponse.json({
      connected: isConnected,
      me: { points: results[userId] ?? [] },
      partner: { points: isConnected ? results[partnerId] ?? [] : [] }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
