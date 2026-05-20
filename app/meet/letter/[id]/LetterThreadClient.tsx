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
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">LETTER</p>
        <Link
          href={`/meet/letter?u=${userId}`}
          className="text-xs tracking-widest text-ink-100/45 hover:text-nadip-glow"
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
            <section className="mt-6 rounded-2xl border border-nadip-gold/25 bg-black/30 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] tracking-widest text-ink-100/55">
                  편지 상대 — <span className="text-nadip-glow">{data.thread.partnerAlias ?? "익명"}</span>
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
                      ? "rounded-3xl border border-nadip-gold/30 bg-nadip-gold/5 px-6 py-5"
                      : "rounded-3xl border border-nadip-rose/25 bg-black/30 px-6 py-5"
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
                    <InTransitPlaceholder arrivesAt={l.arrivesAt} createdAt={l.createdAt} />
                  ) : (
                    <>
                      {l.text && <LetterBody text={l.text} />}
                      {l.inTransit && l.senderIsMe && l.arrivesAt && (
                        <div className="mt-3 rounded-xl border border-nadip-gold/30 bg-black/20 px-4 py-3">
                          <p className="text-[10px] tracking-widest text-nadip-gold/80">
                            ✦ 비행 중 — 상대에게 도착하기 전이에요
                          </p>
                          <FlightTrack createdAt={l.createdAt} arrivesAt={l.arrivesAt} />
                        </div>
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
                <div className="rounded-3xl border border-nadip-gold/40 bg-gradient-to-br from-nadip-gold/10 to-nadip-deep/40 p-6">
                  <p className="serif text-xs tracking-[0.4em] text-nadip-gold">내 답장</p>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, 400))}
                    placeholder="300~400자. 마음에 결을 담아주세요."
                    rows={8}
                    className="mt-3 w-full resize-none rounded-xl border border-nadip-gold/20 bg-transparent px-4 py-3 text-[15px] leading-[1.85] text-nadip-glow placeholder:text-ink-100/30 outline-none focus:border-nadip-gold"
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
                      className="rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-7 py-2 text-xs tracking-[0.3em] text-nadip-night hover:opacity-90 disabled:opacity-50"
                    >
                      {sending ? "보내는 중…" : "흘려보내기"}
                    </button>
                  </div>
                  {err && <p className="mt-2 text-[11px] text-nadip-rose">{err}</p>}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-ink-100/15 bg-black/20 px-6 py-8 text-center">
                  <p className="serif text-base text-nadip-glow">상대의 답을 기다리는 중…</p>
                  <p className="mt-2 text-xs text-ink-100/55">
                    하루에 한 번 — 답장은 천천히 도착해요. (30초마다 확인 중)
                  </p>
                </div>
              )}

              <button
                onClick={drop}
                disabled={dropping}
                className="mt-4 text-[11px] tracking-widest text-ink-100/45 underline hover:text-nadip-rose disabled:opacity-40"
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
          className="serif whitespace-pre-wrap text-[15px] leading-[1.95] text-nadip-glow"
        >
          {p.trim()}
        </p>
      ))}
    </div>
  );
}

function InTransitPlaceholder({
  arrivesAt,
  createdAt
}: {
  arrivesAt: string | null;
  createdAt: string;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-nadip-gold/30 bg-black/20 px-5 py-6 text-center">
      <p className="serif text-base text-nadip-glow">✦ 비행 중인 편지</p>
      <p className="mt-2 text-[11px] tracking-widest text-ink-100/35">
        종이비행기가 — 둘 사이의 거리만큼 천천히 날아오고 있어요.
      </p>
      <FlightTrack createdAt={createdAt} arrivesAt={arrivesAt} />
    </div>
  );
}

/** 출발-도착 사이 비행 진행도를 종이비행기 SVG로 시각화. 1초마다 위치 업데이트 */
function FlightTrack({
  createdAt,
  arrivesAt
}: {
  createdAt: string;
  arrivesAt: string | null;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const start = Date.parse(createdAt);
  const end = arrivesAt ? Date.parse(arrivesAt) : start;
  const span = Math.max(1, end - start);
  const now = Date.now();
  const progress = Math.max(0, Math.min(1, (now - start) / span));

  const remainingMs = Math.max(0, end - now);
  const remainingLabel = formatRemaining(arrivesAt ?? new Date().toISOString());

  // 320 wide track, plane in middle
  const trackWidth = 280;
  const planeX = 10 + progress * trackWidth;

  return (
    <div className="mt-4">
      <svg viewBox="0 0 300 50" className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* 점선 궤적 */}
        <line
          x1="10"
          y1="35"
          x2="290"
          y2="35"
          stroke="rgba(212,175,111,0.35)"
          strokeWidth="0.6"
          strokeDasharray="2 3"
        />
        {/* 출발 */}
        <circle cx="10" cy="35" r="3" fill="#d4af6f" />
        <text x="10" y="48" textAnchor="middle" fontSize="6" fill="rgba(245,230,200,0.5)">
          출발
        </text>
        {/* 도착 */}
        <circle cx="290" cy="35" r="3" fill={remainingMs <= 0 ? "#d4af6f" : "rgba(245,230,200,0.4)"} />
        <text x="290" y="48" textAnchor="middle" fontSize="6" fill="rgba(245,230,200,0.5)">
          도착
        </text>
        {/* 종이비행기 — 진행 위치 */}
        <g transform={`translate(${planeX} 30) rotate(8)`}>
          <path
            d="M -6 0 L 6 -3 L -2 0 L 6 3 Z"
            fill="#f5e6c8"
            stroke="#d4af6f"
            strokeWidth="0.5"
          />
        </g>
        {/* 진행 텍스트 */}
        <text x="150" y="14" textAnchor="middle" fontSize="8" fill="#d4af6f" fontWeight="bold">
          {Math.round(progress * 100)}%
        </text>
        <text x="150" y="24" textAnchor="middle" fontSize="6" fill="rgba(245,230,200,0.6)">
          {remainingMs <= 0 ? "도착함" : `${remainingLabel} 후 도착`}
        </text>
      </svg>
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
