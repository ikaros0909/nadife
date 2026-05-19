"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PersonalNav } from "@/components/PersonalNav";
import { SightTrigger } from "@/components/SightTrigger";
import { AiPolishButton } from "@/components/AiPolishButton";
import { formatLetterText } from "@/lib/letter-format";

type Letter = {
  id: string;
  senderIsMe: boolean;
  alias: string;
  text: string | null; // null = in transit (recipient view)
  createdAt: string;
  arrivesAt: string | null;
  inTransit: boolean;
};

type ThreadState = {
  thread: {
    id: string;
    status: string;
    letterCount: number;
    archivedAt?: string;
    unlimited?: boolean;
    partnerId: string | null;
    partnerAlias: string | null;
  };
  myTurn: boolean;
  letters: Letter[];
};

export function LetterThreadClient({ userId, threadId }: { userId: string; threadId: string }) {
  const [data, setData] = useState<ThreadState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [dropping, setDropping] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/letter/thread/${threadId}?u=${userId}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setData(j);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    }
  }, [threadId, userId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000); // 30초마다 새 답장 확인
    return () => clearInterval(t);
  }, [load]);

  async function reply() {
    if (!draft.trim() || draft.length < 20) {
      setErr("최소 20자 이상 — 마음을 담아주세요.");
      return;
    }
    setSending(true);
    setErr(null);
    try {
      const r = await fetch("/api/letter/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ senderId: userId, threadId, text: draft.trim() })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setDraft("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSending(false);
    }
  }

  async function drop() {
    if (!confirm("이 편지함을 닫으시겠어요? 더 이상 답장은 오갈 수 없어요.")) return;
    setDropping(true);
    try {
      const r = await fetch("/api/letter/drop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, threadId })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setDropping(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <header className="flex items-center justify-between pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">LETTER</p>
        <Link
          href={`/meet/letter?u=${userId}`}
          className="text-xs tracking-widest text-ink-100/45 hover:text-nadi-glow"
        >
          ← 편지함
        </Link>
      </header>

      {!data ? (
        <p className="mt-10 text-sm text-ink-100/45">불러오는 중…</p>
      ) : (
        <>
          <p className="mt-8 text-[10px] tracking-widest text-ink-100/40">
            {data.thread.letterCount}/10 · {data.thread.status === "ACTIVE" ? "진행 중" : data.thread.status === "ARCHIVED" ? "10통으로 마무리됨" : "그만둠"}
          </p>

          {data.thread.partnerId && (
            <section className="mt-6 rounded-2xl border border-nadi-gold/25 bg-black/30 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] tracking-widest text-ink-100/55">
                  편지 상대 — <span className="text-nadi-glow">{data.thread.partnerAlias ?? "익명"}</span>
                </div>
                <SightTrigger
                  viewerId={userId}
                  targetId={data.thread.partnerId}
                  showLetterInvite={false}
                  source="letter"
                />
              </div>
            </section>
          )}

          <section className="mt-6 space-y-4">
            <AnimatePresence initial={false}>
              {data.letters.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.03 }}
                  className={
                    l.senderIsMe
                      ? "rounded-3xl border border-nadi-gold/30 bg-nadi-gold/5 px-6 py-5"
                      : "rounded-3xl border border-nadi-rose/25 bg-black/30 px-6 py-5"
                  }
                >
                  <div className="flex items-center justify-between text-[10px] tracking-widest text-ink-100/45">
                    <span>
                      {l.senderIsMe ? `나 (${l.alias})` : l.alias}
                    </span>
                    <span>
                      {new Date(l.createdAt).toLocaleString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>

                  {l.inTransit && !l.senderIsMe ? (
                    <InTransitPlaceholder arrivesAt={l.arrivesAt} />
                  ) : (
                    <>
                      {l.text && <LetterBody text={l.text} />}
                      {l.inTransit && l.senderIsMe && l.arrivesAt && (
                        <p className="mt-3 text-[10px] tracking-widest text-nadi-gold/70">
                          ✦ 비행 중 — {formatRemaining(l.arrivesAt)} 후 도착
                        </p>
                      )}
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </section>

          {data.thread.status === "ACTIVE" && (
            <section className="mt-10">
              {data.myTurn ? (
                <div className="rounded-3xl border border-nadi-gold/40 bg-gradient-to-br from-nadi-gold/10 to-nadi-deep/40 p-6">
                  <p className="serif text-xs tracking-[0.4em] text-nadi-gold">내 답장</p>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, 400))}
                    placeholder="300~400자. 마음에 결을 담아주세요."
                    rows={8}
                    className="mt-3 w-full resize-none rounded-xl border border-nadi-gold/20 bg-transparent px-4 py-3 text-[15px] leading-[1.85] text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold"
                  />
                  <div className="mt-3">
                    <AiPolishButton
                      kind="letter-reply"
                      current={draft}
                      onPolished={(t) => setDraft(t.slice(0, 400))}
                      context={
                        data.letters
                          .filter((l) => !l.senderIsMe)
                          .slice(-1)[0]?.text ?? null
                      }
                      minHint="몇 줄만 적어주세요. AI가 다듬어 줄게요."
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] tracking-widest text-ink-100/40">
                      {draft.length}/400 · 최소 20자
                    </span>
                    <button
                      onClick={reply}
                      disabled={sending || draft.length < 20}
                      className="rounded-full bg-gradient-to-r from-nadi-gold to-nadi-rose px-7 py-2 text-xs tracking-[0.3em] text-nadi-night hover:opacity-90 disabled:opacity-50"
                    >
                      {sending ? "보내는 중…" : "흘려보내기"}
                    </button>
                  </div>
                  {err && <p className="mt-2 text-[11px] text-nadi-rose">{err}</p>}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-ink-100/15 bg-black/20 px-6 py-8 text-center">
                  <p className="serif text-base text-nadi-glow">상대의 답을 기다리는 중…</p>
                  <p className="mt-2 text-xs text-ink-100/55">
                    하루에 한 번 — 답장은 천천히 도착해요. (30초마다 확인 중)
                  </p>
                </div>
              )}

              <button
                onClick={drop}
                disabled={dropping}
                className="mt-4 text-[11px] tracking-widest text-ink-100/45 underline hover:text-nadi-rose disabled:opacity-40"
              >
                이 편지함을 그만 닫기
              </button>
            </section>
          )}

          {data.thread.status !== "ACTIVE" && (
            <p className="mt-10 text-center text-[11px] tracking-widest text-ink-100/45">
              이 편지함은 닫혀 있어요. — 다음 사람을 찾아보세요.
            </p>
          )}
        </>
      )}
    </main>
  );
}

function LetterBody({ text }: { text: string }) {
  const formatted = formatLetterText(text);
  const paragraphs = formatted.split(/\n\s*\n/);
  return (
    <div className="mt-3 space-y-4">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="serif whitespace-pre-wrap text-[15px] leading-[1.95] text-nadi-glow"
        >
          {p.trim()}
        </p>
      ))}
    </div>
  );
}

function InTransitPlaceholder({ arrivesAt }: { arrivesAt: string | null }) {
  const remaining = arrivesAt ? formatRemaining(arrivesAt) : "곧";
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-nadi-gold/30 bg-black/20 px-5 py-6 text-center">
      <p className="serif text-base text-nadi-glow">✦ 비행 중인 편지</p>
      <p className="mt-2 text-[11px] tracking-widest text-ink-100/55">
        {remaining} 후 도착
      </p>
      <p className="mt-2 text-[10px] tracking-widest text-ink-100/35">
        종이비행기가 — 둘 사이의 거리만큼 천천히 날아오고 있어요.
      </p>
    </div>
  );
}

function formatRemaining(iso: string): string {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "곧";
  const totalMin = Math.round(ms / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}일`);
  if (hours > 0) parts.push(`${hours}시간`);
  if (mins > 0 && days === 0) parts.push(`${mins}분`);
  return parts.join(" ") || "곧";
}
