"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PersonalNav } from "@/components/PersonalNav";
import { SightTrigger } from "@/components/SightTrigger";
import { AiPolishButton } from "@/components/AiPolishButton";

type Drop = {
  id: string;
  authorId: string;
  alias: string;
  text: string;
  replyCount: number;
  iReplied: boolean;
  createdAt: string;
};

type Reply = {
  id: string;
  replierId: string;
  alias: string;
  text: string;
  createdAt: string;
  isStarred: boolean;
};

type MyDrop = {
  id: string;
  text: string;
  alias: string;
  starredReplyId: string | null;
  replies: Reply[];
};

type FeedState = {
  weekKey: string;
  drops: Drop[];
  myDrop: MyDrop | null;
  iWasStarred: boolean;
};

export function PostboxClient({ userId }: { userId: string }) {
  const [feed, setFeed] = useState<FeedState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/postbox/feed?u=${userId}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setFeed(j);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    }
  }, [userId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function drop() {
    if (draft.length < 2) return setErr("한 줄 — 최소 2자.");
    setSubmitting(true);
    setErr(null);
    try {
      const r = await fetch("/api/postbox/drop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, text: draft.trim() })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setDraft("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSubmitting(false);
    }
  }

  async function reply(postboxId: string) {
    const text = (replyDraft[postboxId] ?? "").trim();
    if (text.length < 2) return;
    setReplying(postboxId);
    setErr(null);
    try {
      const r = await fetch("/api/postbox/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, postboxId, text })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setReplyDraft({ ...replyDraft, [postboxId]: "" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setReplying(null);
    }
  }

  async function star(replyId: string) {
    if (!feed?.myDrop) return;
    try {
      const r = await fetch("/api/postbox/star", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, postboxId: feed.myDrop.id, replyId })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    }
  }

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <section className="pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">
          POSTBOX · 공중 한 줄
        </p>
        <h1 className="serif mt-4 text-3xl leading-tight text-nadip-glow">
          일주일에 한 번.
          <br />
          공중에 띄우는 한 줄.
        </h1>
        <p className="mt-3 text-xs text-ink-100/55">
          누군가에게 닿을 수도, 안 닿을 수도 — 익명 답신이 도착해요. 그중 단 한 명에게만 별표.
        </p>
        {feed?.iWasStarred && (
          <p className="mt-3 text-sm text-nadip-gold">✦ 이번 주, 누군가가 당신의 답신에 별표했어요.</p>
        )}
      </section>

      {/* 내 글 */}
      <section className="mt-10">
        {!feed ? (
          <p className="text-sm text-ink-100/45">불러오는 중…</p>
        ) : feed.myDrop ? (
          <MyDropPanel myDrop={feed.myDrop} onStar={star} userId={userId} />
        ) : (
          <div className="rounded-3xl border border-nadip-gold/40 bg-gradient-to-br from-nadip-gold/10 to-nadip-rose/10 p-6">
            <p className="serif text-xs tracking-[0.4em] text-nadip-gold">이번 주의 한 줄</p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 200))}
              placeholder="200자 — 누구에게도 보내지 않는 듯, 모두에게 보내는 한 줄."
              rows={3}
              className="mt-3 w-full resize-none rounded-xl border border-nadip-gold/20 bg-transparent px-4 py-3 text-sm text-nadip-glow placeholder:text-ink-100/30 outline-none focus:border-nadip-gold"
            />
            <div className="mt-3">
              <AiPolishButton
                kind="postbox-drop"
                current={draft}
                onPolished={(t) => setDraft(t.slice(0, 200))}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] tracking-widest text-ink-100/40">
                {draft.length}/200 · 일주일에 1회
              </span>
              <button
                onClick={drop}
                disabled={submitting || draft.length < 2}
                className="rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-7 py-2 text-xs tracking-[0.3em] text-nadip-night hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "띄우는 중…" : "✦ 띄우기"}
              </button>
            </div>
            {err && <p className="mt-2 text-[11px] text-nadip-rose">{err}</p>}
          </div>
        )}
      </section>

      {/* 공중의 한 줄들 */}
      <section className="mt-12">
        <p className="serif text-xs tracking-[0.4em] text-nadip-gold">공중에 떠도는 한 줄</p>
        <div className="mt-4 space-y-3">
          {feed?.drops.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-100/15 bg-black/20 p-6 text-center text-xs text-ink-100/45">
              이번 주, 아직 떠도는 한 줄이 없어요.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {feed?.drops.map((d) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-ink-100/10 bg-black/30 px-5 py-4"
                >
                  <div className="flex items-center justify-between text-[10px] tracking-widest text-ink-100/45">
                    <span>{d.alias}</span>
                    <span>{d.replyCount}개 답신</span>
                  </div>
                  <p className="serif mt-2 text-base leading-relaxed text-nadip-glow">
                    “{d.text}”
                  </p>
                  <div className="mt-3">
                    <SightTrigger viewerId={userId} targetId={d.authorId} size="xs" source="postbox" />
                  </div>
                  {d.iReplied ? (
                    <p className="mt-3 text-[10px] tracking-widest text-ink-100/45">
                      이미 답신을 보냈어요.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={replyDraft[d.id] ?? ""}
                          onChange={(e) =>
                            setReplyDraft({ ...replyDraft, [d.id]: e.target.value.slice(0, 200) })
                          }
                          placeholder="익명 답신 한 줄"
                          className="flex-1 rounded-xl border border-ink-100/15 bg-transparent px-3 py-2 text-xs text-nadip-glow placeholder:text-ink-100/30 outline-none focus:border-nadip-gold/50"
                        />
                        <button
                          onClick={() => reply(d.id)}
                          disabled={replying === d.id || (replyDraft[d.id] ?? "").length < 2}
                          className="rounded-xl border border-nadip-gold/40 bg-nadip-gold/10 px-3 text-[11px] tracking-widest text-nadip-glow hover:bg-nadip-gold/20 disabled:opacity-50"
                        >
                          {replying === d.id ? "…" : "답신"}
                        </button>
                      </div>
                      <AiPolishButton
                        kind="postbox-reply"
                        current={replyDraft[d.id] ?? ""}
                        onPolished={(t) =>
                          setReplyDraft({ ...replyDraft, [d.id]: t.slice(0, 200) })
                        }
                        context={d.text}
                        size="sm"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </section>
    </main>
  );
}

function MyDropPanel({
  myDrop,
  onStar,
  userId
}: {
  myDrop: MyDrop;
  onStar: (replyId: string) => void;
  userId: string;
}) {
  return (
    <div className="rounded-3xl border border-nadip-gold/40 bg-gradient-to-br from-nadip-gold/5 to-nadip-deep/40 p-6">
      <p className="serif text-xs tracking-[0.4em] text-nadip-gold">나의 한 줄</p>
      <p className="serif mt-3 text-base leading-relaxed text-nadip-glow">“{myDrop.text}”</p>

      <div className="mt-6">
        <p className="text-[10px] tracking-widest text-ink-100/45">
          도착한 답신 {myDrop.replies.length}개{myDrop.starredReplyId && " · 별표 완료"}
        </p>
        <div className="mt-3 space-y-2">
          {myDrop.replies.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-100/15 bg-black/20 p-4 text-center text-[11px] text-ink-100/45">
              아직 답신이 없어요. 천천히 기다려보세요.
            </p>
          ) : (
            myDrop.replies.map((r) => (
              <div
                key={r.id}
                className={
                  r.isStarred
                    ? "rounded-xl border border-nadip-gold/60 bg-nadip-gold/15 px-4 py-3"
                    : "rounded-xl border border-ink-100/10 bg-black/30 px-4 py-3"
                }
              >
                <div className="flex items-center justify-between text-[10px] tracking-widest text-ink-100/45">
                  <span>{r.alias}</span>
                  {r.isStarred ? (
                    <span className="text-nadip-gold">✦ 별표한 답신</span>
                  ) : !myDrop.starredReplyId ? (
                    <button
                      onClick={() => onStar(r.id)}
                      className="text-nadip-gold hover:text-nadip-glow"
                    >
                      별표
                    </button>
                  ) : null}
                </div>
                <p className="serif mt-1 text-sm leading-relaxed text-nadip-glow">
                  “{r.text}”
                </p>
                <div className="mt-2">
                  <SightTrigger viewerId={userId} targetId={r.replierId} size="xs" source="postbox" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
