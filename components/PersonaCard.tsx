"use client";

import { motion } from "framer-motion";
import { getWorldType } from "@/lib/world-map";

export type CardData = {
  id: string;
  kind: string;
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

export function PersonaCard({
  data,
  compact = false
}: {
  data: CardData;
  compact?: boolean;
}) {
  const world = getWorldType(data.worldType);
  const kindLabel =
    data.kind === "MAIN" ? "MAIN · 메인캐" :
    data.kind === "SUB" ? "SUB · 부캐" :
    data.kind === "SHADOW" ? "SHADOW · 그림자" : data.kind;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 0.8, 0.18, 1] }}
      className="relative w-full overflow-hidden rounded-3xl border border-nadip-gold/25 p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
      style={{
        background: `radial-gradient(circle at 20% 0%, ${world.hue}33, transparent 55%),
                     radial-gradient(circle at 100% 100%, ${world.hueAlt}55, transparent 55%),
                     linear-gradient(180deg, rgba(11,14,26,0.85), rgba(17,20,43,0.95))`
      }}
    >
      {/* shimmer line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] shimmer-gold" />

      <div className="flex items-center justify-between">
        <div className="serif text-[10px] tracking-[0.55em] text-nadip-gold">NADIPE</div>
        <div
          className="rounded-full border border-nadip-gold/40 px-3 py-1 text-[10px] tracking-[0.3em]"
          style={{ color: world.hue }}
        >
          {kindLabel}
        </div>
      </div>

      <div className="mt-12">
        <div className="text-[11px] tracking-[0.45em] text-ink-100/50">
          당신의 디지털 관상
        </div>
        <h1
          className="serif mt-3 text-5xl leading-[1.05] sm:text-6xl"
          style={{ color: world.hue }}
        >
          {world.title}
        </h1>
        <div
          className="mt-3 text-xs tracking-[0.4em]"
          style={{ color: world.hue }}
        >
          {world.glyph}  {world.vibe}
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-nadip-gold/15 bg-black/20 px-6 py-5">
        <div className="text-[10px] tracking-[0.4em] text-nadip-gold">AI 한줄평</div>
        <p className="serif mt-3 text-xl leading-snug text-nadip-glow sm:text-2xl">
          “{data.oneLiner}”
        </p>
      </div>

      {!compact && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            <Row label="리듬" value={data.rhythm} />
            <Row label="관계 속도" value={data.speed} />
            <Row label="감정" value={data.emotion} />
            <Row label="회복" value={data.recovery} />
            <Row label="에너지" value={data.energy} />
            <Row label="좌표" value={`(${world.axisX.toFixed(1)}, ${world.axisY.toFixed(1)})`} />
          </div>

          <p className="serif mt-8 text-sm leading-[1.9] text-ink-100/70">
            {data.narrative}
          </p>
        </>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-nadip-gold/15 pt-4 text-[10px] tracking-[0.4em] text-ink-100/40">
        <span>나의 디지털 페르소나</span>
        <span>{world.keywords.join(" · ")}</span>
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100/10 bg-black/20 px-4 py-3">
      <div className="text-[10px] tracking-[0.35em] text-ink-100/45">{label}</div>
      <div className="serif mt-1 text-base text-nadip-glow">{value}</div>
    </div>
  );
}
