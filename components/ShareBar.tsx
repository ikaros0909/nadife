"use client";

import { useEffect, useState } from "react";
import { ShareSheet } from "./ShareSheet";

/**
 * 페르소나 카드 공유 — Facebook · X · 카카오톡 · 링크복사 + 카드 이미지 다운로드.
 * shareUrl과 imageUrl을 절대 URL로 만들어 OG/Kakao SDK가 정상 작동.
 */
export function ShareBar({ personaId, title }: { personaId: string; title: string }) {
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const cardUrl = origin ? `${origin}/card/${personaId}` : `/card/${personaId}`;
  const ogUrl = origin ? `${origin}/api/og/persona/${personaId}` : `/api/og/persona/${personaId}`;

  return (
    <div className="mt-8 flex flex-col gap-3">
      <ShareSheet
        url={cardUrl}
        title={`NADIFE · ${title}`}
        description={`AI가 읽어주는 나의 디지털 페르소나 — “${title}”. 이메일 하나로 60초 안에 나의 디지털 관상을 발견하세요.`}
        imageUrl={ogUrl}
      />
      <a
        href={`/api/og/persona/${personaId}`}
        download={`nadife-${personaId}.png`}
        target="_blank"
        rel="noreferrer"
        className="rounded-2xl border border-nadi-gold/30 bg-nadi-gold/5 px-4 py-3 text-center text-xs tracking-[0.25em] text-nadi-glow transition hover:bg-nadi-gold/15"
      >
        카드 이미지 저장
      </a>
    </div>
  );
}
