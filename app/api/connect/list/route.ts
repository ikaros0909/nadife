import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAlias } from "@/lib/alias";
import { todayKey } from "@/lib/utils";
import { getWorldType } from "@/lib/world-map";
import {
  AFFINITY_THRESHOLD,
  AFFINITY_VISIBLE_FROM,
  REQUIRED_INTERACTION_TYPES,
  canonicalPair,
  computeAffinity,
  listCandidatePartnerIds
} from "@/lib/affinity";

const STAGE_LABEL = {
  blocked: "차단됨",
  connected: "연결됨",
  proposed_to_me: "연결 제안 받음",
  proposed_by_me: "연결 제안 보냄",
  declined: "거절됨",
  disconnected: "연결 해제됨",
  ready: "충분히 깊어졌어요",
  deepening: "깊어지는 중",
  faint: "엷어진"
} as const;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    if (!userId) return NextResponse.json({ error: "u required" }, { status: 400 });

    const partnerIds = await listCandidatePartnerIds(userId);

    // 모든 상대의 affinity를 한 번에 계산 (병렬)
    const affinities = await Promise.all(
      partnerIds.map(async (pid) => ({ pid, aff: await computeAffinity(userId, pid) }))
    );

    // 연결 상태 일괄 조회
    const pairs = partnerIds.map((pid) => canonicalPair(userId, pid));
    const conns = await prisma.connection.findMany({
      where: {
        OR: pairs.map(([a, b]) => ({ userAId: a, userBId: b }))
      }
    });
    const connMap = new Map<string, (typeof conns)[number]>();
    for (const c of conns) connMap.set(`${c.userAId}:${c.userBId}`, c);

    // 상대 페르소나 일괄 조회
    const partners = await prisma.user.findMany({
      where: { id: { in: partnerIds } },
      include: {
        personas: { where: { kind: "MAIN" }, orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    const partnerMap = new Map(partners.map((p) => [p.id, p]));

    const date = todayKey();

    type Item = {
      partnerId: string;
      alias: string;
      worldType: string | null;
      worldTitle: string | null;
      hue: string | null;
      isHuman: boolean;
      stage: keyof typeof STAGE_LABEL;
      stageLabel: string;
      summary: string[];
      typesCount: number;
      lastAt: string | null;
      score: number; // 내부용. UI에는 직접 노출 X
    };

    const items: Item[] = [];
    for (const { pid, aff } of affinities) {
      if (aff.score < AFFINITY_VISIBLE_FROM) continue;

      const partner = partnerMap.get(pid);
      if (!partner) continue;
      const persona = partner.personas[0];
      const world = persona ? getWorldType(persona.worldType) : null;

      const [a, b] = canonicalPair(userId, pid);
      const conn = connMap.get(`${a}:${b}`);

      let stage: Item["stage"];
      if (conn?.status === "BLOCKED") stage = "blocked";
      else if (conn?.status === "CONNECTED") stage = "connected";
      else if (conn?.status === "DECLINED") stage = "declined";
      else if (conn?.status === "DISCONNECTED") stage = "disconnected";
      else if (conn?.status === "PROPOSED_A" || conn?.status === "PROPOSED_B") {
        stage = conn.proposerId === userId ? "proposed_by_me" : "proposed_to_me";
      } else if (
        aff.score >= AFFINITY_THRESHOLD &&
        aff.types.length >= REQUIRED_INTERACTION_TYPES
      ) {
        stage = "ready";
      } else {
        stage = "deepening";
      }

      // 요약 라벨 — UI에 보일 인연의 결
      const summary: string[] = [];
      if (aff.detail.letterCount > 0) summary.push(`편지 ${aff.detail.letterCount}통`);
      if (aff.detail.sightAtoB && aff.detail.sightBtoA) summary.push("천리안 양방향");
      else if (aff.detail.sightAtoB) summary.push("천리안 (내→그)");
      else if (aff.detail.sightBtoA) summary.push("천리안 (그→내)");
      if (aff.detail.duetLines > 0) summary.push(aff.detail.duetComplete ? "듀엣 완성" : `듀엣 ${aff.detail.duetLines}줄`);
      if (aff.detail.mirrorReciprocated > 0) summary.push(`미러 양방향 ${aff.detail.mirrorReciprocated}회`);
      if (aff.detail.echoesFromMeToThem + aff.detail.echoesFromThemToMe > 0) {
        summary.push(`공명 ${aff.detail.echoesFromMeToThem + aff.detail.echoesFromThemToMe}회`);
      }
      if (aff.detail.postboxStarsMine > 0) summary.push("공중 별표 받음");
      if (aff.detail.postboxStarsTheirs > 0) summary.push("공중 별표 보냄");
      if (aff.detail.coincidenceSealed > 0) summary.push(`우연 ${aff.detail.coincidenceSealed}회`);

      items.push({
        partnerId: pid,
        alias: generateAlias(pid, date, "connect"),
        worldType: world?.slug ?? null,
        worldTitle: world?.title ?? null,
        hue: world?.hue ?? null,
        isHuman: !partner.isAI,
        stage,
        stageLabel: STAGE_LABEL[stage],
        summary,
        typesCount: aff.types.length,
        lastAt: aff.lastAt?.toISOString() ?? null,
        score: aff.score
      });
    }

    // 정렬 — 제안 받음 → 충분히 깊어짐 → 깊어지는 중 → ... 그리고 점수 내림차순
    const stageOrder: Record<string, number> = {
      proposed_to_me: 0,
      ready: 1,
      proposed_by_me: 2,
      connected: 3,
      deepening: 4,
      disconnected: 5,
      declined: 6,
      blocked: 7,
      faint: 8
    };
    items.sort((a, b) => {
      const so = stageOrder[a.stage] - stageOrder[b.stage];
      if (so !== 0) return so;
      return b.score - a.score;
    });

    return NextResponse.json({
      items: items.map((it) => ({
        partnerId: it.partnerId,
        alias: it.alias,
        worldType: it.worldType,
        worldTitle: it.worldTitle,
        hue: it.hue,
        isHuman: it.isHuman,
        stage: it.stage,
        stageLabel: it.stageLabel,
        summary: it.summary,
        typesCount: it.typesCount,
        lastAt: it.lastAt
      })),
      threshold: AFFINITY_THRESHOLD,
      requiredTypes: REQUIRED_INTERACTION_TYPES
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
