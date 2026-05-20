"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { WORLD_TYPES, getWorldType } from "@/lib/world-map";
import { toSvg, type JourneyPoint, type JourneyStats } from "@/lib/journey";
import { ShareJourney } from "./ShareJourney";
import { PersonalNav } from "@/components/PersonalNav";

type Props = {
  userId: string;
  email: string;
  nickname?: string | null;
  points: JourneyPoint[];
  stats: JourneyStats;
  personasCount: number;
  dailyCount: number;
};

const SIZE = 600;
const PAD = 50;

export function JourneyView({
  userId,
  email,
  nickname,
  points,
  stats,
  personasCount,
  dailyCount
}: Props) {
  // SVG 좌표로 변환
  const projected = useMemo(() => {
    return points.map((p) => {
      const w = getWorldType(p.worldSlug);
      const { cx, cy } = toSvg(w.axisX, w.axisY, SIZE, PAD);
      return { ...p, cx, cy, hue: w.hue, worldTitle: w.title };
    });
  }, [points]);

  // 경로 path (시간 순서)
  const pathD = useMemo(() => {
    if (projected.length < 2) return "";
    return projected
      .map((p, i) => (i === 0 ? `M ${p.cx} ${p.cy}` : `L ${p.cx} ${p.cy}`))
      .join(" ");
  }, [projected]);

  const latest = projected[projected.length - 1] ?? null;

  // 30일 히트맵
  const heatmap = useMemo(() => buildHeatmap(points), [points]);

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-4xl px-6 pb-20">
      <PersonalNav userId={userId} current="journey" />

      <div className="mt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">
          {nickname ?? email}
        </p>
        <h1 className="serif mt-4 text-4xl leading-[1.15] text-nadip-glow sm:text-5xl">
          <span className="bg-gradient-to-r from-nadip-gold to-nadip-rose bg-clip-text text-transparent">
            {stats.daysSinceStart}일
          </span>
          째,
          <br />
          <span className="bg-gradient-to-r from-nadip-rose to-nadip-gold bg-clip-text text-transparent">
            {stats.uniqueWorlds}개의 세계
          </span>
          를 거쳐왔다.
        </h1>
      </div>

      {/* 메인 트래젝토리 SVG */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mt-14 overflow-hidden rounded-3xl border border-nadip-gold/20 bg-[radial-gradient(circle_at_center,_rgba(212,175,111,0.08),_transparent_70%),linear-gradient(180deg,#0b0e1a,#11142b)]"
      >
        <div className="flex items-center justify-between border-b border-nadip-gold/10 px-6 py-3">
          <span className="serif text-[10px] tracking-[0.4em] text-nadip-gold">
            WORLD MAP TRAJECTORY
          </span>
          <span className="text-[10px] tracking-widest text-ink-100/40">
            점 {projected.length} · 거쳐온 세계 {stats.uniqueWorlds}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="path-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d4af6f" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#c47b8a" stopOpacity="1" />
            </linearGradient>
            <radialGradient id="latest-glow">
              <stop offset="0%" stopColor="#f5e6c8" stopOpacity="1" />
              <stop offset="60%" stopColor="#c47b8a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#c47b8a" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 축 */}
          <line x1={SIZE / 2} y1={PAD} x2={SIZE / 2} y2={SIZE - PAD} stroke="rgba(212,175,111,0.12)" />
          <line x1={PAD} y1={SIZE / 2} x2={SIZE - PAD} y2={SIZE / 2} stroke="rgba(212,175,111,0.12)" />

          {/* 16개 세계 배경 */}
          {WORLD_TYPES.map((w) => {
            const { cx, cy } = toSvg(w.axisX, w.axisY, SIZE, PAD);
            const isVisited = stats.mostVisited?.slug === w.slug;
            return (
              <g key={w.slug}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={w.hue}
                  opacity={isVisited ? 0.5 : 0.18}
                />
                <text
                  x={cx}
                  y={cy + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isVisited ? "#f5e6c8" : "rgba(245,230,200,0.35)"}
                  fontFamily="serif"
                >
                  {w.title}
                </text>
              </g>
            );
          })}

          {/* 궤적 라인 */}
          {pathD && (
            <motion.path
              d={pathD}
              fill="none"
              stroke="url(#path-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.0, ease: "easeInOut" }}
            />
          )}

          {/* 궤적 점 — 시간 순서대로 */}
          {projected.map((p, i) => {
            const isLatest = i === projected.length - 1;
            const sourceShape = p.source === "MAIN" ? "square" : p.source === "SUB" ? "diamond" : "circle";
            return (
              <motion.g
                key={p.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i, duration: 0.4 }}
              >
                {isLatest && (
                  <circle cx={p.cx} cy={p.cy} r={28} fill="url(#latest-glow)" />
                )}
                {sourceShape === "square" && (
                  <rect
                    x={p.cx - 7}
                    y={p.cy - 7}
                    width={14}
                    height={14}
                    fill={p.hue}
                    stroke="#0b0e1a"
                    strokeWidth="2"
                  />
                )}
                {sourceShape === "diamond" && (
                  <polygon
                    points={`${p.cx},${p.cy - 9} ${p.cx + 9},${p.cy} ${p.cx},${p.cy + 9} ${p.cx - 9},${p.cy}`}
                    fill={p.hue}
                    stroke="#0b0e1a"
                    strokeWidth="2"
                  />
                )}
                {sourceShape === "circle" && (
                  <circle
                    cx={p.cx}
                    cy={p.cy}
                    r={isLatest ? 8 : 6}
                    fill={p.hue}
                    stroke="#0b0e1a"
                    strokeWidth="2"
                  />
                )}
              </motion.g>
            );
          })}

          {/* 범례 */}
          <g transform={`translate(${PAD}, ${SIZE - 22})`}>
            <text fontSize="10" fill="rgba(245,230,200,0.45)" fontFamily="sans-serif">
              ■ 메인캐    ◆ 부캐    ● 오늘의 나
            </text>
          </g>
          <text
            x={SIZE - PAD}
            y={SIZE - 22}
            textAnchor="end"
            fontSize="10"
            fill="rgba(245,230,200,0.35)"
            fontFamily="serif"
          >
            NADIPE
          </text>
        </svg>
      </motion.div>

      {/* 통계 4종 */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="총 기록" value={`${stats.totalEntries}`} unit="개" />
        <Stat label="거쳐온 세계" value={`${stats.uniqueWorlds}`} unit="/ 16" />
        <Stat label="연속 출석" value={`${stats.currentStreak}`} unit="일" highlight />
        <Stat label="최장 연속" value={`${stats.longestStreak}`} unit="일" />
      </div>

      {/* 가장 자주 머문 세계 + 가장 먼 점프 */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {stats.mostVisited && (
          <div
            className="rounded-2xl border border-nadip-gold/25 bg-black/30 p-6"
            style={{ borderTop: `2px solid ${stats.mostVisited.hue}` }}
          >
            <p className="text-[10px] tracking-[0.35em] text-nadip-gold">자주 머문 세계</p>
            <p className="serif mt-3 text-2xl text-nadip-glow">{stats.mostVisited.title}</p>
            <p className="mt-1 text-xs text-ink-100/50">{stats.mostVisited.count}번 방문</p>
          </div>
        )}
        {stats.biggestJump && (
          <div className="rounded-2xl border border-nadip-rose/25 bg-black/30 p-6">
            <p className="text-[10px] tracking-[0.35em] text-nadip-rose">가장 먼 자아 점프</p>
            <p className="serif mt-3 text-base leading-snug text-nadip-glow">
              <span style={{ color: stats.biggestJump.from.hue }}>{stats.biggestJump.from.title}</span>
              {"  →  "}
              <span style={{ color: stats.biggestJump.to.hue }}>{stats.biggestJump.to.title}</span>
            </p>
            <p className="mt-1 text-xs text-ink-100/50">
              거리 {stats.biggestJump.distance.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* 메인캐 변천사 */}
      {stats.mainEvolutions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-nadip-gold/20 bg-black/20 p-6">
          <p className="text-[10px] tracking-[0.35em] text-nadip-gold">메인캐의 변천</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-100/75">
            {stats.mainEvolutions.map((e, i) => {
              const a = getWorldType(e.from);
              const b = getWorldType(e.to);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span style={{ color: a.hue }} className="serif">{a.title}</span>
                  <span className="text-ink-100/40">→</span>
                  <span style={{ color: b.hue }} className="serif">{b.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 30일 히트맵 */}
      <div className="mt-12 rounded-3xl border border-nadip-gold/20 bg-black/20 p-6">
        <div className="flex items-center justify-between">
          <p className="serif text-[10px] tracking-[0.45em] text-nadip-gold">
            지난 30일 페르소나 일기
          </p>
          <p className="text-[10px] tracking-widest text-ink-100/40">
            {dailyCount}일 기록
          </p>
        </div>
        <div className="mt-5 grid grid-cols-10 gap-[6px] sm:grid-cols-15">
          {heatmap.map((cell) => (
            <div
              key={cell.date}
              title={cell.entry ? `${cell.date} · ${cell.entry.title} (${cell.entry.oneLiner})` : cell.date}
              className="relative aspect-square rounded-md"
              style={{
                background: cell.entry
                  ? `linear-gradient(135deg, ${cell.entry.hue}, ${cell.entry.hueAlt})`
                  : "rgba(245,230,200,0.04)",
                border: cell.isToday
                  ? "1px solid rgba(212,175,111,0.9)"
                  : "1px solid rgba(245,230,200,0.05)",
                boxShadow: cell.entry ? `0 0 18px -8px ${cell.entry.hue}` : "none"
              }}
            />
          ))}
        </div>
      </div>

      {/* 최근 기록 타임라인 */}
      <div className="mt-12">
        <p className="serif text-[10px] tracking-[0.45em] text-nadip-gold">RECENT</p>
        <h2 className="serif mt-3 text-xl text-nadip-glow">최근 기록</h2>
        <div className="mt-6 space-y-3">
          {[...projected].reverse().slice(0, 10).map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-4 rounded-2xl border border-ink-100/10 bg-black/30 px-5 py-4"
              style={{ borderLeft: `2px solid ${p.hue}` }}
            >
              <div className="flex flex-col items-center pt-1">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ background: p.hue, boxShadow: `0 0 10px ${p.hue}` }}
                />
                <span className="mt-2 text-[10px] tracking-widest text-ink-100/40">
                  {p.source === "MAIN" ? "MAIN" : p.source === "SUB" ? "SUB" : "DAY"}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="serif text-base text-nadip-glow">{p.worldTitle}</p>
                  <p className="text-[10px] tracking-widest text-ink-100/40">
                    {p.date.slice(0, 10)}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-100/60">
                  “{p.oneLiner}”
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA + 공유 */}
      <ShareJourney userId={userId} latestTitle={latest?.worldTitle ?? "NADIPE"} stats={stats} />

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <Link
          href="/home"
          className="rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-7 py-3 text-xs tracking-[0.3em] text-nadip-night hover:opacity-90"
        >
          내 화면으로 →
        </Link>
        <Link
          href={`/today?u=${userId}`}
          className="rounded-full border border-nadip-gold/40 bg-nadip-gold/10 px-7 py-3 text-xs tracking-[0.3em] text-nadip-glow hover:bg-nadip-gold/20"
        >
          오늘의 페르소나 +
        </Link>
      </div>

      <p className="mt-16 text-center text-[10px] tracking-[0.45em] text-ink-100/30">
        우리는 모두 다른 세계를 살아간다
      </p>
    </main>
  );
}

function Stat({
  label,
  value,
  unit,
  highlight
}: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-2xl border border-nadip-gold/40 bg-gradient-to-br from-nadip-gold/10 to-nadip-rose/10 p-5"
          : "rounded-2xl border border-ink-100/10 bg-black/30 p-5"
      }
    >
      <p className="text-[10px] tracking-[0.35em] text-ink-100/45">{label}</p>
      <p className="serif mt-3 text-3xl text-nadip-glow">
        {value}
        {unit && <span className="ml-1 text-sm text-ink-100/50">{unit}</span>}
      </p>
    </div>
  );
}

// ───────── 30일 히트맵 데이터 ─────────

type HeatCell = {
  date: string;
  isToday: boolean;
  entry: { hue: string; hueAlt: string; title: string; oneLiner: string } | null;
};

function buildHeatmap(points: JourneyPoint[]): HeatCell[] {
  // 최근 30일
  const today = new Date();
  const cells: HeatCell[] = [];
  const byDate = new Map<string, JourneyPoint>();
  for (const p of points) {
    if (p.source === "DAILY") {
      const d = p.date.slice(0, 10);
      // 같은 날에 여러 entry가 있을 수 없지만 안전하게 마지막 것
      byDate.set(d, p);
    }
  }
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const p = byDate.get(key);
    const w = p ? getWorldType(p.worldSlug) : null;
    cells.push({
      date: key,
      isToday: i === 0,
      entry: w
        ? { hue: w.hue, hueAlt: w.hueAlt, title: p!.title, oneLiner: p!.oneLiner }
        : null
    });
  }
  return cells;
}
