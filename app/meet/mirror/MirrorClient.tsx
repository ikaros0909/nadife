"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PersonalNav } from "@/components/PersonalNav";
import { getWorldType } from "@/lib/world-map";

type Other = {
  id: string;
  alias: string;
  worldType: string;
  title: string;
  oneLiner: string;
  narrative: string;
  rhythm: string;
  speed: string;
  emotion: string;
  recovery: string;
  energy: string;
  todayMood: string | null;
  todayTitle: string | null;
};

type SightReveal = {
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
  reused?: boolean;
};

type MirrorData = {
  mirrorId?: string;
  date?: string;
  empty?: boolean;
  other?: Other;
  mySignal?: string | null;
  reciprocated?: boolean;
  reciprocatedSignal?: string | null;
  error?: string;
};

const SIGNAL_OPTIONS = [
  { value: "curious", label: "당신의 세계가 궁금해요" },
  { value: "echo",    label: "오늘 어떻게 지냈어요?" },
  { value: "song",    label: "한 곡 추천해주세요" },
  { value: "pass",    label: "오늘은 그냥 지나갈게요" }
] as const;

export function MirrorClient({ userId }: { userId: string }) {
  const [data, setData] = useState<MirrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [signalLoading, setSignalLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [sight, setSight] = useState<SightReveal | null>(null);
  const [sightLoading, setSightLoading] = useState(false);
  const [sightErr, setSightErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/mirror/today?u=${userId}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) throw new Error(j.error || "거울을 비출 수 없어요.");
        setData(j);
        // 시네마틱 reveal
        setTimeout(() => alive && setRevealed(true), 700);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "오류");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  async function send(signal: string) {
    if (!data?.mirrorId) return;
    setSignalLoading(true);
    try {
      const r = await fetch("/api/mirror/signal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, mirrorId: data.mirrorId, signal })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "보낼 수 없어요.");
      setData({ ...data, mySignal: j.signal });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSignalLoading(false);
    }
  }

  async function useSight() {
    if (!data?.other?.id) return;
    setSightLoading(true);
    setSightErr(null);
    setConfirming(false);
    try {
      const r = await fetch("/api/sight/use", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ viewerId: userId, targetId: data.other.id })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "천리안을 펴지 못했어요.");
      setSight(j);
    } catch (e: unknown) {
      setSightErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSightLoading(false);
    }
  }

  const world = data?.other ? getWorldType(data.other.worldType) : null;

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <section className="pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadi-rose">
          MIRROR · 페르소나 미러
        </p>

        {loading && (
          <h1 className="serif mt-4 text-2xl text-nadi-glow">
            오늘의 거울을 비추는 중…
          </h1>
        )}
        {err && <p className="mt-4 text-sm text-nadi-rose">{err}</p>}

        {data?.empty && (
          <div className="mt-10 rounded-3xl border border-dashed border-ink-100/15 bg-black/20 p-10 text-center">
            <h2 className="serif text-2xl text-nadi-glow">오늘은 거울이 비어 있어요.</h2>
            <p className="mt-3 text-sm text-ink-100/60">
              아직 만날 수 있는 다른 세계 사람이 충분하지 않아요.
              <br />
              내일 다시 보러 와주세요.
            </p>
          </div>
        )}
      </section>

      <AnimatePresence>
        {data?.other && world && (
          <motion.section
            key="card"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 30, scale: revealed ? 1 : 0.96 }}
            transition={{ duration: 0.9, ease: [0.22, 0.8, 0.18, 1] }}
            className="mt-10"
          >
            <div
              className="overflow-hidden rounded-3xl border border-nadi-rose/30 p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
              style={{
                background: `radial-gradient(circle at 30% 0%, ${world.hue}33, transparent 55%), radial-gradient(circle at 100% 100%, ${world.hueAlt}55, transparent 55%), linear-gradient(180deg, rgba(11,14,26,0.85), rgba(17,20,43,0.95))`
              }}
            >
              <div className="flex items-center justify-between text-[10px] tracking-[0.4em]">
                <span className="text-nadi-rose">오늘의 거울</span>
                <span style={{ color: world.hue }}>{world.vibe}</span>
              </div>
              <p className="mt-6 text-xs tracking-[0.35em] text-ink-100/50">
                {data.other.alias}
              </p>
              <h2
                className="serif mt-2 text-5xl leading-[1.05]"
                style={{ color: world.hue }}
              >
                {data.other.title}
              </h2>
              <p className="serif mt-4 text-base leading-relaxed text-nadi-glow">
                “{data.other.oneLiner}”
              </p>
              <p className="mt-4 text-sm leading-[1.95] text-ink-100/70">
                {data.other.narrative}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                <Row k="리듬" v={data.other.rhythm} />
                <Row k="관계 속도" v={data.other.speed} />
                <Row k="감정" v={data.other.emotion} />
                <Row k="회복" v={data.other.recovery} />
              </div>

              {data.other.todayMood && (
                <div className="mt-5 rounded-xl border border-nadi-rose/20 bg-black/30 px-4 py-3 text-xs text-ink-100/75">
                  오늘 이 사람은 — <span className="text-nadi-glow">{data.other.todayMood}</span>의 결로 살고 있어요.
                </div>
              )}
            </div>

            {/* 천리안 */}
            <div className="mt-8 rounded-3xl border border-nadi-gold/30 bg-gradient-to-br from-nadi-gold/5 to-nadi-deep/30 p-6">
              <div className="flex items-center justify-between">
                <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
                  ✦ 천리안
                </p>
                {sight && (
                  <span className="text-[10px] tracking-widest text-ink-100/45">
                    {sight.status === "SUCCESS" ? "닿음" : sight.status === "PENDING" ? "기다리는 중" : "흩어짐"}
                  </span>
                )}
              </div>

              {!sight && !confirming && (
                <>
                  <h3 className="serif mt-3 text-lg leading-snug text-nadi-glow">
                    이 사람이 누구인지 알고 싶다면.
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-100/60">
                    성별 · 나이 · 국적 · 직업 · 지역 · 사람 여부 · 궤적을 한 번에 들여다봅니다.
                    <br />
                    상대가 비어 있고 답이 없으면 — 천리안은 소멸합니다.
                  </p>
                  <button
                    onClick={() => setConfirming(true)}
                    disabled={sightLoading}
                    className="mt-5 w-full rounded-2xl border border-nadi-gold/40 bg-nadi-gold/10 px-6 py-3 text-sm tracking-[0.3em] text-nadi-glow hover:bg-nadi-gold/20"
                  >
                    ✦ 천리안 사용
                  </button>
                </>
              )}

              {confirming && !sight && (
                <div className="mt-4 rounded-2xl border border-nadi-gold/40 bg-black/40 p-5 text-center">
                  <p className="serif text-base text-nadi-glow">
                    천리안 1개를 사용하시겠어요?
                  </p>
                  <p className="mt-2 text-xs text-ink-100/55">
                    한 번 펴면 되돌릴 수 없어요.
                  </p>
                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => setConfirming(false)}
                      className="flex-1 rounded-xl border border-ink-100/15 px-4 py-2 text-xs tracking-widest text-ink-100/65 hover:border-ink-100/30"
                    >
                      취소
                    </button>
                    <button
                      onClick={useSight}
                      disabled={sightLoading}
                      className="flex-1 rounded-xl bg-gradient-to-r from-nadi-gold to-nadi-rose px-4 py-2 text-xs tracking-widest text-nadi-night hover:opacity-90 disabled:opacity-50"
                    >
                      {sightLoading ? "펴는 중…" : "✦ 펴기"}
                    </button>
                  </div>
                </div>
              )}

              {sightErr && (
                <p className="mt-3 text-[11px] text-nadi-rose">{sightErr}</p>
              )}

              {sight && (
                <SightRevealPanel
                  reveal={sight}
                  userId={userId}
                  targetId={data.other?.id ?? null}
                />
              )}
            </div>

            {/* 신호 보내기 */}
            <div className="mt-8 rounded-3xl border border-nadi-rose/25 bg-nadi-rose/5 p-6">
              <p className="serif text-[10px] tracking-[0.5em] text-nadi-rose">신호</p>
              <h3 className="serif mt-3 text-lg leading-snug text-nadi-glow">
                {data.mySignal
                  ? "오늘의 신호는 보내졌어요."
                  : "딱 하나만 보낼 수 있어요."}
              </h3>
              <p className="mt-2 text-xs text-ink-100/60">
                답이 와도, 안 와도 괜찮습니다. 내일 또 다른 거울이 비춰져요.
              </p>

              {data.mySignal ? (
                <div className="mt-5 rounded-2xl border border-nadi-rose/30 bg-black/30 px-5 py-4">
                  <p className="text-[10px] tracking-widest text-nadi-rose">보낸 신호</p>
                  <p className="serif mt-2 text-base text-nadi-glow">
                    “{labelOf(data.mySignal)}”
                  </p>
                  {data.reciprocated && (
                    <p className="mt-3 text-sm text-nadi-gold">
                      ✦ 같은 시간에 — 저쪽에서도 당신에게 신호를 보냈어요.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {SIGNAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => send(opt.value)}
                      disabled={signalLoading}
                      className={
                        opt.value === "pass"
                          ? "w-full rounded-2xl border border-ink-100/15 bg-black/20 px-5 py-3 text-left text-xs tracking-[0.25em] text-ink-100/55 hover:border-ink-100/30 disabled:opacity-50"
                          : "w-full rounded-2xl border border-nadi-rose/30 bg-nadi-rose/5 px-5 py-3 text-left text-sm text-nadi-glow hover:bg-nadi-rose/15 disabled:opacity-50"
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <p className="mt-16 text-center text-[10px] tracking-[0.45em] text-ink-100/30">
        매일 한 사람. 그것으로 충분해요.
      </p>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-ink-100/10 bg-black/20 px-3 py-2">
      <div className="text-[10px] tracking-[0.3em] text-ink-100/45">{k}</div>
      <div className="serif mt-0.5 text-sm text-nadi-glow">{v}</div>
    </div>
  );
}

function labelOf(signal: string): string {
  return SIGNAL_OPTIONS.find((s) => s.value === signal)?.label ?? signal;
}

function SightRevealPanel({
  reveal,
  userId,
  targetId
}: {
  reveal: SightReveal;
  userId: string;
  targetId: string | null;
}) {
  if (reveal.status === "PENDING") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-2xl border border-nadi-gold/30 bg-black/30 px-5 py-5 text-center"
      >
        <p className="serif text-base text-nadi-glow">기다리는 중…</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-100/55">{reveal.message}</p>
      </motion.div>
    );
  }
  if (reveal.status === "FAILED") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-2xl border border-nadi-rose/30 bg-black/30 px-5 py-5 text-center"
      >
        <p className="serif text-base text-nadi-rose">✦ 흩어짐</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-100/55">{reveal.message}</p>
      </motion.div>
    );
  }

  // SUCCESS
  const f = reveal.fields ?? {};
  const t = reveal.trajectory;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-3"
    >
      {reveal.reused && (
        <p className="text-[10px] tracking-widest text-ink-100/45">
          이미 펴본 기록을 다시 보여드려요.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <RevealField k="사람 여부" v={reveal.isHuman ? "사람" : "디지털 자아"} />
        <RevealField k="나이" v={f.ageRange} />
        <RevealField k="성별" v={f.gender} />
        <RevealField k="국적" v={f.country} />
        <RevealField k="직업" v={f.occupation} />
        <RevealField k="지역" v={f.region} />
      </div>

      {t && (
        <div className="rounded-2xl border border-nadi-gold/25 bg-black/40 p-4">
          <p className="text-[10px] tracking-[0.35em] text-nadi-gold">궤적</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat n={t.daysSinceStart} l="일째" />
            <Stat n={t.uniqueWorlds} l="세계" />
            <Stat n={t.totalEntries} l="기록" />
          </div>
          {(t.mainWorld || t.currentWorld) && (
            <div className="mt-4 space-y-1 text-xs text-ink-100/70">
              {t.mainWorld && (
                <p>
                  메인캐 — <span style={{ color: t.mainWorld.hue }}>{t.mainWorld.title}</span>
                </p>
              )}
              {t.currentWorld && (
                <p>
                  현재 — <span style={{ color: t.currentWorld.hue }}>{t.currentWorld.title}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-[10px] tracking-widest text-ink-100/40">
        {reveal.message}
      </p>

      {reveal.isHuman && targetId && (
        <DuetInvite userId={userId} targetId={targetId} />
      )}

      {targetId && (
        <LetterInvite userId={userId} targetId={targetId} />
      )}
    </motion.div>
  );
}

function DuetInvite({ userId, targetId }: { userId: string; targetId: string }) {
  const router = useRouter();
  const [state, setState] = useState<{
    eligible: boolean;
    bookId: string | null;
    bookStatus: string | null;
    mineDone: boolean;
    theirsDone: boolean;
  } | null>(null);
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/duet/check?u=${userId}&t=${targetId}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (r.ok) setState(j);
      } catch {}
    })();
    return () => { alive = false; };
  }, [userId, targetId]);

  async function open() {
    setOpening(true);
    setErr(null);
    try {
      const r = await fetch("/api/duet/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, partnerId: targetId })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      router.push(`/meet/duet/${j.bookId}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
      setOpening(false);
    }
  }

  if (!state) return null;
  if (state.bookId) {
    return (
      <a
        href={`/meet/duet/${state.bookId}`}
        className="block rounded-2xl border border-nadi-gold/40 bg-nadi-gold/10 p-4 text-center text-xs tracking-widest text-nadi-glow hover:bg-nadi-gold/20"
      >
        ✦ 이 사람과의 듀엣 책 열기 ({state.bookStatus === "COMPLETE" ? "완성됨" : "쓰는 중"})
      </a>
    );
  }
  if (!state.eligible) {
    return (
      <p className="text-center text-[10px] tracking-widest text-ink-100/40">
        {state.mineDone && !state.theirsDone
          ? "이 사람도 당신에게 천리안을 보내면 — 듀엣이 열려요."
          : "—"}
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-nadi-gold/40 bg-gradient-to-r from-nadi-gold/10 to-nadi-rose/10 p-4 text-center">
      <p className="serif text-sm text-nadi-glow">두 천리안이 닿았어요.</p>
      <p className="mt-1 text-[11px] text-ink-100/55">함께 짧은 책을 쓸 수 있어요.</p>
      <button
        onClick={open}
        disabled={opening}
        className="mt-3 rounded-full bg-gradient-to-r from-nadi-gold to-nadi-rose px-6 py-1.5 text-xs tracking-widest text-nadi-night hover:opacity-90 disabled:opacity-50"
      >
        {opening ? "여는 중…" : "✦ 듀엣 열기"}
      </button>
      {err && <p className="mt-2 text-[11px] text-nadi-rose">{err}</p>}
    </div>
  );
}

function LetterInvite({ userId, targetId }: { userId: string; targetId: string }) {
  return (
    <a
      href={`/meet/letter/new?u=${userId}&to=${targetId}`}
      className="block rounded-2xl border border-nadi-rose/30 bg-black/30 p-4 text-center text-xs tracking-widest text-nadi-glow hover:bg-nadi-rose/10"
    >
      ✉ 이 사람에게 편지 쓰기
    </a>
  );
}

function RevealField({ k, v }: { k: string; v?: string }) {
  const has = v && v.trim().length > 0;
  return (
    <div
      className={
        has
          ? "rounded-xl border border-nadi-gold/30 bg-nadi-gold/5 px-3 py-2"
          : "rounded-xl border border-ink-100/10 bg-black/20 px-3 py-2"
      }
    >
      <div className="text-[10px] tracking-[0.3em] text-ink-100/45">{k}</div>
      <div className={has ? "serif mt-0.5 text-sm text-nadi-glow" : "serif mt-0.5 text-sm text-ink-100/35"}>
        {has ? v : "알 수 없음"}
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-xl border border-ink-100/10 bg-black/40 px-2 py-2">
      <div className="serif text-xl text-nadi-glow">{n}</div>
      <div className="mt-0.5 text-[10px] tracking-widest text-ink-100/45">{l}</div>
    </div>
  );
}
