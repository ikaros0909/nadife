"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PersonalNav } from "@/components/PersonalNav";
import { WORLD_TYPES, getWorldType } from "@/lib/world-map";
import { toSvg, type JourneyPoint, type JourneyStats } from "@/lib/journey";
import { InboxSection } from "./InboxSection";
import { ConnectSettingsSection } from "./ConnectSettingsSection";

type PersonaSummary = {
  id: string;
  worldType: string;
  title: string;
  oneLiner: string;
  rhythm: string;
  speed: string;
  emotion: string;
  recovery: string;
  energy: string;
  narrative: string;
};

type DailyEntry = {
  id: string;
  date: string;
  mood: string;
  worldType: string;
  title: string;
  oneLiner: string;
};

type SightProfile = {
  gender: string | null;
  country: string | null;
  occupation: string | null;
  region: string | null;
  birthYear: number | null;
};

type SightProps = {
  balance: number;
  todayGranted: boolean;
  profile: SightProfile;
  pendingIncoming: number;
};

type Props = {
  userId: string;
  nickname: string | null;
  email: string;
  main: PersonaSummary;
  sub: PersonaSummary | null;
  todayDaily: DailyEntry | null;
  recentDailies: DailyEntry[];
  allPoints: JourneyPoint[];
  stats: JourneyStats;
  sight: SightProps;
};

const QUICK_MOODS = ["몰입", "회복", "설렘", "지침", "선명함", "조용함"];

const MINI = 360;
const MINI_PAD = 30;

export function HomeView({
  userId,
  nickname,
  email,
  main,
  sub,
  todayDaily: initialDaily,
  recentDailies,
  allPoints,
  stats,
  sight
}: Props) {
  const router = useRouter();
  const [todayDaily, setTodayDaily] = useState<DailyEntry | null>(initialDaily);
  const [moodInput, setMoodInput] = useState("");
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodErr, setMoodErr] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealErr, setRevealErr] = useState<string | null>(null);

  const mainWorld = getWorldType(main.worldType);
  const subWorld = sub ? getWorldType(sub.worldType) : null;
  const todayWorld = todayDaily ? getWorldType(todayDaily.worldType) : null;

  const projected = useMemo(() => {
    return allPoints.map((p) => {
      const w = getWorldType(p.worldSlug);
      const { cx, cy } = toSvg(w.axisX, w.axisY, MINI, MINI_PAD);
      return { ...p, cx, cy, hue: w.hue };
    });
  }, [allPoints]);

  const miniPathD = useMemo(() => {
    if (projected.length < 2) return "";
    return projected
      .map((p, i) => (i === 0 ? `M ${p.cx} ${p.cy}` : `L ${p.cx} ${p.cy}`))
      .join(" ");
  }, [projected]);

  async function submitMood(picked: string) {
    setMoodLoading(true);
    setMoodErr(null);
    try {
      const r = await fetch("/api/today", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, mood: picked })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setTodayDaily(j.daily);
      // 새 데이터를 통계에 반영하려면 새로고침
      router.refresh();
    } catch (e: unknown) {
      setMoodErr(e instanceof Error ? e.message : "오류");
    } finally {
      setMoodLoading(false);
    }
  }

  async function revealSub() {
    setRevealLoading(true);
    setRevealErr(null);
    try {
      const r = await fetch("/api/reveal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "리빌 실패");
      router.push(`/reveal/${j.personaId}?u=${userId}&kind=SUB`);
    } catch (e: unknown) {
      setRevealErr(e instanceof Error ? e.message : "오류");
      setRevealLoading(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-6 pb-20">
      <PersonalNav userId={userId} current="home" />

      {/* 인사말 + 핵심 통계 */}
      <section className="pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
          {nickname ?? email}
        </p>
        <h1 className="serif mt-4 text-3xl leading-[1.2] text-nadi-glow sm:text-4xl">
          {todayDaily ? "오늘의 당신이" : "오늘 당신은"}
          <br />
          {todayDaily ? (
            <>
              <span style={{ color: todayWorld!.hue }}>{todayWorld!.title}</span>의 세계에 있어요.
            </>
          ) : (
            <span className="bg-gradient-to-r from-nadi-gold to-nadi-rose bg-clip-text text-transparent">
              어떤 사람인가요?
            </span>
          )}
        </h1>
        <div className="mt-6 flex flex-wrap gap-3 text-[11px] tracking-[0.25em] text-ink-100/55">
          <Pill>{stats.daysSinceStart}일째</Pill>
          <Pill>{stats.uniqueWorlds} / 16 세계</Pill>
          <Pill highlight>연속 {stats.currentStreak}일</Pill>
        </div>
      </section>

      {/* 도착함 — 오늘 당신을 기다리는 것 */}
      <InboxSection userId={userId} />

      {/* 오늘의 체크인 */}
      <section className="mt-10">
        {todayDaily && todayWorld ? (
          <div
            className="rounded-3xl border border-nadi-gold/25 p-7"
            style={{
              background: `radial-gradient(circle at 30% 0%, ${todayWorld.hue}33, transparent 60%), linear-gradient(180deg, rgba(11,14,26,0.8), rgba(17,20,43,0.95))`
            }}
          >
            <div className="flex items-center justify-between">
              <p className="serif text-[10px] tracking-[0.45em] text-nadi-gold">
                오늘의 페르소나
              </p>
              <span className="rounded-full border border-nadi-gold/30 px-3 py-1 text-[10px] tracking-[0.3em] text-ink-100/70">
                {todayDaily.mood}
              </span>
            </div>
            <h2 className="serif mt-6 text-4xl leading-tight" style={{ color: todayWorld.hue }}>
              {todayWorld.title}
            </h2>
            <p className="serif mt-3 text-base leading-relaxed text-nadi-glow">
              “{todayDaily.oneLiner}”
            </p>
            <p className="mt-4 text-[10px] tracking-[0.3em] text-ink-100/45">
              내일이 되면 다른 당신을 만날 수 있어요.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-nadi-gold/40 bg-gradient-to-br from-nadi-gold/10 to-nadi-rose/10 p-7"
          >
            <p className="serif text-[10px] tracking-[0.45em] text-nadi-gold">
              오늘의 체크인
            </p>
            <h2 className="serif mt-3 text-2xl leading-snug text-nadi-glow">
              오늘 당신은 어떤 사람인가요?
            </h2>
            <p className="mt-2 text-xs text-ink-100/60">
              한 단어 — AI가 오늘 어울리는 세계를 짚어드립니다.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {QUICK_MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => submitMood(m)}
                  disabled={moodLoading}
                  className="rounded-full border border-ink-100/15 px-4 py-2 text-sm text-ink-100/70 transition hover:border-nadi-gold/50 hover:bg-nadi-gold/10 hover:text-nadi-glow disabled:opacity-40"
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={moodInput}
                onChange={(e) => setMoodInput(e.target.value)}
                placeholder="직접 적기"
                className="flex-1 rounded-xl border border-nadi-gold/30 bg-transparent px-4 py-3 text-sm text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && moodInput.trim()) submitMood(moodInput.trim());
                }}
              />
              <button
                onClick={() => moodInput.trim() && submitMood(moodInput.trim())}
                disabled={moodLoading || !moodInput.trim()}
                className="rounded-xl bg-nadi-gold/15 px-5 text-xs tracking-[0.25em] text-nadi-glow ring-1 ring-nadi-gold/40 hover:bg-nadi-gold/25 disabled:opacity-50"
              >
                {moodLoading ? "AI…" : "결정"}
              </button>
            </div>
            {moodErr && <p className="mt-3 text-xs text-nadi-rose">{moodErr}</p>}
          </motion.div>
        )}
      </section>

      {/* 천리안 */}
      <SightSection userId={userId} initial={sight} />

      {/* 연결 조건 + 위치 */}
      <ConnectSettingsSection userId={userId} />

      {/* 메인캐 / 부캐 */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h3 className="serif text-sm tracking-[0.4em] text-nadi-gold">나의 페르소나</h3>
          <Link
            href={`/onboard`}
            className="text-[10px] tracking-widest text-ink-100/40 hover:text-nadi-glow"
          >
            새로 분석 →
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <MiniPersona
            label="MAIN · 메인캐"
            persona={main}
            world={mainWorld}
            userId={userId}
          />
          {sub ? (
            <MiniPersona
              label="SUB · 부캐"
              persona={sub}
              world={subWorld!}
              userId={userId}
              tone="rose"
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-nadi-rose/40 bg-gradient-to-br from-nadi-rose/10 to-nadi-deep/30 p-6"
            >
              <p className="serif text-[10px] tracking-[0.45em] text-nadi-rose">
                숨은 부캐
              </p>
              <h4 className="serif mt-3 text-lg leading-snug text-nadi-glow">
                AI는 당신이 몰랐던
                <br />
                또 다른 당신을 알고 있어요.
              </h4>
              <button
                onClick={revealSub}
                disabled={revealLoading}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-nadi-rose to-nadi-gold px-4 py-3 text-xs tracking-[0.3em] text-nadi-night transition hover:opacity-90 disabled:opacity-50"
              >
                {revealLoading ? "부캐를 깨우는 중…" : "부캐 리빌 →"}
              </button>
              {revealErr && <p className="mt-2 text-[11px] text-nadi-rose">{revealErr}</p>}
            </motion.div>
          )}
        </div>
      </section>

      {/* 미니 궤적 */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h3 className="serif text-sm tracking-[0.4em] text-nadi-gold">나의 궤적</h3>
          <Link
            href={`/journey?u=${userId}`}
            className="text-[10px] tracking-widest text-nadi-gold hover:text-nadi-glow"
          >
            전체 보기 →
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-5 overflow-hidden rounded-3xl border border-nadi-gold/20 bg-[radial-gradient(circle_at_center,_rgba(212,175,111,0.08),_transparent_70%),linear-gradient(180deg,#0b0e1a,#11142b)]"
        >
          <svg viewBox={`0 0 ${MINI} ${MINI}`} className="block w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="home-path" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d4af6f" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#c47b8a" stopOpacity="1" />
              </linearGradient>
            </defs>
            <line x1={MINI / 2} y1={MINI_PAD} x2={MINI / 2} y2={MINI - MINI_PAD} stroke="rgba(212,175,111,0.10)" />
            <line x1={MINI_PAD} y1={MINI / 2} x2={MINI - MINI_PAD} y2={MINI / 2} stroke="rgba(212,175,111,0.10)" />
            {WORLD_TYPES.map((w) => {
              const { cx, cy } = toSvg(w.axisX, w.axisY, MINI, MINI_PAD);
              return <circle key={w.slug} cx={cx} cy={cy} r={2.5} fill={w.hue} opacity="0.22" />;
            })}
            {miniPathD && (
              <motion.path
                d={miniPathD}
                fill="none"
                stroke="url(#home-path)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
              />
            )}
            {projected.map((p, i) => {
              const isLatest = i === projected.length - 1;
              const r = p.source === "DAILY" ? 4 : 5;
              return (
                <circle
                  key={p.id}
                  cx={p.cx}
                  cy={p.cy}
                  r={isLatest ? r + 2 : r}
                  fill={p.hue}
                  stroke="#0b0e1a"
                  strokeWidth="1.5"
                  opacity={isLatest ? 1 : 0.85}
                />
              );
            })}
          </svg>
        </motion.div>

        {recentDailies.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {recentDailies.slice(0, 6).map((d) => {
              const w = getWorldType(d.worldType);
              return (
                <div
                  key={d.id}
                  className="rounded-xl border border-ink-100/10 bg-black/30 p-3 text-[10px]"
                  style={{ borderTop: `2px solid ${w.hue}` }}
                >
                  <div className="tracking-widest text-ink-100/40">{d.date.slice(5)}</div>
                  <div className="serif mt-1 text-xs text-nadi-glow">{w.title}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 만남 — 세 갈래 */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h3 className="serif text-sm tracking-[0.4em] text-nadi-gold">오늘의 만남</h3>
          <Link
            href={`/meet?u=${userId}`}
            className="text-[10px] tracking-widest text-nadi-gold hover:text-nadi-glow"
          >
            만남 허브 →
          </Link>
        </div>
        <p className="mt-2 text-xs text-ink-100/55">
          귀찮지 않게, 스트레스 없이 — 익명 · 시간 제한 · 한 동작.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MeetCard
            href={`/meet/campfire?u=${userId}`}
            head="CAMPFIRE"
            title="세계 모닥불"
            sub={`${mainWorld.title}의 익명 방`}
            hue={mainWorld.hue}
          />
          <MeetCard
            href={`/meet/mirror?u=${userId}`}
            head="MIRROR"
            title="페르소나 미러"
            sub="오늘 단 한 명"
            hue="#c47b8a"
          />
          <MeetCard
            href={`/meet/resonance?u=${userId}`}
            head="RESONANCE"
            title="오늘 합주"
            sub="같은 박자의 한 줄"
            hue="#d4af6f"
          />
        </div>
      </section>

      {/* 이 세계를 더 이해하기 — 참조 콘텐츠 */}
      <section className="mt-14">
        <h3 className="serif text-sm tracking-[0.4em] text-ink-100/55">
          이 세계를 더 이해하기
        </h3>
        <p className="mt-2 text-[11px] tracking-widest text-ink-100/40">
          아무 액션 없이 읽기만 해도 좋은 페이지들.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ReferenceCard
            href={`/map?u=${userId}`}
            label="WORLD MAP"
            title="16개의 세계 좌표"
            sub="내 페르소나가 어디에 위치하는지, 좌표 평면 위에서 한눈에."
          />
          <ReferenceCard
            href={`/explore?u=${userId}`}
            label="EXPLORE"
            title="다른 세계의 단편"
            sub="각 세계의 사람들이 어떻게 살아가는지 — 짧은 에세이로."
          />
        </div>
      </section>

      {/* 공유 */}
      <section className="mt-12 rounded-3xl border border-nadi-gold/30 bg-gradient-to-br from-nadi-gold/5 to-nadi-rose/5 p-7">
        <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">SHARE</p>
        <h3 className="serif mt-3 text-lg leading-snug text-nadi-glow">
          이 궤적을 공유하세요.
        </h3>
        <p className="mt-2 text-xs text-ink-100/60">
          받은 친구는 그들만의 궤적을 시작할 수 있습니다.
        </p>
        <div className="mt-5 flex gap-3">
          <Link
            href={`/j/${userId}`}
            className="flex-1 rounded-2xl border border-nadi-gold/30 bg-nadi-gold/5 py-3 text-center text-xs tracking-[0.3em] text-nadi-glow hover:bg-nadi-gold/15"
          >
            공유 페이지 보기
          </Link>
          <Link
            href={`/card/${main.id}`}
            className="flex-1 rounded-2xl border border-nadi-rose/30 bg-nadi-rose/5 py-3 text-center text-xs tracking-[0.3em] text-nadi-glow hover:bg-nadi-rose/15"
          >
            메인캐 카드
          </Link>
        </div>
      </section>

      <p className="mt-16 text-center text-[10px] tracking-[0.45em] text-ink-100/30">
        우리는 모두 다른 세계를 살아간다
      </p>
    </main>
  );
}

function Pill({
  children,
  highlight
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={
        highlight
          ? "rounded-full border border-nadi-gold/40 bg-nadi-gold/10 px-3 py-1 text-nadi-glow"
          : "rounded-full border border-ink-100/15 bg-black/20 px-3 py-1"
      }
    >
      {children}
    </span>
  );
}

function MiniPersona({
  label,
  persona,
  world,
  userId,
  tone
}: {
  label: string;
  persona: PersonaSummary;
  world: ReturnType<typeof getWorldType>;
  userId: string;
  tone?: "gold" | "rose";
}) {
  const border = tone === "rose" ? "border-nadi-rose/30" : "border-nadi-gold/25";
  return (
    <Link
      href={`/card/${persona.id}`}
      className={`group block rounded-2xl border ${border} p-6 transition hover:-translate-y-0.5`}
      style={{
        background: `radial-gradient(circle at 0% 0%, ${world.hue}22, transparent 55%), rgba(11,14,26,0.55)`
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.4em] text-nadi-gold">{label}</p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] tracking-[0.25em]"
          style={{ color: world.hue, border: `1px solid ${world.hue}44` }}
        >
          {world.vibe}
        </span>
      </div>
      <h4 className="serif mt-5 text-2xl" style={{ color: world.hue }}>
        {world.title}
      </h4>
      <p className="mt-2 text-xs leading-relaxed text-ink-100/65">“{persona.oneLiner}”</p>
      <p className="mt-4 text-[10px] tracking-widest text-ink-100/35 group-hover:text-ink-100/55">
        카드 자세히 →
      </p>
    </Link>
  );
}

function ReferenceCard({
  href,
  label,
  title,
  sub
}: {
  href: string;
  label: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-ink-100/15 bg-black/20 p-5 transition hover:border-ink-100/30"
    >
      <div className="text-[10px] tracking-[0.4em] text-ink-100/45">{label}</div>
      <div className="serif mt-3 text-lg text-nadi-glow">{title}</div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-100/50">{sub}</p>
      <div className="mt-4 text-[10px] tracking-widest text-ink-100/40 group-hover:text-ink-100/65">
        읽으러 가기 →
      </div>
    </Link>
  );
}

function SightSection({
  userId,
  initial
}: {
  userId: string;
  initial: SightProps;
}) {
  const router = useRouter();
  const [balance, setBalance] = useState(initial.balance);
  const [pendingIncoming, setPendingIncoming] = useState(initial.pendingIncoming);
  const [profile, setProfile] = useState<SightProfile>(initial.profile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    gender: initial.profile.gender ?? "",
    country: initial.profile.country ?? "",
    occupation: initial.profile.occupation ?? "",
    region: initial.profile.region ?? "",
    birthYear: initial.profile.birthYear ? String(initial.profile.birthYear) : ""
  });
  const [saving, setSaving] = useState(false);
  const [decliningAll, setDecliningAll] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/sight/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          gender: draft.gender || undefined,
          country: draft.country || undefined,
          occupation: draft.occupation || undefined,
          region: draft.region || undefined,
          birthYear: draft.birthYear ? Number(draft.birthYear) : undefined
        })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "저장 실패");
      setProfile({
        gender: draft.gender || null,
        country: draft.country || null,
        occupation: draft.occupation || null,
        region: draft.region || null,
        birthYear: draft.birthYear ? Number(draft.birthYear) : null
      });
      setPendingIncoming(0);
      setEditing(false);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSaving(false);
    }
  }

  async function declineAll() {
    setDecliningAll(true);
    setErr(null);
    try {
      const r = await fetch("/api/sight/decline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setPendingIncoming(0);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setDecliningAll(false);
    }
  }

  const filledCount = [
    profile.gender,
    profile.country,
    profile.occupation,
    profile.region,
    profile.birthYear
  ].filter(Boolean).length;

  return (
    <section id="sight" className="mt-10">
      <div className="flex items-center justify-between">
        <h3 className="serif text-sm tracking-[0.4em] text-nadi-gold">✦ 천리안</h3>
        <span className="text-[10px] tracking-widest text-ink-100/45">
          {initial.todayGranted ? "오늘 +1 이미 받음" : "오늘의 디지털 관상으로 +1"}
        </span>
      </div>

      {/* 잔량 카드 */}
      <div
        className="mt-4 rounded-3xl border border-nadi-gold/30 p-6"
        style={{
          background:
            "radial-gradient(circle at 30% 0%, rgba(212,175,111,0.18), transparent 55%), rgba(11,14,26,0.55)"
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.4em] text-nadi-gold">잔량</p>
            <p
              className="serif mt-2 text-6xl leading-none"
              style={{
                background: "linear-gradient(135deg, #d4af6f, #c47b8a)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              ✦ {balance}
            </p>
          </div>
          <div className="text-right text-xs leading-relaxed text-ink-100/60">
            <p>한 사람을 들여다보는 데</p>
            <p>천리안 1개가 듭니다.</p>
            <p className="mt-2 text-[10px] tracking-widest text-ink-100/40">
              미러에서 사용 →
            </p>
          </div>
        </div>
      </div>

      {/* 들여다보려는 사람들 (incoming pending) */}
      {pendingIncoming > 0 && (
        <div className="mt-4 rounded-2xl border border-nadi-rose/40 bg-nadi-rose/10 p-5">
          <p className="serif text-sm leading-snug text-nadi-glow">
            <span className="text-nadi-rose">{pendingIncoming}명</span>이
            지금 당신을 들여다보려 합니다.
          </p>
          <p className="mt-1 text-xs text-ink-100/60">
            아래에 윤곽 몇 가지를 답해주면 — 그들의 천리안이 닿을 수 있어요.
            <br />
            답하지 않아도 48시간 뒤엔 자동으로 사라집니다.
          </p>
          <button
            onClick={declineAll}
            disabled={decliningAll}
            className="mt-3 text-[10px] tracking-widest text-nadi-rose underline hover:text-nadi-glow disabled:opacity-50"
          >
            지금 모두 거절하기
          </button>
        </div>
      )}

      {/* 프로필 윤곽 — 천리안 답변용 */}
      <div className="mt-4 rounded-2xl border border-ink-100/10 bg-black/30 p-5">
        <div className="flex items-center justify-between">
          <p className="serif text-xs tracking-[0.4em] text-nadi-gold">나의 윤곽</p>
          <span className="text-[10px] tracking-widest text-ink-100/45">
            {filledCount}/5 채움
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-100/55">
          다른 사람의 천리안이 닿았을 때 보일 수 있는 정보예요. 비워둬도 괜찮습니다.
        </p>

        {!editing ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <ProfileField k="성별" v={profile.gender} />
              <ProfileField k="출생연도" v={profile.birthYear ? String(profile.birthYear) : null} />
              <ProfileField k="국적" v={profile.country} />
              <ProfileField k="직업" v={profile.occupation} />
              <ProfileField k="지역" v={profile.region} />
            </div>
            <button
              onClick={() => setEditing(true)}
              className="mt-4 w-full rounded-xl border border-nadi-gold/30 bg-nadi-gold/5 py-2 text-xs tracking-[0.25em] text-nadi-glow hover:bg-nadi-gold/15"
            >
              윤곽 채우기 / 수정하기
            </button>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            <input
              placeholder="성별 (예: 여성 / 남성 / 비공개)"
              value={draft.gender}
              onChange={(e) => setDraft({ ...draft, gender: e.target.value })}
              className="w-full rounded-xl border border-ink-100/15 bg-transparent px-4 py-2.5 text-sm text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold/50"
            />
            <input
              placeholder="출생연도 (예: 1992)"
              type="number"
              value={draft.birthYear}
              onChange={(e) => setDraft({ ...draft, birthYear: e.target.value })}
              className="w-full rounded-xl border border-ink-100/15 bg-transparent px-4 py-2.5 text-sm text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold/50"
            />
            <input
              placeholder="국적 (예: 한국)"
              value={draft.country}
              onChange={(e) => setDraft({ ...draft, country: e.target.value })}
              className="w-full rounded-xl border border-ink-100/15 bg-transparent px-4 py-2.5 text-sm text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold/50"
            />
            <input
              placeholder="직업 (예: 디자이너)"
              value={draft.occupation}
              onChange={(e) => setDraft({ ...draft, occupation: e.target.value })}
              className="w-full rounded-xl border border-ink-100/15 bg-transparent px-4 py-2.5 text-sm text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold/50"
            />
            <input
              placeholder="지역 (예: 서울)"
              value={draft.region}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
              className="w-full rounded-xl border border-ink-100/15 bg-transparent px-4 py-2.5 text-sm text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold/50"
            />
            {err && <p className="text-[11px] text-nadi-rose">{err}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 rounded-xl border border-ink-100/15 px-4 py-2 text-xs tracking-widest text-ink-100/65 hover:border-ink-100/30"
              >
                취소
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-xl bg-gradient-to-r from-nadi-gold to-nadi-rose px-4 py-2 text-xs tracking-widest text-nadi-night hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        )}
      </div>

      {balance === 0 && !initial.todayGranted && (
        <p className="mt-3 text-center text-[10px] tracking-widest text-ink-100/40">
          오늘의 디지털 관상을 만들면 천리안 +1
        </p>
      )}

      {/* 내가 사용한 천리안 내역 */}
      <SightHistory userId={userId} />
    </section>
  );
}

const SOURCE_LABEL: Record<string, { label: string; href: (u: string) => string; tone: string }> = {
  mirror:      { label: "미러",        href: (u) => `/meet/mirror?u=${u}`,      tone: "#c47b8a" },
  campfire:    { label: "모닥불",      href: (u) => `/meet/campfire?u=${u}`,    tone: "#d4af6f" },
  postbox:     { label: "공중 한 줄",   href: (u) => `/meet/postbox?u=${u}`,     tone: "#c47b8a" },
  resonance:   { label: "오늘 합주",    href: (u) => `/meet/resonance?u=${u}`,   tone: "#d4af6f" },
  letter:      { label: "편지함",      href: (u) => `/meet/letter?u=${u}`,      tone: "#d4af6f" },
  coincidence: { label: "우연의 시간",  href: (u) => `/meet/coincidence?u=${u}`, tone: "#c47b8a" }
};

type SightHistoryItem = {
  id: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  source: string | null;
  createdAt: string;
  resolvedAt: string | null;
  target: { id: string; worldType: string | null; title: string | null };
};

function SightHistory({ userId }: { userId: string }) {
  const [items, setItems] = useState<SightHistoryItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch(`/api/sight/balance?u=${userId}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (!alive) return;
        setItems(j.recent ?? []);
      } catch {}
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [userId]);

  if (!items) return null;
  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-ink-100/15 bg-black/20 px-5 py-4 text-center text-[11px] tracking-widest text-ink-100/45">
        아직 천리안을 펴본 적이 없어요.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="serif text-xs tracking-[0.4em] text-nadi-gold">내가 사용한 천리안</p>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <SightHistoryRow key={it.id} item={it} userId={userId} />
        ))}
      </ul>
    </div>
  );
}

function SightHistoryRow({ item, userId }: { item: SightHistoryItem; userId: string }) {
  const meta = item.source ? SOURCE_LABEL[item.source] : null;
  const statusLabel =
    item.status === "SUCCESS" ? "✦ 닿음" : item.status === "PENDING" ? "기다리는 중" : "✦ 흩어짐";
  const statusTone =
    item.status === "SUCCESS"
      ? "text-nadi-gold"
      : item.status === "PENDING"
      ? "text-ink-100/55"
      : "text-nadi-rose";

  const when = new Date(item.createdAt).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  const inner = (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100/10 bg-black/30 px-4 py-3 transition hover:border-nadi-gold/30"
      style={meta ? { borderLeft: `2px solid ${meta.tone}` } : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em]">
          {meta ? (
            <span style={{ color: meta.tone }}>{meta.label}</span>
          ) : (
            <span className="text-ink-100/40">직접</span>
          )}
          <span className={statusTone}>{statusLabel}</span>
        </div>
        <p className="serif mt-1 truncate text-sm text-nadi-glow">
          {item.target.title ?? "디지털 자아"}
        </p>
        <p className="mt-0.5 text-[10px] tracking-widest text-ink-100/40">{when}</p>
      </div>
      {meta && <span className="shrink-0 text-[10px] tracking-widest text-ink-100/45">→</span>}
    </div>
  );

  if (meta) {
    return (
      <li>
        <a href={meta.href(userId)}>{inner}</a>
      </li>
    );
  }
  return <li>{inner}</li>;
}

function ProfileField({ k, v }: { k: string; v: string | null }) {
  return (
    <div
      className={
        v
          ? "rounded-xl border border-nadi-gold/25 bg-nadi-gold/5 px-3 py-2"
          : "rounded-xl border border-ink-100/10 bg-black/20 px-3 py-2"
      }
    >
      <div className="text-[10px] tracking-[0.3em] text-ink-100/45">{k}</div>
      <div className={v ? "serif mt-0.5 text-sm text-nadi-glow" : "serif mt-0.5 text-sm text-ink-100/35"}>
        {v ?? "—"}
      </div>
    </div>
  );
}

function MeetCard({
  href,
  head,
  title,
  sub,
  hue
}: {
  href: string;
  head: string;
  title: string;
  sub: string;
  hue: string;
}) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-nadi-gold/20 p-5 transition hover:-translate-y-0.5"
      style={{
        background: `radial-gradient(circle at 0% 0%, ${hue}22, transparent 60%), rgba(11,14,26,0.55)`,
        borderLeft: `2px solid ${hue}55`
      }}
    >
      <div className="text-[10px] tracking-[0.4em]" style={{ color: hue }}>
        {head}
      </div>
      <div className="serif mt-3 text-base text-nadi-glow">{title}</div>
      <div className="mt-1 text-[10px] tracking-widest text-ink-100/55">{sub}</div>
      <div className="mt-3 text-[10px] tracking-widest text-ink-100/35 group-hover:text-ink-100/65">
        들어가기 →
      </div>
    </Link>
  );
}
