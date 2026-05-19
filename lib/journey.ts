import { WORLD_TYPES, getWorldType, worldDistance, type WorldType } from "./world-map";

export type JourneyPoint = {
  id: string;
  source: "MAIN" | "SUB" | "DAILY";
  date: string;          // ISO 또는 YYYY-MM-DD
  worldSlug: string;
  title: string;
  oneLiner: string;
  axisX: number;
  axisY: number;
};

export type JourneyStats = {
  totalEntries: number;
  uniqueWorlds: number;
  daysSinceStart: number;
  longestStreak: number;
  currentStreak: number;
  mostVisited: { slug: string; title: string; hue: string; count: number } | null;
  biggestJump: { from: WorldType; to: WorldType; distance: number } | null;
  mainEvolutions: { from: string; to: string }[];
};

function dateOnly(s: string | Date): string {
  const d = typeof s === "string" ? new Date(s) : s;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function diffDays(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / 86400000);
}

export function buildJourneyStats(points: JourneyPoint[]): JourneyStats {
  if (points.length === 0) {
    return {
      totalEntries: 0,
      uniqueWorlds: 0,
      daysSinceStart: 0,
      longestStreak: 0,
      currentStreak: 0,
      mostVisited: null,
      biggestJump: null,
      mainEvolutions: []
    };
  }

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const slugs = new Set(sorted.map((p) => p.worldSlug));

  // 가장 자주 머문 세계
  const visitCount = new Map<string, number>();
  for (const p of sorted) visitCount.set(p.worldSlug, (visitCount.get(p.worldSlug) ?? 0) + 1);
  let topSlug = "";
  let topCount = 0;
  for (const [k, v] of visitCount) {
    if (v > topCount) {
      topSlug = k;
      topCount = v;
    }
  }
  const topWorld = topSlug ? getWorldType(topSlug) : null;

  // 가장 먼 점프 (DAILY 기준 연속한 두 점)
  const daily = sorted.filter((p) => p.source === "DAILY");
  let biggest: JourneyStats["biggestJump"] = null;
  for (let i = 1; i < daily.length; i++) {
    const a = getWorldType(daily[i - 1].worldSlug);
    const b = getWorldType(daily[i].worldSlug);
    const d = worldDistance(a, b);
    if (!biggest || d > biggest.distance) biggest = { from: a, to: b, distance: d };
  }

  // 메인캐 변천
  const mains = sorted.filter((p) => p.source === "MAIN");
  const evolutions: { from: string; to: string }[] = [];
  for (let i = 1; i < mains.length; i++) {
    if (mains[i - 1].worldSlug !== mains[i].worldSlug) {
      evolutions.push({ from: mains[i - 1].worldSlug, to: mains[i].worldSlug });
    }
  }

  // 출석 streak — DAILY 기준
  const dailyDates = new Set(daily.map((d) => dateOnly(d.date)));
  let longestStreak = 0;
  let currentStreak = 0;
  // 오늘부터 거꾸로
  let cursor = new Date();
  for (;;) {
    const k = dateOnly(cursor);
    if (dailyDates.has(k)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  // longest — 일자 정렬해서 연속 계산
  const dates = [...dailyDates].sort();
  if (dates.length) {
    let run = 1;
    for (let i = 1; i < dates.length; i++) {
      if (diffDays(dates[i - 1], dates[i]) === 1) {
        run++;
      } else {
        if (run > longestStreak) longestStreak = run;
        run = 1;
      }
    }
    if (run > longestStreak) longestStreak = run;
  }

  const start = sorted[0].date;
  const daysSinceStart = Math.max(1, diffDays(dateOnly(start), dateOnly(new Date())) + 1);

  return {
    totalEntries: sorted.length,
    uniqueWorlds: slugs.size,
    daysSinceStart,
    longestStreak,
    currentStreak,
    mostVisited: topWorld
      ? { slug: topWorld.slug, title: topWorld.title, hue: topWorld.hue, count: topCount }
      : null,
    biggestJump: biggest,
    mainEvolutions: evolutions
  };
}

/** WORLD MAP 좌표(axisX, axisY ∈ [-1,1]) → SVG viewBox 좌표 */
export function toSvg(x: number, y: number, size = 600, padding = 40): { cx: number; cy: number } {
  const inner = size - padding * 2;
  const cx = padding + ((x + 1) / 2) * inner;
  const cy = padding + ((1 - y) / 2) * inner;
  return { cx, cy };
}

export function allWorldsForBackdrop(): WorldType[] {
  return WORLD_TYPES;
}
