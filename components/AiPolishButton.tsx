"use client";

import { useState } from "react";

export type PolishKind =
  | "campfire-whisper"
  | "resonance-note"
  | "letter-first"
  | "letter-reply"
  | "coincidence-line"
  | "postbox-drop"
  | "postbox-reply"
  | "duet-line";

export function AiPolishButton({
  kind,
  current,
  onPolished,
  context,
  disabled,
  size = "md",
  minHint = "몇 글자만 적어주세요."
}: {
  kind: PolishKind;
  current: string;
  onPolished: (text: string) => void;
  context?: string | null;
  disabled?: boolean;
  size?: "sm" | "md";
  /** 입력이 비었을 때 보여줄 안내 문구 */
  minHint?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null);

  async function polish() {
    const t = current.trim();
    if (t.length < 1) {
      setErr(minHint);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/ai/polish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, text: t, context: context ?? null })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "다듬지 못했어요.");
      setOriginal(t);
      onPolished(j.polished);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  function revert() {
    if (original !== null) {
      onPolished(original);
      setOriginal(null);
    }
  }

  const btnCls =
    size === "sm"
      ? "rounded-full border border-nadi-rose/40 bg-nadi-rose/5 px-2.5 py-0.5 text-[10px] tracking-widest text-nadi-rose hover:bg-nadi-rose/15 disabled:opacity-50"
      : "rounded-full border border-nadi-rose/40 bg-nadi-rose/5 px-3 py-1 text-[11px] tracking-widest text-nadi-rose hover:bg-nadi-rose/15 disabled:opacity-50";

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={polish}
        disabled={loading || disabled}
        className={btnCls}
        title="몇 단어만 적어도 AI가 다듬어 줘요"
      >
        {loading ? "다듬는 중…" : "✦ AI로 다듬기"}
      </button>
      {original !== null && !loading && (
        <button
          type="button"
          onClick={revert}
          className="text-[10px] tracking-widest text-ink-100/45 underline hover:text-nadi-glow"
        >
          ↺ 원래로
        </button>
      )}
      {err && (
        <span className="text-[10px] tracking-widest text-nadi-rose">{err}</span>
      )}
    </div>
  );
}
