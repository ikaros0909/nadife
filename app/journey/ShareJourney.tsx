"use client";

import { useState } from "react";
import type { JourneyStats } from "@/lib/journey";

export function ShareJourney({
  userId,
  latestTitle,
  stats
}: {
  userId: string;
  latestTitle: string;
  stats: JourneyStats;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/j/${userId}`
    : `/j/${userId}`;
  const ogUrl = `/api/og/journey/${userId}`;

  async function copy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${stats.daysSinceStart}일, ${stats.uniqueWorlds}개의 세계 — NADIFE`,
          text: `내가 거쳐온 ${stats.uniqueWorlds}개의 세계 — 현재는 "${latestTitle}"`,
          url: shareUrl
        });
      } catch {}
    } else copy();
  }

  return (
    <div className="mt-12 rounded-3xl border border-nadi-gold/30 bg-gradient-to-br from-nadi-gold/5 to-nadi-rose/5 p-7">
      <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">SHARE</p>
      <h3 className="serif mt-3 text-2xl leading-snug text-nadi-glow">
        이 궤적을 공유하세요.
      </h3>
      <p className="mt-2 text-xs text-ink-100/60">
        받은 친구는 그들만의 궤적을 시작할 수 있습니다.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={nativeShare}
          className="rounded-2xl bg-gradient-to-r from-nadi-gold to-nadi-rose px-6 py-4 text-sm tracking-[0.3em] text-nadi-night transition hover:opacity-90"
        >
          궤적 공유하기
        </button>
        <div className="flex gap-3">
          <button
            onClick={copy}
            className="flex-1 rounded-2xl border border-nadi-gold/30 bg-nadi-gold/5 px-4 py-3 text-xs tracking-[0.25em] text-nadi-glow hover:bg-nadi-gold/15"
          >
            {copied ? "✓ 링크 복사됨" : "링크 복사"}
          </button>
          <a
            href={ogUrl}
            download={`nadife-journey-${userId}.png`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-2xl border border-nadi-gold/30 bg-nadi-gold/5 px-4 py-3 text-center text-xs tracking-[0.25em] text-nadi-glow hover:bg-nadi-gold/15"
          >
            카드 이미지 저장
          </a>
        </div>
      </div>
    </div>
  );
}
