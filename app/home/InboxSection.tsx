"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type InboxData = {
  sight: { balance: number; incoming: number; resolvedRecently: number };
  meet: {
    letter: number;
    mirror: number;
    duet: number;
    resonance: number;
    postboxReplies: number;
    postboxStarred: number;
    total: number;
  };
  counts: { home: number; meet: number; total: number };
  previews: {
    letter: { threadId: string; partnerAlias: string; snippet: string; unread: boolean }[];
    sightResolved: { useId: string; targetTitle: string }[];
  };
};

export function InboxSection({ userId }: { userId: string }) {
  const [data, setData] = useState<InboxData | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/inbox?u=${userId}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setData(j);
    } catch {}
  }, [userId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) return null;

  const items = buildItems(data, userId);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h3 className="serif text-sm tracking-[0.4em] text-nadi-gold">
          ✦ 오늘 당신을 기다리는 것
        </h3>
        {data.counts.total > 0 && (
          <span className="rounded-full border border-nadi-gold/40 bg-nadi-gold/10 px-2 py-0.5 text-[10px] tracking-widest text-nadi-glow">
            {data.counts.total}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-ink-100/15 bg-black/20 px-5 py-4 text-center text-[12px] tracking-widest text-ink-100/45">
          오늘 새로 도착한 것이 없어요.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          <AnimatePresence initial={false}>
            {items.map((it) => (
              <motion.li
                key={it.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Link
                  href={it.href}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-nadi-gold/25 bg-black/30 px-5 py-3.5 transition hover:border-nadi-gold/50"
                  style={{ borderLeft: `2px solid ${it.tone}` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] tracking-[0.35em]"
                        style={{ color: it.tone }}
                      >
                        {it.label}
                      </span>
                      {it.count > 0 && (
                        <span
                          className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white"
                          style={{ background: it.tone }}
                        >
                          {it.count > 99 ? "99+" : it.count}
                        </span>
                      )}
                    </div>
                    <p className="serif mt-1 truncate text-sm text-nadi-glow">{it.title}</p>
                    {it.subtitle && (
                      <p className="mt-0.5 truncate text-[11px] text-ink-100/55">
                        {it.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] tracking-widest text-ink-100/40 group-hover:text-nadi-glow">
                    →
                  </span>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

type Item = {
  key: string;
  label: string;
  title: string;
  subtitle?: string;
  count: number;
  href: string;
  tone: string;
};

const TONE_GOLD = "#d4af6f";
const TONE_ROSE = "#c47b8a";
const TONE_GLOW = "#f5e6c8";

function buildItems(d: InboxData, userId: string): Item[] {
  const out: Item[] = [];

  // 편지 답장 차례 — 가장 깊은 사람일 가능성 → 1순위
  if (d.meet.letter > 0) {
    const preview = d.previews.letter[0];
    out.push({
      key: "letter",
      label: "편지 답장 차례",
      title:
        preview && preview.snippet
          ? `${preview.partnerAlias}: "${preview.snippet}…"`
          : `${d.meet.letter}통의 편지가 답장을 기다리고 있어요`,
      subtitle:
        d.meet.letter > 1 ? `+ ${d.meet.letter - 1}통 더` : undefined,
      count: d.meet.letter,
      href: `/meet/letter?u=${userId}`,
      tone: TONE_GOLD
    });
  }

  // 미러 양방향 — 같은 시간에 신호가 닿음
  if (d.meet.mirror > 0) {
    out.push({
      key: "mirror",
      label: "오늘의 미러",
      title: "같은 시간에 — 저쪽에서도 당신에게 신호를 보냈어요.",
      count: d.meet.mirror,
      href: `/meet/mirror?u=${userId}`,
      tone: TONE_ROSE
    });
  }

  // 듀엣 내 차례
  if (d.meet.duet > 0) {
    out.push({
      key: "duet",
      label: "듀엣 — 내 차례",
      title: `${d.meet.duet}권의 책이 한 줄을 기다려요`,
      count: d.meet.duet,
      href: `/meet/duet?u=${userId}`,
      tone: TONE_GOLD
    });
  }

  // 천리안 들여다보려는 사람
  if (d.sight.incoming > 0) {
    out.push({
      key: "sight-in",
      label: "✦ 천리안",
      title: `${d.sight.incoming}명이 당신을 들여다보려 합니다`,
      subtitle: "프로필 윤곽을 채우면 그들에게 닿아요",
      count: d.sight.incoming,
      href: `/home#sight`,
      tone: TONE_GOLD
    });
  }

  // 천리안 답변 도착 (내가 보낸 PENDING → SUCCESS)
  if (d.sight.resolvedRecently > 0) {
    const preview = d.previews.sightResolved[0];
    out.push({
      key: "sight-out",
      label: "✦ 천리안 답이 도착",
      title: preview
        ? `${preview.targetTitle}의 윤곽이 도착했어요`
        : `${d.sight.resolvedRecently}건의 답이 도착했어요`,
      subtitle:
        d.sight.resolvedRecently > 1 ? `+ ${d.sight.resolvedRecently - 1}건 더` : undefined,
      count: d.sight.resolvedRecently,
      href: `/home#sight`,
      tone: TONE_GLOW
    });
  }

  // 합주 공명
  if (d.meet.resonance > 0) {
    out.push({
      key: "resonance",
      label: "오늘 합주 — 공명",
      title: `오늘 내 한 줄에 ${d.meet.resonance}번의 공명`,
      count: d.meet.resonance,
      href: `/meet/resonance?u=${userId}`,
      tone: TONE_GOLD
    });
  }

  // 공중 별표받음 — 강한 신호
  if (d.meet.postboxStarred > 0) {
    out.push({
      key: "postbox-star",
      label: "✦ 공중 한 줄 — 별표",
      title: "이번 주, 누군가 당신의 답신에 별표했어요",
      count: 1,
      href: `/meet/postbox?u=${userId}`,
      tone: TONE_ROSE
    });
  }

  // 공중 답신 도착
  if (d.meet.postboxReplies > 0) {
    out.push({
      key: "postbox-reply",
      label: "공중 한 줄 — 답신",
      title: `${d.meet.postboxReplies}개의 답신이 도착했어요`,
      count: d.meet.postboxReplies,
      href: `/meet/postbox?u=${userId}`,
      tone: TONE_ROSE
    });
  }

  return out;
}
