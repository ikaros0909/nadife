"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PersonalNav } from "@/components/PersonalNav";
import { SightTrigger } from "@/components/SightTrigger";
import { AiPolishButton } from "@/components/AiPolishButton";
import { getWorldType } from "@/lib/world-map";

type Note = {
  id: string;
  userId: string;
  text: string;
  alias: string;
  worldType: string;
  mood: string;
  echoCount: number;
  echoed?: boolean;
  createdAt: string;
};

type Feed = {
  date: string;
  todayMood: string | null;
  todayWorld: string | null;
  myNote: Note | null;
  canEcho: boolean;
  myEchoCount: number;
  notes: Note[];
  error?: string;
};

export function ResonanceClient({ userId }: { userId: string }) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [echoLoading, setEchoLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/resonance/feed?u=${userId}`, { cache: "no-store" });
      const j: Feed = await r.json();
      if (!r.ok) throw new Error(j.error || "피드 오류");
      setFeed(j);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitNote() {
    if (!draft.trim()) return;
    setSending(true);
    setErr(null);
    try {
      const r = await fetch("/api/resonance/note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, text: draft.trim() })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "보낼 수 없어요.");
      setDraft("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSending(false);
    }
  }

  async function echo(noteId: string) {
    if (!feed?.canEcho) return;
    setEchoLoading(noteId);
    try {
      const r = await fetch("/api/resonance/echo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, noteId })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "공명할 수 없어요.");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setEchoLoading(null);
    }
  }

  if (loading) {
    return (
      <main className="relative z-10 mx-auto max-w-2xl px-6 pb-20">
        <PersonalNav userId={userId} current="meet" />
        <p className="mt-10 text-sm text-ink-100/50">오늘의 합주를 모으는 중…</p>
      </main>
    );
  }

  if (!feed?.todayMood) {
    return (
      <main className="relative z-10 mx-auto max-w-2xl px-6 pb-20">
        <PersonalNav userId={userId} current="meet" />
        <section className="mt-10 rounded-3xl border border-dashed border-ink-100/15 bg-black/20 p-10 text-center">
          <h1 className="serif text-2xl text-nadip-glow">
            먼저 오늘의 컨디션을 정해주세요.
          </h1>
          <p className="mt-3 text-sm text-ink-100/60">
            오늘 어떤 박자인지 알아야 같은 박자의 사람들을 모을 수 있어요.
          </p>
          <Link
            href={`/today?u=${userId}`}
            className="mt-6 inline-flex rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-7 py-3 text-xs tracking-[0.3em] text-nadip-night hover:opacity-90"
          >
            오늘의 페르소나 +
          </Link>
        </section>
      </main>
    );
  }

  const myWorld = feed.todayWorld ? getWorldType(feed.todayWorld) : null;

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <section className="pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">
          RESONANCE · 오늘 합주
        </p>
        <h1 className="serif mt-4 text-3xl leading-tight text-nadip-glow">
          오늘 {myWorld && <span style={{ color: myWorld.hue }}>{feed.todayMood}</span>}의
          <br />
          박자로 사는 사람들
        </h1>
        <p className="mt-3 text-xs text-ink-100/55">
          댓글도 메시지도 없어요. 한 줄 보내고, 가장 와닿는 글에 공명 한 번.
        </p>
      </section>

      {/* 내 한 줄 */}
      <section className="mt-10">
        {feed.myNote ? (
          <div
            className="rounded-3xl border border-nadip-gold/40 bg-nadip-gold/5 px-6 py-5"
            style={{ borderLeft: myWorld ? `2px solid ${myWorld.hue}` : undefined }}
          >
            <div className="flex items-center justify-between text-[10px] tracking-widest text-nadip-gold">
              <span>나의 한 줄 · {feed.myNote.alias}</span>
              <span className="text-nadip-rose">공명 {feed.myNote.echoCount}</span>
            </div>
            <p className="serif mt-3 text-lg leading-snug text-nadip-glow">
              “{feed.myNote.text}”
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-nadip-gold/30 bg-nadip-gold/5 p-5">
            <p className="text-[10px] tracking-widest text-nadip-gold">오늘의 한 줄</p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 140))}
              placeholder="140자 — 오늘의 결을 한 줄로 흘려보내세요"
              rows={3}
              className="mt-3 w-full resize-none rounded-xl border border-nadip-gold/20 bg-transparent px-4 py-3 text-sm text-nadip-glow placeholder:text-ink-100/30 outline-none focus:border-nadip-gold"
            />
            <div className="mt-3">
              <AiPolishButton
                kind="resonance-note"
                current={draft}
                onPolished={(t) => setDraft(t.slice(0, 140))}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] tracking-widest text-ink-100/40">
                {draft.length}/140
              </span>
              <button
                onClick={submitNote}
                disabled={sending || !draft.trim()}
                className="rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-6 py-2 text-xs tracking-[0.3em] text-nadip-night hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "흘려보내는 중…" : "흘려보내기"}
              </button>
            </div>
            {err && <p className="mt-2 text-[11px] text-nadip-rose">{err}</p>}
          </div>
        )}
      </section>

      {/* 같은 박자 피드 */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <p className="serif text-xs tracking-[0.4em] text-nadip-gold">같은 박자</p>
          <span className="text-[10px] tracking-widest text-ink-100/45">
            {feed.canEcho ? "공명 1번 남음" : "오늘 공명 사용됨"}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {feed.notes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-100/15 bg-black/20 p-6 text-center text-xs text-ink-100/45">
              아직 다른 한 줄이 닿지 않았어요.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {feed.notes.map((n) => {
                const w = getWorldType(n.worldType);
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-2xl border border-ink-100/10 bg-black/30 px-5 py-4"
                    style={{ borderLeft: `2px solid ${w.hue}` }}
                  >
                    <div className="flex items-center justify-between text-[10px] tracking-widest text-ink-100/45">
                      <span>{n.alias}</span>
                      <span style={{ color: w.hue }}>{w.title}</span>
                    </div>
                    <p className="serif mt-2 text-base leading-relaxed text-nadip-glow">
                      “{n.text}”
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] tracking-widest text-ink-100/40">
                        공명 {n.echoCount}
                      </span>
                      <div className="flex items-center gap-2">
                        <SightTrigger viewerId={userId} targetId={n.userId} size="xs" source="resonance" />
                        <button
                          onClick={() => echo(n.id)}
                          disabled={
                            !feed.canEcho || n.echoed || echoLoading === n.id
                          }
                          className={
                            n.echoed
                              ? "rounded-full border border-nadip-gold/60 bg-nadip-gold/15 px-4 py-1 text-[11px] tracking-[0.25em] text-nadip-glow"
                              : "rounded-full border border-ink-100/15 px-4 py-1 text-[11px] tracking-[0.25em] text-ink-100/65 hover:border-nadip-gold/40 hover:text-nadip-glow disabled:opacity-40"
                          }
                        >
                          {n.echoed ? "✦ 공명함" : echoLoading === n.id ? "…" : "공명하기"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </section>

      <p className="mt-16 text-center text-[10px] tracking-[0.45em] text-ink-100/30">
        말하지 않아도, 같은 박자로 살고 있다는 사실
      </p>
    </main>
  );
}
