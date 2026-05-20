"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PersonalNav } from "@/components/PersonalNav";
import { AiPolishButton } from "@/components/AiPolishButton";

type Candidate = {
  id: string;
  alias: string;
  worldType: string;
  worldTitle: string;
  hue: string;
  oneLiner: string;
};

export function NewLetterClient({
  userId,
  myWorld,
  nearCandidates,
  farCandidates,
  initialTargetId
}: {
  userId: string;
  myWorld: { title: string; hue: string };
  nearCandidates: Candidate[];
  farCandidates: Candidate[];
  initialTargetId: string | null;
}) {
  const router = useRouter();
  const [targetId, setTargetId] = useState<string | null>(initialTargetId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (!targetId) return setErr("받는 사람을 골라주세요.");
    if (draft.length < 20) return setErr("최소 20자 이상 — 첫 인사는 마음을 담아주세요.");
    setSending(true);
    setErr(null);
    try {
      const r = await fetch("/api/letter/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ senderId: userId, receiverId: targetId, text: draft.trim() })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      router.push(`/meet/letter/${j.threadId}?u=${userId}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSending(false);
    }
  }

  const selected =
    [...nearCandidates, ...farCandidates].find((c) => c.id === targetId) ?? null;

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <header className="flex items-center justify-between pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">NEW LETTER</p>
        <Link
          href={`/meet/letter?u=${userId}`}
          className="text-xs tracking-widest text-ink-100/45 hover:text-nadip-glow"
        >
          ← 편지함
        </Link>
      </header>

      <h1 className="serif mt-8 text-2xl leading-tight text-nadip-glow">
        누구에게 첫 편지를 띄울까요?
      </h1>
      <p className="mt-2 text-xs text-ink-100/55">
        나({myWorld.title})와 비슷한 결, 혹은 정반대의 결.
      </p>

      <section className="mt-8">
        <p className="serif text-[10px] tracking-[0.4em] text-nadip-gold">비슷한 결</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {nearCandidates.map((c) => (
            <CandCard key={c.id} c={c} on={targetId === c.id} onClick={() => setTargetId(c.id)} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="serif text-[10px] tracking-[0.4em] text-nadip-rose">정반대의 결</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {farCandidates.map((c) => (
            <CandCard key={c.id} c={c} on={targetId === c.id} onClick={() => setTargetId(c.id)} />
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-nadip-gold/30 bg-black/30 p-6">
        <p className="serif text-xs tracking-[0.4em] text-nadip-gold">
          {selected ? `${selected.alias}에게` : "받는 사람을 골라주세요"}
        </p>
        {selected && (
          <p className="mt-1 text-[11px] text-ink-100/55">
            <span style={{ color: selected.hue }}>{selected.worldTitle}</span> · {selected.oneLiner}
          </p>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 400))}
          placeholder="첫 문장 — 가장 어렵죠. 천천히, 일상의 한 결을 적어주세요. (300~400자)"
          rows={9}
          className="mt-4 w-full resize-none rounded-xl border border-nadip-gold/20 bg-transparent px-4 py-3 text-[15px] leading-[1.85] text-nadip-glow placeholder:text-ink-100/30 outline-none focus:border-nadip-gold"
        />
        <div className="mt-3">
          <AiPolishButton
            kind="letter-first"
            current={draft}
            onPolished={(t) => setDraft(t.slice(0, 400))}
            minHint="몇 줄만 적어주세요. AI가 다듬어 줄게요."
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] tracking-widest text-ink-100/40">
            {draft.length}/400 · 최소 20자
          </span>
          <button
            onClick={send}
            disabled={sending || !targetId || draft.length < 20}
            className="rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-7 py-2 text-xs tracking-[0.3em] text-nadip-night hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "보내는 중…" : "✉ 첫 편지 띄우기"}
          </button>
        </div>
        {err && <p className="mt-2 text-[11px] text-nadip-rose">{err}</p>}
      </section>
    </main>
  );
}

function CandCard({
  c,
  on,
  onClick
}: {
  c: Candidate;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-2xl border p-4 text-left transition " +
        (on
          ? "border-nadip-gold/70 bg-nadip-gold/15 ring-1 ring-nadip-gold/40"
          : "border-ink-100/10 bg-black/30 hover:border-nadip-gold/40")
      }
      style={!on ? { borderLeft: `2px solid ${c.hue}55` } : undefined}
    >
      <p className="text-[10px] tracking-[0.3em]" style={{ color: c.hue }}>
        {c.worldTitle}
      </p>
      <p className="serif mt-2 text-base text-nadip-glow">{c.alias}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-ink-100/55 line-clamp-2">
        “{c.oneLiner}”
      </p>
    </button>
  );
}
