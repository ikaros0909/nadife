"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

export type SightSource =
  | "mirror"
  | "campfire"
  | "postbox"
  | "resonance"
  | "letter"
  | "coincidence";

export function SightTrigger({
  viewerId,
  targetId,
  label = "✦ 천리안",
  showLetterInvite = true,
  size = "sm",
  source
}: {
  viewerId: string;
  targetId: string | null;
  label?: string;
  showLetterInvite?: boolean;
  size?: "xs" | "sm";
  /** 어디서 사용했는지 (분석/히스토리용) */
  source?: SightSource;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reveal, setReveal] = useState<SightReveal | null>(null);

  if (!targetId || targetId === viewerId) return null;

  async function pop() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/sight/use", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ viewerId, targetId, source })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "천리안을 펴지 못했어요.");
      setReveal(j);
      setConfirming(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  const btnCls =
    size === "xs"
      ? "rounded-full border border-nadip-gold/35 bg-nadip-gold/5 px-2.5 py-0.5 text-[10px] tracking-widest text-nadip-gold hover:bg-nadip-gold/15"
      : "rounded-full border border-nadip-gold/40 bg-nadip-gold/10 px-3 py-1 text-[11px] tracking-widest text-nadip-gold hover:bg-nadip-gold/20";

  return (
    <div className="inline-block w-full">
      {!reveal && !confirming && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
          disabled={loading}
          className={btnCls}
        >
          {label}
        </button>
      )}

      <AnimatePresence>
        {confirming && !reveal && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 rounded-2xl border border-nadip-gold/40 bg-black/50 px-4 py-3 text-center"
          >
            <p className="serif text-sm text-nadip-glow">천리안 1개를 사용할까요?</p>
            <p className="mt-1 text-[10px] tracking-widest text-ink-100/55">
              한 번 펴면 되돌릴 수 없어요.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-xl border border-ink-100/15 px-3 py-1.5 text-[11px] tracking-widest text-ink-100/65 hover:border-ink-100/30"
              >
                취소
              </button>
              <button
                onClick={pop}
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-nadip-gold to-nadip-rose px-3 py-1.5 text-[11px] tracking-widest text-nadip-night hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "펴는 중…" : "✦ 펴기"}
              </button>
            </div>
            {err && <p className="mt-2 text-[11px] text-nadip-rose">{err}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {reveal && (
        <RevealPanel reveal={reveal} viewerId={viewerId} targetId={targetId} showLetterInvite={showLetterInvite} />
      )}
    </div>
  );
}

function RevealPanel({
  reveal,
  viewerId,
  targetId,
  showLetterInvite
}: {
  reveal: SightReveal;
  viewerId: string;
  targetId: string;
  showLetterInvite: boolean;
}) {
  if (reveal.status === "PENDING") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 rounded-2xl border border-nadip-gold/30 bg-black/40 px-4 py-3 text-center"
      >
        <p className="serif text-sm text-nadip-glow">기다리는 중…</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-100/55">{reveal.message}</p>
      </motion.div>
    );
  }
  if (reveal.status === "FAILED") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 rounded-2xl border border-nadip-rose/30 bg-black/40 px-4 py-3 text-center"
      >
        <p className="serif text-sm text-nadip-rose">✦ 흩어짐</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-100/55">{reveal.message}</p>
      </motion.div>
    );
  }

  const f = reveal.fields ?? {};
  const t = reveal.trajectory;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 space-y-2"
    >
      {reveal.reused && (
        <p className="text-[10px] tracking-widest text-ink-100/45">
          이미 펴본 기록이에요.
        </p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <RevealField k="사람 여부" v={reveal.isHuman ? "사람" : "디지털 자아"} />
        <RevealField k="나이" v={f.ageRange} />
        <RevealField k="성별" v={f.gender} />
        <RevealField k="국적" v={f.country} />
        <RevealField k="직업" v={f.occupation} />
        <RevealField k="지역" v={f.region} />
      </div>

      {t && (
        <div className="rounded-2xl border border-nadip-gold/25 bg-black/40 p-3">
          <p className="text-[9px] tracking-[0.35em] text-nadip-gold">궤적</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
            <Stat n={t.daysSinceStart} l="일째" />
            <Stat n={t.uniqueWorlds} l="세계" />
            <Stat n={t.totalEntries} l="기록" />
          </div>
          {(t.mainWorld || t.currentWorld) && (
            <div className="mt-2 space-y-0.5 text-[11px] text-ink-100/70">
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

      {showLetterInvite && reveal.isHuman && (
        <a
          href={`/meet/letter/new?u=${viewerId}&to=${targetId}`}
          className="block rounded-2xl border border-nadip-rose/30 bg-black/30 p-3 text-center text-[11px] tracking-widest text-nadip-glow hover:bg-nadip-rose/10"
        >
          ✉ 이 사람에게 편지 쓰기
        </a>
      )}
    </motion.div>
  );
}

function RevealField({ k, v }: { k: string; v?: string }) {
  const has = v && v.trim().length > 0;
  return (
    <div
      className={
        has
          ? "rounded-lg border border-nadip-gold/30 bg-nadip-gold/5 px-2 py-1.5"
          : "rounded-lg border border-ink-100/10 bg-black/20 px-2 py-1.5"
      }
    >
      <div className="text-[9px] tracking-[0.25em] text-ink-100/45">{k}</div>
      <div className={has ? "serif mt-0.5 text-[12px] text-nadip-glow" : "serif mt-0.5 text-[12px] text-ink-100/35"}>
        {has ? v : "알 수 없음"}
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-lg border border-ink-100/10 bg-black/40 px-1.5 py-1.5">
      <div className="serif text-base text-nadip-glow">{n}</div>
      <div className="mt-0.5 text-[9px] tracking-widest text-ink-100/45">{l}</div>
    </div>
  );
}
