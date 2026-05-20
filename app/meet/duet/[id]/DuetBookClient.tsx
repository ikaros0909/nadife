"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PersonalNav } from "@/components/PersonalNav";
import { AiPolishButton } from "@/components/AiPolishButton";

type Line = {
  id: string;
  themeIdx: number;
  isMine: boolean;
  alias: string;
  text: string;
  createdAt: string;
};

type BookState = {
  book: { id: string; status: string; themes: string[]; completedAt?: string };
  partnerId: string;
  lines: Line[];
};

export function DuetBookClient({ userId, bookId }: { userId: string; bookId: string }) {
  const [data, setData] = useState<BookState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/duet/book/${bookId}?u=${userId}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setData(j);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    }
  }, [bookId, userId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function submit(themeIdx: number) {
    const text = drafts[themeIdx]?.trim();
    if (!text || text.length < 1) return;
    setSubmitting(themeIdx);
    setErr(null);
    try {
      const r = await fetch("/api/duet/line", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, bookId, themeIdx, text })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setDrafts({ ...drafts, [themeIdx]: "" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSubmitting(null);
    }
  }

  if (!data) {
    return (
      <main className="relative z-10 mx-auto max-w-2xl px-6 pb-20">
        <PersonalNav userId={userId} current="meet" />
        <p className="mt-10 text-sm text-ink-100/45">불러오는 중…</p>
      </main>
    );
  }

  const grouped = new Map<number, { mine?: Line; theirs?: Line }>();
  for (let i = 0; i < data.book.themes.length; i++) grouped.set(i, {});
  for (const l of data.lines) {
    const slot = grouped.get(l.themeIdx)!;
    if (l.isMine) slot.mine = l;
    else slot.theirs = l;
  }

  const total = data.book.themes.length * 2;
  const filled = data.lines.length;

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <header className="flex items-center justify-between pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">DUET</p>
        <Link
          href={`/meet/duet?u=${userId}`}
          className="text-xs tracking-widest text-ink-100/45 hover:text-nadip-glow"
        >
          ← 듀엣 목록
        </Link>
      </header>

      <p className="mt-8 text-[10px] tracking-widest text-ink-100/45">
        {filled}/{total} 줄 · {data.book.status === "COMPLETE" ? "완성된 책" : "쓰는 중"}
      </p>

      <section className="mt-6 space-y-6">
        {data.book.themes.map((theme, idx) => {
          const slot = grouped.get(idx)!;
          const canWrite = !slot.mine && data.book.status === "OPEN";
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-3xl border border-nadip-gold/25 bg-black/30 p-6"
            >
              <div className="flex items-center justify-between">
                <p className="serif text-[10px] tracking-[0.4em] text-nadip-gold">
                  {String(idx + 1).padStart(2, "0")} · {theme}
                </p>
                <span className="text-[10px] tracking-widest text-ink-100/40">
                  {(slot.mine ? 1 : 0) + (slot.theirs ? 1 : 0)}/2
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {/* 내 줄 */}
                {slot.mine ? (
                  <div className="rounded-2xl border border-nadip-gold/30 bg-nadip-gold/10 px-4 py-3">
                    <p className="text-[10px] tracking-widest text-nadip-gold">나</p>
                    <p className="serif mt-1 text-sm leading-relaxed text-nadip-glow">
                      {slot.mine.text}
                    </p>
                  </div>
                ) : canWrite ? (
                  <div className="rounded-2xl border border-nadip-gold/30 bg-nadip-gold/5 px-4 py-3">
                    <textarea
                      value={drafts[idx] ?? ""}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [idx]: e.target.value.slice(0, 200) })
                      }
                      placeholder="한 줄 (~200자)"
                      rows={3}
                      className="w-full resize-none bg-transparent text-sm text-nadip-glow placeholder:text-ink-100/30 outline-none"
                    />
                    <div className="mt-2">
                      <AiPolishButton
                        kind="duet-line"
                        current={drafts[idx] ?? ""}
                        onPolished={(t) =>
                          setDrafts({ ...drafts, [idx]: t.slice(0, 200) })
                        }
                        context={`시제(時題): ${theme}${slot.theirs ? `\n상대의 한 줄: ${slot.theirs.text}` : ""}`}
                        size="sm"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] tracking-widest text-ink-100/40">
                        {(drafts[idx] ?? "").length}/200
                      </span>
                      <button
                        onClick={() => submit(idx)}
                        disabled={submitting === idx || !(drafts[idx] ?? "").trim()}
                        className="rounded-full bg-nadip-gold/20 px-4 py-1 text-[11px] tracking-widest text-nadip-glow ring-1 ring-nadip-gold/40 hover:bg-nadip-gold/30 disabled:opacity-50"
                      >
                        {submitting === idx ? "…" : "한 줄"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-ink-100/15 bg-black/20 px-4 py-3 text-center text-[11px] text-ink-100/45">
                    —
                  </div>
                )}

                {/* 상대 줄 */}
                {slot.theirs ? (
                  <div className="rounded-2xl border border-nadip-rose/25 bg-black/30 px-4 py-3">
                    <p className="text-[10px] tracking-widest text-nadip-rose">{slot.theirs.alias}</p>
                    <p className="serif mt-1 text-sm leading-relaxed text-nadip-glow">
                      {slot.theirs.text}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-ink-100/15 bg-black/20 px-4 py-3 text-center text-[11px] text-ink-100/45">
                    상대를 기다리는 중…
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </section>

      {err && <p className="mt-6 text-sm text-nadip-rose">{err}</p>}

      {data.book.status === "COMPLETE" && (
        <p className="mt-10 text-center text-[11px] tracking-[0.4em] text-nadip-gold">
          ✦ 한 권의 책이 완성되었어요.
        </p>
      )}
    </main>
  );
}
