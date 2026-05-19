"use client";

import { useState } from "react";

export function ShareBar({ personaId, title }: { personaId: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const cardUrl = typeof window !== "undefined"
    ? `${window.location.origin}/card/${personaId}`
    : `/card/${personaId}`;
  const ogUrl = `/api/og/persona/${personaId}`;

  async function copy() {
    await navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `NADIFE · ${title}`,
          text: `AI가 본 내 디지털 관상 — ${title}`,
          url: cardUrl
        });
      } catch {}
    } else {
      copy();
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      <button
        onClick={nativeShare}
        className="w-full rounded-2xl bg-gradient-to-r from-nadi-gold to-nadi-rose px-6 py-4 text-sm tracking-[0.3em] text-nadi-night transition hover:opacity-90"
      >
        공유하기
      </button>
      <div className="flex gap-3">
        <button
          onClick={copy}
          className="flex-1 rounded-2xl border border-nadi-gold/30 bg-nadi-gold/5 px-4 py-3 text-xs tracking-[0.25em] text-nadi-glow transition hover:bg-nadi-gold/15"
        >
          {copied ? "✓ 링크 복사됨" : "링크 복사"}
        </button>
        <a
          href={ogUrl}
          download={`nadife-${personaId}.png`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-2xl border border-nadi-gold/30 bg-nadi-gold/5 px-4 py-3 text-center text-xs tracking-[0.25em] text-nadi-glow transition hover:bg-nadi-gold/15"
        >
          카드 이미지 저장
        </a>
      </div>
    </div>
  );
}
