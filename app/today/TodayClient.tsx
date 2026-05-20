"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getWorldType } from "@/lib/world-map";
import { PersonalNav } from "@/components/PersonalNav";

type Daily = {
  id: string;
  date: string;
  mood: string;
  worldType: string;
  title: string;
  oneLiner: string;
};

const MOODS = [
  "몰입", "회복", "공허", "설렘", "지침", "선명함",
  "흩어짐", "그리움", "단단함", "허기짐", "들뜸", "조용함"
];

export function TodayClient({
  userId,
  initial,
  history
}: {
  userId: string;
  initial: Daily | null;
  history: Daily[];
}) {
  const [today, setToday] = useState<Daily | null>(initial);
  const [mood, setMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [grantedFlash, setGrantedFlash] = useState(false);

  async function submit(picked: string) {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/today", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, mood: picked })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setToday(j.daily);
      if (j.sightGranted) {
        setGrantedFlash(true);
        setTimeout(() => setGrantedFlash(false), 4000);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  const world = today ? getWorldType(today.worldType) : null;

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="today" />

      <AnimatePresence mode="wait">
        {!today ? (
          <motion.div
            key="ask"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="mt-14"
          >
            <h1 className="serif text-3xl leading-snug text-nadip-glow sm:text-4xl">
              오늘 당신은
              <br />
              어떤 사람인가요?
            </h1>
            <p className="mt-4 text-sm text-ink-100/60">
              한 단어로 — AI가 오늘 어울리는 세계를 짚어드립니다.
            </p>

            <div className="mt-10 flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => submit(m)}
                  disabled={loading}
                  className="rounded-full border border-ink-100/15 px-4 py-2 text-sm text-ink-100/70 transition hover:border-nadip-gold/50 hover:bg-nadip-gold/10 hover:text-nadip-glow disabled:opacity-50"
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="mt-8 flex gap-2">
              <input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="직접 적어보기"
                className="flex-1 rounded-xl border border-nadip-gold/30 bg-transparent px-4 py-3 text-sm text-nadip-glow placeholder:text-ink-100/30 outline-none focus:border-nadip-gold"
              />
              <button
                onClick={() => mood.trim() && submit(mood.trim())}
                disabled={loading || !mood.trim()}
                className="rounded-xl bg-nadip-gold/15 px-6 py-3 text-sm tracking-[0.25em] text-nadip-glow ring-1 ring-nadip-gold/40 hover:bg-nadip-gold/25 disabled:opacity-50"
              >
                {loading ? "AI…" : "결정"}
              </button>
            </div>

            {err && <p className="mt-4 text-xs text-nadip-rose">{err}</p>}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="mt-14"
          >
            <div
              className="rounded-3xl border border-nadip-gold/30 p-8"
              style={{
                background: `radial-gradient(circle at 30% 0%, ${world!.hue}33, transparent 60%), linear-gradient(180deg, rgba(11,14,26,0.8), rgba(17,20,43,0.95))`
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-[0.4em] text-nadip-gold">
                  TODAY · {today.date}
                </span>
                <span className="rounded-full border border-nadip-gold/30 px-3 py-1 text-[10px] tracking-[0.3em] text-ink-100/70">
                  오늘의 컨디션 · {today.mood}
                </span>
              </div>

              <h2
                className="serif mt-10 text-5xl leading-tight"
                style={{ color: world!.hue }}
              >
                {world!.title}
              </h2>
              <p className="mt-2 text-[10px] tracking-[0.4em]" style={{ color: world!.hue }}>
                {world!.glyph}  {world!.vibe}
              </p>

              <p className="serif mt-8 text-xl leading-snug text-nadip-glow">
                “{today.oneLiner}”
              </p>
            </div>

            <AnimatePresence>
              {grantedFlash && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-6 rounded-2xl border border-nadip-gold/40 bg-gradient-to-r from-nadip-gold/15 to-nadip-rose/15 px-5 py-4 text-center"
                >
                  <p className="serif text-base text-nadip-glow">
                    <span className="text-nadip-gold">✦ 천리안 +1</span>
                  </p>
                  <p className="mt-1 text-[11px] tracking-widest text-ink-100/65">
                    누군가의 윤곽을 들여다볼 수 있는 한 번이 쌓였어요.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <Link
              href="/home"
              className="mt-6 block rounded-2xl bg-gradient-to-r from-nadip-gold to-nadip-rose px-6 py-4 text-center text-sm tracking-[0.3em] text-nadip-night hover:opacity-90"
            >
              내 화면으로 →
            </Link>
            <div className="mt-3 flex gap-3">
              <Link
                href={`/journey?u=${userId}`}
                className="flex-1 rounded-2xl border border-nadip-gold/30 bg-nadip-gold/5 py-3 text-center text-xs tracking-[0.3em] text-nadip-glow hover:bg-nadip-gold/15"
              >
                내 궤적
              </Link>
              <Link
                href={`/explore?u=${userId}&kind=today`}
                className="flex-1 rounded-2xl border border-nadip-rose/30 bg-nadip-rose/5 py-3 text-center text-xs tracking-[0.3em] text-nadip-glow hover:bg-nadip-rose/15"
              >
                같은 오늘을 사는 사람들
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {history.length > 1 && (
        <div className="mt-16">
          <div className="flex items-center justify-between">
            <h3 className="serif text-sm tracking-[0.35em] text-nadip-gold">
              지난 페르소나 일기
            </h3>
            <Link
              href={`/journey?u=${userId}`}
              className="text-[10px] tracking-widest text-nadip-gold hover:text-nadip-glow"
            >
              전체 궤적 →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {history.map((d) => {
              const w = getWorldType(d.worldType);
              return (
                <div
                  key={d.id}
                  className="rounded-2xl border border-ink-100/10 bg-black/30 p-4"
                  style={{ borderTop: `2px solid ${w.hue}` }}
                >
                  <div className="text-[10px] tracking-widest text-ink-100/40">{d.date}</div>
                  <div className="serif mt-2 text-base text-nadip-glow">{w.title}</div>
                  <div className="mt-1 text-[10px] text-ink-100/50">{d.mood}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
