"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PersonalNav } from "@/components/PersonalNav";

type Stage =
  | "blocked"
  | "connected"
  | "proposed_to_me"
  | "proposed_by_me"
  | "declined"
  | "disconnected"
  | "ready"
  | "deepening"
  | "faint";

type Item = {
  partnerId: string;
  alias: string;
  worldType: string | null;
  worldTitle: string | null;
  hue: string | null;
  isHuman: boolean;
  stage: Stage;
  stageLabel: string;
  summary: string[];
  typesCount: number;
  lastAt: string | null;
};

export function ConnectListClient({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/connect/list?u=${userId}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) throw new Error(j.error || "오류");
        setItems(j.items);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "오류");
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const grouped = (s: Stage) => items?.filter((i) => i.stage === s) ?? [];

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <section className="pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">
          CONNECT · 연결
        </p>
        <h1 className="serif mt-4 text-3xl leading-tight text-nadip-glow">
          겹쳐온 시간 속에서
          <br />
          깊어진 사람들.
        </h1>
        <p className="mt-3 text-xs leading-relaxed text-ink-100/55">
          편지·천리안·공명·듀엣·우연이 충분히 겹친 사람과만 연결을 제안할 수 있어요.
          <br />
          연결은 양쪽 모두 동의해야 시작되고 — 언제든 해제·차단할 수 있습니다.
        </p>
      </section>

      {err && <p className="mt-6 text-sm text-nadip-rose">{err}</p>}

      {items === null ? (
        <p className="mt-8 text-sm text-ink-100/45">불러오는 중…</p>
      ) : items.length === 0 ? (
        <section className="mt-12 rounded-3xl border border-dashed border-ink-100/15 bg-black/20 p-8 text-center">
          <p className="serif text-base text-nadip-glow">아직 깊어진 사람이 없어요.</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-100/55">
            편지·미러·합주·공중·듀엣·우연을 천천히 쌓아가다 보면
            <br />
            어느 날 자연스럽게 이곳에 누군가가 나타날 거예요.
          </p>
        </section>
      ) : (
        <>
          {grouped("proposed_to_me").length > 0 && (
            <Group title="✦ 연결 제안이 도착했어요" tone="rose">
              {grouped("proposed_to_me").map((it) => (
                <Card key={it.partnerId} it={it} userId={userId} />
              ))}
            </Group>
          )}

          {grouped("connected").length > 0 && (
            <Group title="✦ 연결된 사람" tone="gold">
              {grouped("connected").map((it) => (
                <Card key={it.partnerId} it={it} userId={userId} />
              ))}
            </Group>
          )}

          {grouped("ready").length > 0 && (
            <Group title="충분히 깊어진 사람" tone="gold">
              {grouped("ready").map((it) => (
                <Card key={it.partnerId} it={it} userId={userId} />
              ))}
            </Group>
          )}

          {grouped("proposed_by_me").length > 0 && (
            <Group title="내가 제안한 연결 (답을 기다리는 중)" tone="gold">
              {grouped("proposed_by_me").map((it) => (
                <Card key={it.partnerId} it={it} userId={userId} />
              ))}
            </Group>
          )}

          {grouped("deepening").length > 0 && (
            <Group title="깊어지는 중" tone="dim">
              {grouped("deepening").map((it) => (
                <Card key={it.partnerId} it={it} userId={userId} />
              ))}
            </Group>
          )}

          {(grouped("disconnected").length > 0 ||
            grouped("declined").length > 0 ||
            grouped("blocked").length > 0) && (
            <Group title="머무른 시간" tone="dim">
              {[...grouped("declined"), ...grouped("disconnected"), ...grouped("blocked")].map(
                (it) => (
                  <Card key={it.partnerId} it={it} userId={userId} />
                )
              )}
            </Group>
          )}
        </>
      )}

      <p className="mt-16 text-center text-[10px] tracking-[0.45em] text-ink-100/30">
        인연은 — 우연이 천천히 쌓인 결이에요
      </p>
    </main>
  );
}

function Group({
  title,
  tone,
  children
}: {
  title: string;
  tone: "rose" | "gold" | "dim";
  children: React.ReactNode;
}) {
  const c =
    tone === "rose"
      ? "text-nadip-rose"
      : tone === "gold"
      ? "text-nadip-gold"
      : "text-ink-100/55";
  return (
    <section className="mt-10">
      <p className={`serif text-xs tracking-[0.4em] ${c}`}>{title}</p>
      <AnimatePresence initial={false}>
        <div className="mt-4 space-y-3">{children}</div>
      </AnimatePresence>
    </section>
  );
}

function Card({ it, userId }: { it: Item; userId: string }) {
  const dimmed = it.stage === "disconnected" || it.stage === "declined" || it.stage === "blocked";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dimmed ? 0.55 : 1, y: 0 }}
    >
      <Link
        href={`/meet/connect/${it.partnerId}?u=${userId}`}
        className="block rounded-2xl border border-nadip-gold/25 bg-black/30 px-5 py-4 transition hover:border-nadip-gold/50"
        style={it.hue ? { borderLeft: `2px solid ${it.hue}` } : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.3em]">
              {it.worldTitle && (
                <span style={{ color: it.hue ?? undefined }}>{it.worldTitle}</span>
              )}
              <span className="text-ink-100/40">·</span>
              <span className="text-ink-100/55">{it.stageLabel}</span>
            </div>
            <p className="serif mt-1 truncate text-base text-nadip-glow">{it.alias}</p>
            {it.summary.length > 0 && (
              <p className="mt-1 truncate text-[11px] tracking-widest text-ink-100/45">
                {it.summary.slice(0, 4).join(" · ")}
              </p>
            )}
          </div>
          <span className="shrink-0 text-[10px] tracking-widest text-ink-100/40">자세히 →</span>
        </div>
      </Link>
    </motion.div>
  );
}
