"use client";

import { useEffect, useState } from "react";
import { ShareSheet } from "@/components/ShareSheet";
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
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = origin ? `${origin}/j/${userId}` : `/j/${userId}`;
  const ogUrl = origin ? `${origin}/api/og/journey/${userId}` : `/api/og/journey/${userId}`;
  const headline = `${stats.daysSinceStart}일, ${stats.uniqueWorlds}개의 세계 — NADIFE`;
  const description = `${stats.daysSinceStart}일 동안 거쳐온 ${stats.uniqueWorlds}개의 세계, 현재는 "${latestTitle}". NADIFE에서 매일 다른 나의 디지털 페르소나를 발견하세요.`;

  return (
    <div className="mt-12 rounded-3xl border border-nadi-gold/30 bg-gradient-to-br from-nadi-gold/5 to-nadi-rose/5 p-7">
      <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">SHARE</p>
      <h3 className="serif mt-3 text-2xl leading-snug text-nadi-glow">
        이 궤적을 공유하세요.
      </h3>
      <p className="mt-2 text-xs text-ink-100/60">
        받은 친구는 그들만의 궤적을 시작할 수 있습니다.
      </p>
      <div className="mt-6">
        <ShareSheet
          url={shareUrl}
          title={headline}
          description={description}
          imageUrl={ogUrl}
        />
        <a
          href={`/api/og/journey/${userId}`}
          download={`nadife-journey-${userId}.png`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-2xl border border-nadi-gold/30 bg-nadi-gold/5 px-4 py-3 text-center text-xs tracking-[0.25em] text-nadi-glow hover:bg-nadi-gold/15"
        >
          궤적 이미지 저장
        </a>
      </div>
    </div>
  );
}
