"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// 액션 동선만 nav에 둠. 좌표/탐험(참조 콘텐츠)은 /home의 별도 섹션에서 진입.
const ITEMS = [
  { key: "home",    label: "홈",     href: (u: string) => `/home` },
  { key: "today",   label: "오늘",   href: (u: string) => `/today?u=${u}` },
  { key: "journey", label: "궤적",   href: (u: string) => `/journey?u=${u}` },
  { key: "meet",    label: "만남",   href: (u: string) => `/meet?u=${u}` }
];

type NavInbox = {
  sightBalance: number;
  sightIncoming: number;
  homeCount: number;
  meetCount: number;
};

export function PersonalNav({ userId, current }: { userId: string; current?: string }) {
  const path = usePathname() ?? "";
  const [box, setBox] = useState<NavInbox | null>(null);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const r = await fetch(`/api/inbox?u=${userId}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (!alive) return;
        setBox({
          sightBalance: j.sight?.balance ?? 0,
          sightIncoming: j.sight?.incoming ?? 0,
          homeCount: j.counts?.home ?? 0,
          meetCount: j.counts?.meet ?? 0
        });
      } catch {}
    }
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [userId, path]);

  const balance = box?.sightBalance ?? null;
  const sightIncoming = box?.sightIncoming ?? 0;
  const homeCount = box?.homeCount ?? 0;
  const meetCount = box?.meetCount ?? 0;

  function active(key: string): boolean {
    if (current) return current === key;
    if (key === "home")    return path === "/home";
    if (key === "today")   return path.startsWith("/today");
    if (key === "journey") return path.startsWith("/journey");
    if (key === "meet")    return path.startsWith("/meet");
    return false;
  }

  function badgeFor(key: string): number {
    if (key === "home") return homeCount;
    if (key === "meet") return meetCount;
    return 0;
  }

  return (
    <nav
      className="sticky top-0 z-40 -mx-6 mb-8 flex items-center gap-3 border-b border-nadi-gold/15 bg-nadi-night/70 px-4 py-3 backdrop-blur-md sm:px-6"
      aria-label="개인 메뉴"
    >
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href="/home"
          aria-label="NADIFE 홈"
          className="serif hidden text-[10px] tracking-[0.55em] text-nadi-gold transition hover:text-nadi-glow sm:inline"
        >
          NADIFE
        </Link>
        {/* 모바일 전용 짧은 마크 */}
        <Link
          href="/home"
          aria-label="NADIFE 홈"
          className="serif text-base text-nadi-gold transition hover:text-nadi-glow sm:hidden"
        >
          N
        </Link>
        {balance !== null && (
          <Link
            href="/home#sight"
            title="천리안 잔량"
            className="relative inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-nadi-gold/40 bg-nadi-gold/10 px-2.5 py-1 text-[11px] tracking-[0.15em] text-nadi-glow hover:bg-nadi-gold/20"
          >
            <span className="text-nadi-gold">✦</span>
            <span>{balance}</span>
            {sightIncoming > 0 && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-nadi-rose shadow-[0_0_8px_rgba(196,123,138,0.8)]" />
            )}
          </Link>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto sm:gap-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {ITEMS.slice(1).map((it) => {
          const on = active(it.key);
          const badge = badgeFor(it.key);
          return (
            <Link
              key={it.key}
              href={it.href(userId)}
              className={
                "relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] tracking-[0.2em] transition sm:tracking-[0.3em] " +
                (on
                  ? "bg-nadi-gold/15 text-nadi-glow ring-1 ring-nadi-gold/40"
                  : "text-ink-100/55 hover:text-nadi-glow")
              }
            >
              {it.label}
              {badge > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-nadi-rose px-1 text-[9px] font-bold leading-none text-white shadow-[0_0_8px_rgba(196,123,138,0.7)]"
                  aria-label={`${badge}개의 새 알림`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
