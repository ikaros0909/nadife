"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PersonaCard, type CardData } from "@/components/PersonaCard";
import { ShareBar } from "@/components/ShareBar";
import { PersonalNav } from "@/components/PersonalNav";

type Props = {
  persona: CardData;
  worldHue: string;
  worldHueAlt: string;
  worldVibe: string;
  kindHint: string;
  userId?: string;
  hasSub: boolean;
};

export function RevealCeremony({ persona, worldHue, worldHueAlt, worldVibe, kindHint, userId, hasSub }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "veil" | "open" | "card">("intro");
  const [subLoading, setSubLoading] = useState(false);
  const [subErr, setSubErr] = useState<string | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("veil"), 1100);
    const t2 = setTimeout(() => setPhase("open"), 2400);
    const t3 = setTimeout(() => setPhase("card"), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  async function revealSub() {
    if (!userId) return;
    setSubLoading(true);
    setSubErr(null);
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
      setSubErr(e instanceof Error ? e.message : "오류");
      setSubLoading(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-6 pb-20">
      {userId && phase === "card" && <PersonalNav userId={userId} current="home" />}

      {/* 배경 그라데이션 */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${worldHue}33, transparent 55%),
                       radial-gradient(circle at 30% 80%, ${worldHueAlt}55, transparent 55%)`
        }}
      />

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="flex min-h-[80vh] flex-col items-center justify-center text-center"
          >
            <p className="serif text-xs tracking-[0.6em] text-nadi-gold">NADIFE</p>
            <h1 className="serif mt-10 text-3xl text-nadi-glow sm:text-4xl">
              디지털 흔적을 읽는 중…
            </h1>
            <div className="mt-10 h-[2px] w-40 overflow-hidden bg-ink-100/10">
              <div className="h-full w-full animate-pulse bg-nadi-gold" />
            </div>
          </motion.div>
        )}

        {phase === "veil" && (
          <motion.div
            key="veil"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 1.0 }}
            className="flex min-h-[80vh] flex-col items-center justify-center text-center"
          >
            <p className="serif text-xs tracking-[0.6em] text-nadi-gold/80">결과 도착</p>
            <h2 className="serif mt-8 text-4xl leading-snug text-nadi-glow sm:text-5xl">
              당신의
              <br />
              {kindHint === "SUB" ? "또 다른 얼굴이" : "디지털 관상이"}
              <br />
              열립니다.
            </h2>
          </motion.div>
        )}

        {phase === "open" && (
          <motion.div
            key="open"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="flex min-h-[80vh] flex-col items-center justify-center"
          >
            <motion.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="serif text-8xl"
              style={{ color: worldHue }}
            >
              {worldVibe.split("").map((c, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  className="inline-block"
                >
                  {c}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        )}

        {phase === "card" && (
          <motion.div
            key="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <header className="mb-6 flex items-center justify-between pt-4">
              <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
                {kindHint === "SUB" ? "AI가 들킨 당신의 부캐" : "AI가 읽은 당신의 메인캐"}
              </p>
              {userId && (
                <Link
                  href="/home"
                  className="text-xs tracking-widest text-ink-100/40 hover:text-nadi-glow"
                >
                  내 화면 →
                </Link>
              )}
            </header>

            <PersonaCard data={persona} />

            <ShareBar personaId={persona.id} title={persona.title} />

            {/* 부캐 리빌 의식 — 메인 표시 직후 등장하는 핵심 바이럴 후크 */}
            {persona.kind === "MAIN" && !hasSub && userId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.7 }}
                className="mt-14 rounded-3xl border border-nadi-rose/30 bg-gradient-to-br from-nadi-rose/10 to-nadi-deep/30 p-7"
              >
                <p className="serif text-[10px] tracking-[0.55em] text-nadi-rose">
                  다음 의식
                </p>
                <h3 className="serif mt-3 text-2xl leading-snug text-nadi-glow">
                  당신 안에는 또 다른 사람이
                  <br />
                  살고 있습니다.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-100/70">
                  AI는 메인캐와 결이 가장 다른,
                  <br />
                  <span className="text-nadi-rose">당신도 몰랐던 부캐</span>를 찾을 수 있습니다.
                </p>
                <button
                  onClick={revealSub}
                  disabled={subLoading}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-nadi-rose to-nadi-gold px-6 py-4 text-sm tracking-[0.3em] text-nadi-night transition hover:opacity-90 disabled:opacity-50"
                >
                  {subLoading ? "부캐를 깨우는 중…" : "내 부캐 보러 가기 →"}
                </button>
                {subErr && <p className="mt-3 text-xs text-nadi-rose">{subErr}</p>}
              </motion.div>
            )}

            {/* 부캐까지 본 후 — 매일 페르소나 + 궤적 권유 */}
            {persona.kind === "SUB" && userId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                className="mt-10 rounded-3xl border border-nadi-gold/30 bg-nadi-gold/5 p-7"
              >
                <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
                  매일의 의식
                </p>
                <h3 className="serif mt-3 text-xl leading-snug text-nadi-glow">
                  오늘부터 매일,
                  <br />
                  당신은 다른 사람일 수 있습니다.
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-ink-100/65">
                  하루 한 단어를 적어두면, AI가 그날의 세계를 골라드립니다.
                  <br />
                  쌓인 기록은 — 오직 당신만의 <span className="text-nadi-gold">궤적</span>이 됩니다.
                </p>
                <Link
                  href={`/today?u=${userId}`}
                  className="mt-5 block rounded-2xl bg-gradient-to-r from-nadi-gold to-nadi-rose px-6 py-4 text-center text-sm tracking-[0.3em] text-nadi-night hover:opacity-90"
                >
                  오늘의 페르소나 시작 →
                </Link>
                <div className="mt-3 flex gap-3">
                  <Link
                    href={`/journey?u=${userId}`}
                    className="flex-1 rounded-2xl border border-nadi-gold/30 bg-nadi-gold/5 py-3 text-center text-xs tracking-[0.3em] text-nadi-glow hover:bg-nadi-gold/15"
                  >
                    궤적
                  </Link>
                  <Link
                    href={`/map?u=${userId}`}
                    className="flex-1 rounded-2xl border border-nadi-gold/30 bg-nadi-gold/5 py-3 text-center text-xs tracking-[0.3em] text-nadi-glow hover:bg-nadi-gold/15"
                  >
                    좌표
                  </Link>
                  <Link
                    href={`/explore?u=${userId}`}
                    className="flex-1 rounded-2xl border border-nadi-rose/30 bg-nadi-rose/5 py-3 text-center text-xs tracking-[0.3em] text-nadi-glow hover:bg-nadi-rose/15"
                  >
                    다른 세계
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
