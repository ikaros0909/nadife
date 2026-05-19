"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      if (r.status === 404) {
        setErr("이 이메일로 시작한 기록이 없어요. 새로 시작해보세요.");
        return;
      }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      router.push(`/home`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-14">
      <header className="flex items-center justify-between">
        <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">NADIFE</p>
        <Link href="/" className="text-xs tracking-widest text-ink-100/40 hover:text-nadi-glow">
          ← 홈
        </Link>
      </header>

      <div className="mt-24">
        <p className="serif text-xs tracking-[0.45em] text-nadi-gold">이어가기</p>
        <h1 className="serif mt-6 text-3xl leading-snug text-nadi-glow sm:text-4xl">
          그동안 거쳐온
          <br />
          당신의 세계들을 다시 봅니다.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-100/60">
          시작했을 때 사용한 이메일로 — 매일 다른 당신의 궤적이 기다리고 있어요.
        </p>

        <input
          type="email"
          placeholder="email@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="mt-10 w-full rounded-xl border border-nadi-gold/30 bg-transparent px-5 py-4 text-lg text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold"
        />

        <button
          onClick={submit}
          disabled={loading || !email.trim()}
          className="mt-4 w-full rounded-full bg-gradient-to-r from-nadi-gold to-nadi-rose px-8 py-4 text-sm tracking-[0.3em] text-nadi-night transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "찾는 중…" : "내 화면 열기"}
        </button>

        {err && <p className="mt-4 text-sm text-nadi-rose">{err}</p>}

        <div className="mt-10 text-center">
          <Link
            href="/onboard"
            className="text-xs tracking-widest text-ink-100/40 underline hover:text-nadi-glow"
          >
            처음이라면 — 시작하기
          </Link>
        </div>
      </div>
    </main>
  );
}
