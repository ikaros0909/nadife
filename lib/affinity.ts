// 인연 점수 — 두 사람 간의 누적 인터랙션을 합산해 "깊어짐 정도"를 산출.
//
// 핵심 원칙:
// - 점수는 사용자에게 직접 노출하지 않음 (게임화 부담 방지)
// - 다양성(interaction types ≥ 3)이 충족돼야 임계점 도달
// - 임계점 도달 후 24시간 쿨링 기간이 지나야 연결 제안 가능
// - 차단/거절/해제는 상대에게 비노출

import { prisma } from "./db";

export const AFFINITY_THRESHOLD = 60;
export const AFFINITY_VISIBLE_FROM = 15;          // 이 점수부터 /connect 목록에 노출
export const REQUIRED_INTERACTION_TYPES = 3;
export const COOLING_PERIOD_MS = 24 * 60 * 60 * 1000;

export type InteractionType =
  | "letter"
  | "sight"
  | "duet"
  | "mirror"
  | "resonance"
  | "postbox"
  | "coincidence";

export type AffinityBreakdown = {
  letter: number;
  sight: number;
  duet: number;
  mirror: number;
  resonance: number;
  postbox: number;
  coincidence: number;
};

export type AffinityResult = {
  score: number;
  breakdown: AffinityBreakdown;
  types: InteractionType[];
  firstAt: Date | null;
  lastAt: Date | null;
  // 각 영역 상세 카운터 — UI 표시용
  detail: {
    letterCount: number;
    letterArchived: boolean;
    sightAtoB: boolean;
    sightBtoA: boolean;
    duetLines: number;
    duetComplete: boolean;
    mirrorReciprocated: number;
    echoesFromMeToThem: number;
    echoesFromThemToMe: number;
    postboxRepliesToTheirs: number;
    postboxRepliesToMine: number;
    postboxStarsMine: number;   // 그쪽 글에 내 답신이 별표받음
    postboxStarsTheirs: number; // 내 글에 그쪽 답신이 별표받음
    coincidenceSealed: number;
  };
};

export type TimelineEvent = {
  at: Date;
  source: InteractionType;
  description: string;
};

/** A,B 순서를 canonical로 정렬 — Connection 테이블 키와 일치 */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** 두 사람 간 모든 인터랙션을 모아 점수와 타임라인을 산출 */
export async function computeAffinity(
  myId: string,
  otherId: string
): Promise<AffinityResult & { timeline: TimelineEvent[] }> {
  if (myId === otherId) {
    return emptyResult();
  }

  const [letters, sightAtoB, sightBtoA, duet, myEchoes, theirEchoes, myReplies, theirReplies, coincidences, myMirror, theirMirror] =
    await Promise.all([
      prisma.letterThread.findMany({
        where: {
          OR: [
            { initiatorId: myId, receiverId: otherId },
            { initiatorId: otherId, receiverId: myId }
          ]
        },
        include: {
          letters: { orderBy: { createdAt: "asc" }, select: { createdAt: true } }
        }
      }),
      prisma.sightUse.findFirst({
        where: { viewerId: myId, targetId: otherId, status: "SUCCESS" },
        orderBy: { createdAt: "asc" }
      }),
      prisma.sightUse.findFirst({
        where: { viewerId: otherId, targetId: myId, status: "SUCCESS" },
        orderBy: { createdAt: "asc" }
      }),
      prisma.duetBook.findFirst({
        where: {
          OR: [
            { authorAId: myId, authorBId: otherId },
            { authorAId: otherId, authorBId: myId }
          ]
        },
        include: { lines: { orderBy: { createdAt: "asc" } } }
      }),
      prisma.resonanceEcho.findMany({
        where: { userId: myId, note: { userId: otherId } },
        include: { note: { select: { date: true } } }
      }),
      prisma.resonanceEcho.findMany({
        where: { userId: otherId, note: { userId: myId } },
        include: { note: { select: { date: true } } }
      }),
      prisma.postboxReply.findMany({
        where: { replierId: myId, postbox: { authorId: otherId } },
        include: { postbox: { select: { starredReplyId: true, weekKey: true } } }
      }),
      prisma.postboxReply.findMany({
        where: { replierId: otherId, postbox: { authorId: myId } },
        include: { postbox: { select: { starredReplyId: true, weekKey: true } } }
      }),
      prisma.coincidenceMeeting.findMany({
        where: {
          OR: [
            { aliceId: myId, bobId: otherId },
            { aliceId: otherId, bobId: myId }
          ],
          sealedAt: { not: null }
        }
      }),
      prisma.mirrorEncounter.findMany({
        where: { userId: myId, otherUserId: otherId, signal: { not: null }, NOT: { signal: "pass" } }
      }),
      prisma.mirrorEncounter.findMany({
        where: { userId: otherId, otherUserId: myId, signal: { not: null }, NOT: { signal: "pass" } }
      })
    ]);

  const breakdown: AffinityBreakdown = {
    letter: 0,
    sight: 0,
    duet: 0,
    mirror: 0,
    resonance: 0,
    postbox: 0,
    coincidence: 0
  };

  const types = new Set<InteractionType>();
  const timeline: TimelineEvent[] = [];

  // ─── 편지 ───
  let letterCount = 0;
  let letterArchived = false;
  for (const t of letters) {
    letterCount += t.letterCount;
    if (t.letterCount > 0) types.add("letter");
    breakdown.letter += t.letterCount * 5;
    if (t.status === "ARCHIVED" && t.letterCount >= 10) {
      breakdown.letter += 30;
      letterArchived = true;
    }
    if (t.letters[0]) {
      timeline.push({
        at: t.letters[0].createdAt,
        source: "letter",
        description: `편지를 처음 주고받기 시작 (${t.letterCount}통)`
      });
    }
    if (t.status === "ARCHIVED" && t.archivedAt) {
      timeline.push({
        at: t.archivedAt,
        source: "letter",
        description: "편지함이 5왕복으로 완성"
      });
    }
  }

  // ─── 천리안 ───
  if (sightAtoB) {
    breakdown.sight += 10;
    types.add("sight");
    timeline.push({
      at: sightAtoB.createdAt,
      source: "sight",
      description: "내가 그쪽에게 천리안을 폄"
    });
  }
  if (sightBtoA) {
    breakdown.sight += 10;
    types.add("sight");
    timeline.push({
      at: sightBtoA.createdAt,
      source: "sight",
      description: "그쪽이 나에게 천리안을 폄"
    });
  }
  if (sightAtoB && sightBtoA) {
    breakdown.sight += 20;
    timeline.push({
      at: sightAtoB.createdAt > sightBtoA.createdAt ? sightAtoB.createdAt : sightBtoA.createdAt,
      source: "sight",
      description: "두 천리안이 모두 닿음"
    });
  }

  // ─── 듀엣 ───
  let duetLines = 0;
  let duetComplete = false;
  if (duet) {
    types.add("duet");
    breakdown.duet += 10;
    duetLines = duet.lines.length;
    breakdown.duet += duetLines * 3;
    duetComplete = duet.status === "COMPLETE";
    if (duetComplete) breakdown.duet += 50;
    timeline.push({
      at: duet.createdAt,
      source: "duet",
      description: "듀엣 책을 시작"
    });
    if (duet.completedAt) {
      timeline.push({
        at: duet.completedAt,
        source: "duet",
        description: "듀엣 책이 완성됨"
      });
    }
  }

  // ─── 미러 양방향 ───
  const myMirrorDates = new Set(myMirror.map((m) => m.date));
  const reciprocatedCount = theirMirror.filter((m) => myMirrorDates.has(m.date)).length;
  if (reciprocatedCount > 0) types.add("mirror");
  breakdown.mirror += reciprocatedCount * 15;
  if (reciprocatedCount > 0) {
    const latestReciprocated = [...theirMirror, ...myMirror]
      .filter((m) => myMirrorDates.has(m.date))
      .sort((a, b) => +(b.signalAt ?? 0) - +(a.signalAt ?? 0))[0];
    if (latestReciprocated?.signalAt) {
      timeline.push({
        at: latestReciprocated.signalAt,
        source: "mirror",
        description: `미러에서 같은 시간에 신호가 닿음 (${reciprocatedCount}번)`
      });
    }
  }

  // ─── 합주(공명) ───
  const echoesMtoT = myEchoes.length;
  const echoesTtoM = theirEchoes.length;
  if (echoesMtoT > 0 || echoesTtoM > 0) types.add("resonance");
  breakdown.resonance += echoesMtoT * 3;
  breakdown.resonance += echoesTtoM * 3;
  if (echoesMtoT > 0) {
    timeline.push({
      at: myEchoes[0].createdAt,
      source: "resonance",
      description: `그쪽의 한 줄에 내가 공명 (${echoesMtoT}번)`
    });
  }
  if (echoesTtoM > 0) {
    timeline.push({
      at: theirEchoes[0].createdAt,
      source: "resonance",
      description: `내 한 줄에 그쪽이 공명 (${echoesTtoM}번)`
    });
  }

  // ─── 공중 한 줄 ───
  let myStarred = 0;
  let theirStarred = 0;
  for (const r of myReplies) {
    breakdown.postbox += 3;
    if (r.postbox.starredReplyId === r.id) {
      breakdown.postbox += 20;
      myStarred++;
      timeline.push({
        at: r.createdAt,
        source: "postbox",
        description: "그쪽이 내 답신에 별표를 줌"
      });
    }
  }
  for (const r of theirReplies) {
    breakdown.postbox += 5;
    if (r.postbox.starredReplyId === r.id) {
      breakdown.postbox += 20;
      theirStarred++;
      timeline.push({
        at: r.createdAt,
        source: "postbox",
        description: "내가 그쪽 답신에 별표를 줌"
      });
    }
  }
  if (myReplies.length > 0 || theirReplies.length > 0) types.add("postbox");

  // ─── 우연의 시간 ───
  const sealedCoincidences = coincidences.filter((c) => c.sealedAt);
  if (sealedCoincidences.length > 0) types.add("coincidence");
  breakdown.coincidence += sealedCoincidences.length * 5;
  for (const c of sealedCoincidences.slice(0, 1)) {
    if (c.sealedAt) {
      timeline.push({
        at: c.sealedAt,
        source: "coincidence",
        description: `${c.windowTime}의 우연에서 한 줄을 주고받음`
      });
    }
  }

  // ─── 정렬 ───
  timeline.sort((a, b) => +a.at - +b.at);

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const firstAt = timeline[0]?.at ?? null;
  const lastAt = timeline[timeline.length - 1]?.at ?? null;

  return {
    score,
    breakdown,
    types: [...types],
    firstAt,
    lastAt,
    detail: {
      letterCount,
      letterArchived,
      sightAtoB: !!sightAtoB,
      sightBtoA: !!sightBtoA,
      duetLines,
      duetComplete,
      mirrorReciprocated: reciprocatedCount,
      echoesFromMeToThem: echoesMtoT,
      echoesFromThemToMe: echoesTtoM,
      postboxRepliesToTheirs: myReplies.length,
      postboxRepliesToMine: theirReplies.length,
      postboxStarsMine: myStarred,
      postboxStarsTheirs: theirStarred,
      coincidenceSealed: sealedCoincidences.length
    },
    timeline
  };
}

function emptyResult(): AffinityResult & { timeline: TimelineEvent[] } {
  return {
    score: 0,
    breakdown: { letter: 0, sight: 0, duet: 0, mirror: 0, resonance: 0, postbox: 0, coincidence: 0 },
    types: [],
    firstAt: null,
    lastAt: null,
    detail: {
      letterCount: 0,
      letterArchived: false,
      sightAtoB: false,
      sightBtoA: false,
      duetLines: 0,
      duetComplete: false,
      mirrorReciprocated: 0,
      echoesFromMeToThem: 0,
      echoesFromThemToMe: 0,
      postboxRepliesToTheirs: 0,
      postboxRepliesToMine: 0,
      postboxStarsMine: 0,
      postboxStarsTheirs: 0,
      coincidenceSealed: 0
    },
    timeline: []
  };
}

/** 사용자의 모든 인터랙션 상대 ID 목록 — 점수 ≥ AFFINITY_VISIBLE_FROM 후보 추출용 */
export async function listCandidatePartnerIds(userId: string): Promise<string[]> {
  const ids = new Set<string>();

  const [letters, mySights, theirSights, duets, myEchoes, theirEchoes, myReplies, theirReplies, coincidences, mirror] =
    await Promise.all([
      prisma.letterThread.findMany({
        where: { OR: [{ initiatorId: userId }, { receiverId: userId }] },
        select: { initiatorId: true, receiverId: true }
      }),
      prisma.sightUse.findMany({ where: { viewerId: userId, status: "SUCCESS" }, select: { targetId: true } }),
      prisma.sightUse.findMany({ where: { targetId: userId, status: "SUCCESS" }, select: { viewerId: true } }),
      prisma.duetBook.findMany({
        where: { OR: [{ authorAId: userId }, { authorBId: userId }] },
        select: { authorAId: true, authorBId: true }
      }),
      prisma.resonanceEcho.findMany({
        where: { userId, note: { userId: { not: userId } } },
        select: { note: { select: { userId: true } } }
      }),
      prisma.resonanceEcho.findMany({
        where: { note: { userId }, userId: { not: userId } },
        select: { userId: true }
      }),
      prisma.postboxReply.findMany({
        where: { replierId: userId },
        select: { postbox: { select: { authorId: true } } }
      }),
      prisma.postboxReply.findMany({
        where: { postbox: { authorId: userId }, replierId: { not: userId } },
        select: { replierId: true }
      }),
      prisma.coincidenceMeeting.findMany({
        where: { OR: [{ aliceId: userId }, { bobId: userId }], sealedAt: { not: null } },
        select: { aliceId: true, bobId: true }
      }),
      prisma.mirrorEncounter.findMany({
        where: { userId, signal: { not: null }, NOT: { signal: "pass" } },
        select: { otherUserId: true }
      })
    ]);

  for (const t of letters) {
    if (t.initiatorId !== userId) ids.add(t.initiatorId);
    if (t.receiverId !== userId) ids.add(t.receiverId);
  }
  for (const s of mySights) ids.add(s.targetId);
  for (const s of theirSights) ids.add(s.viewerId);
  for (const d of duets) {
    if (d.authorAId !== userId) ids.add(d.authorAId);
    if (d.authorBId !== userId) ids.add(d.authorBId);
  }
  for (const e of myEchoes) ids.add(e.note.userId);
  for (const e of theirEchoes) ids.add(e.userId);
  for (const r of myReplies) ids.add(r.postbox.authorId);
  for (const r of theirReplies) ids.add(r.replierId);
  for (const c of coincidences) {
    if (c.aliceId !== userId) ids.add(c.aliceId);
    if (c.bobId && c.bobId !== userId) ids.add(c.bobId);
  }
  for (const m of mirror) ids.add(m.otherUserId);

  ids.delete(userId);
  return [...ids];
}

export type EligibilityResult =
  | { eligible: true }
  | {
      eligible: false;
      reason: "below_threshold" | "not_diverse" | "cooling" | "already_connected" | "blocked" | "self";
      message: string;
      cooldownUntil?: Date;
    };

export function checkEligibility(
  affinity: AffinityResult,
  connectionStatus: string | null,
  myId: string,
  otherId: string
): EligibilityResult {
  if (myId === otherId) {
    return { eligible: false, reason: "self", message: "자기 자신과는 연결할 수 없어요." };
  }
  if (connectionStatus === "CONNECTED") {
    return { eligible: false, reason: "already_connected", message: "이미 연결된 사람이에요." };
  }
  if (connectionStatus === "BLOCKED") {
    return { eligible: false, reason: "blocked", message: "차단된 관계예요." };
  }
  if (affinity.score < AFFINITY_THRESHOLD) {
    return {
      eligible: false,
      reason: "below_threshold",
      message: "아직 인연이 더 깊어져야 해요."
    };
  }
  if (affinity.types.length < REQUIRED_INTERACTION_TYPES) {
    return {
      eligible: false,
      reason: "not_diverse",
      message: `${REQUIRED_INTERACTION_TYPES}가지 이상의 결로 만나야 연결할 수 있어요. 지금은 ${affinity.types.length}가지.`
    };
  }
  // 쿨링: 마지막 인터랙션 이후 24h 지나야 함 (성급한 결정 방지)
  if (affinity.lastAt) {
    const cooldownUntil = new Date(+affinity.lastAt + COOLING_PERIOD_MS);
    if (cooldownUntil > new Date()) {
      return {
        eligible: false,
        reason: "cooling",
        message: "마지막 인연의 순간 이후 24시간 — 가만히 두고 보세요.",
        cooldownUntil
      };
    }
  }
  return { eligible: true };
}
