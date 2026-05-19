"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PersonalNav } from "@/components/PersonalNav";

type BookItem = {
  id: string;
  status: string;
  themes: string[];
  progress: number;
  total: number;
  createdAt: string;
  completedAt: string | null;
};

export function DuetListClient({ userId }: { userId: string }) {
  const [books, setBooks] = useState<BookItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/duet/list?u=${userId}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) throw new Error(j.error || "오류");
        setBooks(j.books);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "오류");
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const open = books?.filter((b) => b.status === "OPEN") ?? [];
  const done = books?.filter((b) => b.status === "COMPLETE") ?? [];

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <section className="pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
          DUET · 미러 듀엣
        </p>
        <h1 className="serif mt-4 text-3xl leading-tight text-nadi-glow">
          서로 본 두 사람이
          <br />
          함께 쓰는 짧은 책
        </h1>
        <p className="mt-3 text-xs text-ink-100/55">
          5개 시제(時題), 각자 한 줄씩 — 10줄이 모이면 한 권의 책이 완성됩니다.
          서로 천리안이 닿은 사람만 펼 수 있어요.
        </p>
      </section>

      <section className="mt-10">
        <p className="serif text-xs tracking-[0.4em] text-nadi-gold">쓰는 중</p>
        {err && <p className="mt-3 text-sm text-nadi-rose">{err}</p>}
        {books === null ? (
          <p className="mt-4 text-sm text-ink-100/45">불러오는 중…</p>
        ) : open.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-ink-100/15 bg-black/20 p-6 text-center text-xs text-ink-100/45">
            아직 진행 중인 듀엣이 없어요.
            <br />
            미러에서 누군가에게 천리안을 쓰고, 그 사람도 당신에게 천리안을 써야 — 듀엣이 열립니다.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {open.map((b) => (
              <BookCard key={b.id} b={b} userId={userId} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className="mt-12">
          <p className="serif text-xs tracking-[0.4em] text-nadi-gold/70">완성된 책</p>
          <ul className="mt-4 space-y-3">
            {done.map((b) => (
              <BookCard key={b.id} b={b} userId={userId} done />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function BookCard({ b, userId, done }: { b: BookItem; userId: string; done?: boolean }) {
  return (
    <Link
      href={`/meet/duet/${b.id}?u=${userId}`}
      className={
        done
          ? "block rounded-2xl border border-nadi-gold/20 bg-black/20 px-5 py-4 hover:border-nadi-gold/40"
          : "block rounded-2xl border border-nadi-gold/30 bg-gradient-to-br from-nadi-gold/5 to-nadi-rose/5 px-5 py-4 hover:-translate-y-0.5"
      }
    >
      <div className="flex items-center justify-between text-[10px] tracking-widest text-ink-100/45">
        <span>
          {b.progress}/{b.total} 줄
        </span>
        <span>{done ? "완성됨" : "진행 중"}</span>
      </div>
      <p className="serif mt-3 text-sm leading-relaxed text-nadi-glow line-clamp-2">
        {b.themes.slice(0, 3).join(" · ")}
        {b.themes.length > 3 && " …"}
      </p>
      <div className="mt-2 text-[10px] tracking-widest text-ink-100/40">
        {new Date(b.createdAt).toLocaleDateString("ko-KR")}
      </div>
    </Link>
  );
}
