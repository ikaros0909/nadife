"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PersonalNav } from "@/components/PersonalNav";

type ThreadItem = {
  id: string;
  status: string;
  letterCount: number;
  lastLetterAt: string | null;
  last: {
    text: string;
    alias: string;
    senderIsMe: boolean;
    createdAt: string;
    unread: boolean;
  } | null;
  waitingForMe: boolean;
};

export function LetterInbox({ userId }: { userId: string }) {
  const [threads, setThreads] = useState<ThreadItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/letter/inbox?u=${userId}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) throw new Error(j.error || "오류");
        setThreads(j.threads);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "오류");
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const active = threads?.filter((t) => t.status === "ACTIVE") ?? [];
  const closed = threads?.filter((t) => t.status !== "ACTIVE") ?? [];

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <section className="pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
          LETTER · 편지함
        </p>
        <h1 className="serif mt-4 text-3xl leading-tight text-nadi-glow">
          느린 글이 오가는
          <br />
          익명의 편지함
        </h1>
        <p className="mt-3 text-xs text-ink-100/55">
          한 사람과 최대 5왕복. 한 통 300~400자. 끝나면 자동으로 닫힙니다.
        </p>
      </section>

      <section className="mt-10">
        <Link
          href={`/meet/letter/new?u=${userId}`}
          className="block rounded-2xl border border-nadi-gold/30 bg-gradient-to-r from-nadi-gold/10 to-nadi-rose/10 px-5 py-4 text-center text-sm tracking-[0.3em] text-nadi-glow hover:opacity-90"
        >
          ✉ 새 편지 쓰기
        </Link>
      </section>

      <section className="mt-10">
        <p className="serif text-xs tracking-[0.4em] text-nadi-gold">진행 중</p>
        {err && <p className="mt-3 text-sm text-nadi-rose">{err}</p>}
        {threads === null ? (
          <p className="mt-4 text-sm text-ink-100/45">불러오는 중…</p>
        ) : active.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-ink-100/15 bg-black/20 p-6 text-center text-xs text-ink-100/45">
            아직 진행 중인 편지가 없어요.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {active.map((t) => (
              <li key={t.id}>
                <ThreadCard t={t} userId={userId} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section className="mt-12">
          <p className="serif text-xs tracking-[0.4em] text-nadi-gold/70">닫힌 편지함</p>
          <ul className="mt-4 space-y-3">
            {closed.map((t) => (
              <li key={t.id}>
                <ThreadCard t={t} userId={userId} dimmed />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function ThreadCard({ t, userId, dimmed }: { t: ThreadItem; userId: string; dimmed?: boolean }) {
  return (
    <Link
      href={`/meet/letter/${t.id}?u=${userId}`}
      className={
        dimmed
          ? "block rounded-2xl border border-ink-100/10 bg-black/20 px-5 py-4 hover:border-ink-100/25"
          : "block rounded-2xl border border-nadi-gold/25 bg-black/30 px-5 py-4 hover:-translate-y-0.5"
      }
    >
      <div className="flex items-center justify-between text-[10px] tracking-widest text-ink-100/45">
        <span>
          {t.last
            ? t.last.senderIsMe
              ? `나 → ${t.last.alias}`
              : `${t.last.alias} → 나`
            : "—"}
        </span>
        <span className="flex items-center gap-2">
          {t.last?.unread && (
            <span className="rounded-full bg-nadi-rose px-2 py-0.5 text-[9px] text-white">새</span>
          )}
          {t.waitingForMe && t.status === "ACTIVE" && (
            <span className="text-nadi-gold">내 답장 차례</span>
          )}
          {t.status !== "ACTIVE" && <span>{t.status === "ARCHIVED" ? "마무리" : "그만둠"}</span>}
        </span>
      </div>
      <p className="serif mt-2 text-sm leading-relaxed text-nadi-glow">
        {t.last ? t.last.text.replace(/\n/g, " ") : "—"}
      </p>
      <div className="mt-2 text-[10px] tracking-widest text-ink-100/40">
        {t.letterCount}/10 · {t.lastLetterAt ? new Date(t.lastLetterAt).toLocaleString("ko-KR") : ""}
      </div>
    </Link>
  );
}
