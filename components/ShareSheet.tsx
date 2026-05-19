"use client";

import { useEffect, useState } from "react";

// Kakao SDK 타입 — JS Key 없으면 로드 안 됨
type KakaoSDK = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (opts: {
      objectType: "feed";
      content: {
        title: string;
        description: string;
        imageUrl: string;
        link: { mobileWebUrl: string; webUrl: string };
      };
      buttons?: { title: string; link: { mobileWebUrl: string; webUrl: string } }[];
    }) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

export type ShareSheetProps = {
  /** 친구에게 공유될 URL — 반드시 절대 URL */
  url: string;
  /** 공유 카드 헤드라인 */
  title: string;
  /** 공유 카드 본문 — NADIFE가 무엇인지 한 줄로 설명 권장 */
  description: string;
  /** 카드 미리보기 이미지 (1200×1200 권장) — 반드시 절대 URL */
  imageUrl?: string;
};

/** Facebook · X · 카카오톡 · 링크복사 — 명시적 채널 버튼 */
export function ShareSheet({ url, title, description, imageUrl }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);

  useEffect(() => {
    if (!KAKAO_KEY) return;
    if (typeof window === "undefined") return;
    if (window.Kakao?.isInitialized()) {
      setKakaoReady(true);
      return;
    }
    // SDK 미로드 시 동적 로드
    const exist = document.querySelector<HTMLScriptElement>(`script[data-nadi-kakao]`);
    if (exist) {
      exist.addEventListener("load", () => initKakao());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.async = true;
    script.dataset.nadiKakao = "1";
    script.onload = () => initKakao();
    script.onerror = () => console.error("[kakao] SDK load failed");
    document.head.appendChild(script);

    function initKakao() {
      try {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(KAKAO_KEY!);
        }
        setKakaoReady(true);
      } catch (err) {
        console.error("[kakao] init failed", err);
      }
    }
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("[share] copy failed", err);
    }
  }

  function openPopup(href: string, name: string) {
    const w = 600;
    const h = 600;
    const left = Math.max(0, (window.innerWidth - w) / 2);
    const top = Math.max(0, (window.innerHeight - h) / 2);
    window.open(href, name, `width=${w},height=${h},left=${left},top=${top}`);
  }

  function shareFacebook() {
    openPopup(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "fb-share"
    );
  }

  function shareTwitter() {
    openPopup(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} — ${description}`)}&url=${encodeURIComponent(url)}`,
      "x-share"
    );
  }

  async function shareKakao() {
    if (!window.Kakao || !kakaoReady) {
      // SDK 없을 때 — 링크 복사로 우회
      await copyLink();
      alert("카카오 공유 SDK 미설정. 링크가 복사되었어요. 카카오톡에 붙여넣어 보세요.");
      return;
    }
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description,
        imageUrl: imageUrl ?? "",
        link: { mobileWebUrl: url, webUrl: url }
      },
      buttons: [
        {
          title: "나도 디지털 관상 보기",
          link: { mobileWebUrl: url, webUrl: url }
        }
      ]
    });
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text: description, url });
        return;
      } catch {
        // 사용자 취소 또는 실패 — 무시
      }
    }
    await copyLink();
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={nativeShare}
        className="w-full rounded-2xl bg-gradient-to-r from-nadi-gold to-nadi-rose px-6 py-4 text-sm tracking-[0.3em] text-nadi-night transition hover:opacity-90"
      >
        공유하기
      </button>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ShareBtn label="Facebook" onClick={shareFacebook} tone="blue" />
        <ShareBtn label="X / Twitter" onClick={shareTwitter} tone="ink" />
        <ShareBtn
          label="카카오톡"
          onClick={shareKakao}
          tone="kakao"
          note={!kakaoReady ? "링크복사" : undefined}
        />
        <ShareBtn
          label={copied ? "✓ 복사됨" : "링크 복사"}
          onClick={copyLink}
          tone="gold"
        />
      </div>
    </div>
  );
}

function ShareBtn({
  label,
  onClick,
  tone,
  note
}: {
  label: string;
  onClick: () => void;
  tone: "gold" | "blue" | "ink" | "kakao";
  note?: string;
}) {
  const cls =
    tone === "blue"
      ? "border-[#1877f2]/60 bg-[#1877f2]/10 text-nadi-glow hover:bg-[#1877f2]/20"
      : tone === "kakao"
      ? "border-yellow-300/50 bg-yellow-300/10 text-yellow-100 hover:bg-yellow-300/20"
      : tone === "ink"
      ? "border-ink-100/30 bg-black/40 text-nadi-glow hover:bg-black/55"
      : "border-nadi-gold/30 bg-nadi-gold/5 text-nadi-glow hover:bg-nadi-gold/15";
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border px-3 py-2.5 text-xs tracking-widest transition ${cls}`}
    >
      {label}
      {note && (
        <span className="absolute -bottom-1 right-1 rounded-full bg-black/60 px-1 text-[8px] text-ink-100/70">
          {note}
        </span>
      )}
    </button>
  );
}
