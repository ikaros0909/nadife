import { prisma } from "./db";
import { getWorldType } from "./world-map";

export type Reveal = {
  status: "SUCCESS" | "PENDING" | "FAILED";
  useId: string;
  message: string;
  isHuman?: boolean;
  fields?: {
    gender?: string;
    ageRange?: string;
    country?: string;
    occupation?: string;
    region?: string;
  };
  trajectory?: {
    totalEntries: number;
    uniqueWorlds: number;
    daysSinceStart: number;
    currentWorld: { slug: string; title: string; hue: string } | null;
    mainWorld: { slug: string; title: string; hue: string } | null;
  };
  unknownReason?: string;
};

const PENDING_TIMEOUT_HOURS = 48;

/** 48시간이 넘은 PENDING 천리안을 FAILED로 만료시킨다. lazy 호출 */
export async function expireOldPendings(): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_TIMEOUT_HOURS * 60 * 60 * 1000);
  const r = await prisma.sightUse.updateMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    data: { status: "FAILED", resolvedAt: new Date() }
  });
  return r.count;
}

function ageRangeOf(birthYear: number | null | undefined): string | undefined {
  if (!birthYear) return undefined;
  const age = new Date().getFullYear() - birthYear;
  if (age < 20) return "10대";
  const decade = Math.floor(age / 10) * 10;
  const within = age - decade;
  const phase = within < 4 ? "초반" : within < 7 ? "중반" : "후반";
  return `${decade}대 ${phase}`;
}

/** 한 대상에 대해 현재 시점에서 공개 가능한 reveal 데이터를 구성 */
export async function buildReveal(viewerId: string, targetId: string, useId: string, status: Reveal["status"]): Promise<Reveal> {
  if (status === "PENDING") {
    return {
      status: "PENDING",
      useId,
      message: "이 사람은 아직 자기 자신을 그리는 중이에요. 48시간 안에 답이 도착할 수 있습니다."
    };
  }
  if (status === "FAILED") {
    return {
      status: "FAILED",
      useId,
      message: "디지털 흔적이 흩어져 있어요. 천리안이 소멸했습니다.",
      unknownReason: "target_silent_or_empty"
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    include: {
      personas: { where: { kind: "MAIN" }, orderBy: { createdAt: "desc" }, take: 1 },
      daily: { orderBy: { date: "desc" }, take: 1 }
    }
  });
  if (!target) {
    return {
      status: "FAILED",
      useId,
      message: "흔적조차 남아있지 않아요. 천리안이 소멸했습니다."
    };
  }

  const dailyCount = await prisma.dailyPersona.count({ where: { userId: targetId } });
  const main = target.personas[0] ?? null;
  const latestDaily = target.daily[0] ?? null;
  const mainWorld = main ? getWorldType(main.worldType) : null;
  const currentWorld = latestDaily ? getWorldType(latestDaily.worldType) : mainWorld;

  // 가장 오래된 흔적 날짜 — 메인캐 생성일로 근사
  const start = main?.createdAt ?? target.createdAt;
  const daysSinceStart = Math.max(
    1,
    Math.floor((Date.now() - start.getTime()) / 86400000) + 1
  );

  // unique worlds
  const allWorlds = new Set<string>();
  if (main) allWorlds.add(main.worldType);
  const dailies = await prisma.dailyPersona.findMany({
    where: { userId: targetId },
    select: { worldType: true }
  });
  for (const d of dailies) allWorlds.add(d.worldType);

  const totalEntries = (main ? 1 : 0) + dailyCount;

  return {
    status: "SUCCESS",
    useId,
    message: target.isAI
      ? "디지털 자아 — 사람의 옷을 입지 않은 흔적이에요."
      : "천리안이 닿았어요.",
    isHuman: !target.isAI,
    fields: target.isAI
      ? {}
      : {
          gender: target.gender ?? undefined,
          ageRange: ageRangeOf(target.birthYear),
          country: target.country ?? undefined,
          occupation: target.occupation ?? undefined,
          region: target.region ?? undefined
        },
    trajectory: {
      totalEntries,
      uniqueWorlds: allWorlds.size,
      daysSinceStart,
      currentWorld: currentWorld
        ? { slug: currentWorld.slug, title: currentWorld.title, hue: currentWorld.hue }
        : null,
      mainWorld: mainWorld
        ? { slug: mainWorld.slug, title: mainWorld.title, hue: mainWorld.hue }
        : null
    }
  };
}

/** target에 천리안을 사용할 수 있는 상태인지 판정해서 status를 결정 */
export function decideInitialStatus(target: {
  isAI: boolean;
  gender: string | null;
  country: string | null;
  occupation: string | null;
  region: string | null;
  birthYear: number | null;
}): "SUCCESS" | "PENDING" | "FAILED" {
  // AI는 즉시 SUCCESS — 다만 fields는 비고 isHuman=false만 노출
  if (target.isAI) return "SUCCESS";
  // 실 사용자 — 하나라도 채워진 필드가 있으면 SUCCESS
  if (
    target.gender ||
    target.country ||
    target.occupation ||
    target.region ||
    target.birthYear
  )
    return "SUCCESS";
  // 텅 빈 실 사용자 — 답을 기다림
  return "PENDING";
}
