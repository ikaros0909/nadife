import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAlias } from "@/lib/alias";
import { todayKey } from "@/lib/utils";
import { getWorldType } from "@/lib/world-map";
import {
  AFFINITY_THRESHOLD,
  REQUIRED_INTERACTION_TYPES,
  canonicalPair,
  checkEligibility,
  computeAffinity
} from "@/lib/affinity";
import { checkMutualMatch, distanceBucket, distanceKm } from "@/lib/match";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    const partnerId = url.searchParams.get("t");
    if (!userId || !partnerId) {
      return NextResponse.json({ error: "u, t required" }, { status: 400 });
    }
    if (userId === partnerId) {
      return NextResponse.json({ error: "자기 자신은 볼 수 없어요." }, { status: 400 });
    }

    const [partner, me, aff] = await Promise.all([
      prisma.user.findUnique({
        where: { id: partnerId },
        include: {
          personas: { where: { kind: "MAIN" }, orderBy: { createdAt: "desc" }, take: 1 }
        }
      }),
      prisma.user.findUnique({ where: { id: userId } }),
      computeAffinity(userId, partnerId)
    ]);
    if (!partner || !me) return NextResponse.json({ error: "상대가 없어요." }, { status: 404 });

    // 매칭 검증 — 양방향
    const mutual = checkMutualMatch(
      { gender: me.gender, country: me.country, region: me.region, birthYear: me.birthYear },
      {
        connectGenders: me.connectGenders,
        connectCountries: me.connectCountries,
        connectRegions: me.connectRegions,
        connectAgeMin: me.connectAgeMin,
        connectAgeMax: me.connectAgeMax
      },
      { gender: partner.gender, country: partner.country, region: partner.region, birthYear: partner.birthYear },
      {
        connectGenders: partner.connectGenders,
        connectCountries: partner.connectCountries,
        connectRegions: partner.connectRegions,
        connectAgeMin: partner.connectAgeMin,
        connectAgeMax: partner.connectAgeMax
      }
    );

    // 거리 — 양측 모두 opt-in이고 좌표가 있을 때만
    let distance: number | null = null;
    if (me.geoOptIn && partner.geoOptIn && me.geoLat != null && me.geoLng != null && partner.geoLat != null && partner.geoLng != null) {
      distance = distanceKm(me.geoLat, me.geoLng, partner.geoLat, partner.geoLng);
    }

    const [a, b] = canonicalPair(userId, partnerId);
    const conn = await prisma.connection.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } }
    });

    const eligibility = checkEligibility(aff, conn?.status ?? null, userId, partnerId);

    const persona = partner.personas[0];
    const world = persona ? getWorldType(persona.worldType) : null;
    const date = todayKey();

    // CONNECTED 이후에만 실명/이메일 공개. 그 전까지는 alias만.
    const partnerView = {
      partnerId: partner.id,
      alias: generateAlias(partner.id, date, "connect"),
      worldType: world?.slug ?? null,
      worldTitle: world?.title ?? null,
      hue: world?.hue ?? null,
      vibe: world?.vibe ?? null,
      oneLiner: persona?.oneLiner ?? null,
      isHuman: !partner.isAI,
      // CONNECTED일 때만 공개
      revealed:
        conn?.status === "CONNECTED"
          ? {
              nickname: partner.nickname,
              gender: partner.gender,
              country: partner.country,
              occupation: partner.occupation,
              region: partner.region
            }
          : null
    };

    return NextResponse.json({
      partner: partnerView,
      affinity: {
        // 점수 자체는 노출 X — 단계와 진행률만
        score: aff.score, // 내부적으로는 노출하지만 UI는 보이지 않게
        thresholdProgress: Math.min(1, aff.score / AFFINITY_THRESHOLD),
        types: aff.types,
        typesCount: aff.types.length,
        requiredTypes: REQUIRED_INTERACTION_TYPES,
        detail: aff.detail,
        timeline: aff.timeline.map((e) => ({
          at: e.at.toISOString(),
          source: e.source,
          description: e.description
        }))
      },
      connection: conn
        ? {
            status: conn.status,
            proposerId: conn.proposerId,
            proposedAt: conn.proposedAt?.toISOString() ?? null,
            acceptedAt: conn.acceptedAt?.toISOString() ?? null,
            declinedAt: conn.declinedAt?.toISOString() ?? null,
            disconnectedAt: conn.disconnectedAt?.toISOString() ?? null,
            blockedAt: conn.blockedAt?.toISOString() ?? null,
            iAmProposer: conn.proposerId === userId,
            iBlocked: conn.blockedById === userId,
            iDisconnected: conn.disconnectedById === userId
          }
        : null,
      eligibility: {
        eligible: eligibility.eligible,
        reason: "reason" in eligibility ? eligibility.reason : null,
        message: "message" in eligibility ? eligibility.message : null,
        cooldownUntil:
          "cooldownUntil" in eligibility ? eligibility.cooldownUntil?.toISOString() ?? null : null
      },
      match: {
        matched: mutual.matched,
        myPrefsOk: mutual.mineSide.ok,    // 내 조건이 그쪽을 받아들이는가
        theirPrefsOk: mutual.theirsSide.ok // 그쪽 조건이 나를 받아들이는가
      },
      distance: {
        bothOptIn: !!(me.geoOptIn && partner.geoOptIn),
        bucket: distance !== null ? distanceBucket(distance) : null,
        // 정확한 km은 5km 미만에서만 노출 — 그 외는 버킷만
        approxKm: distance !== null && distance < 5 ? Math.round(distance * 10) / 10 : null
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
