import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { expireOldPendings } from "@/lib/sight";
import { todayKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    if (!userId) return NextResponse.json({ error: "u required" }, { status: 400 });

    // 만료 정리 — lazy
    await expireOldPendings();

    const [user, todayGrant, pendingIncoming, recentSights] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { sightBalance: true }
      }),
      prisma.sightGrant.findUnique({
        where: { userId_date: { userId, date: todayKey() } }
      }),
      prisma.sightUse.count({
        where: { targetId: userId, status: "PENDING" }
      }),
      prisma.sightUse.findMany({
        where: { viewerId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          target: {
            select: {
              id: true,
              isAI: true,
              personas: {
                where: { kind: "MAIN" },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { worldType: true, title: true }
              }
            }
          }
        }
      })
    ]);

    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

    return NextResponse.json({
      balance: user.sightBalance,
      todayGranted: !!todayGrant,
      pendingIncoming,
      recent: recentSights.map((s) => ({
        id: s.id,
        status: s.status,
        createdAt: s.createdAt,
        target: {
          id: s.target.id,
          worldType: s.target.personas[0]?.worldType ?? null,
          title: s.target.personas[0]?.title ?? null
        }
      }))
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
