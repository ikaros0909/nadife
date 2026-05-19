"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const INTERESTS = [
  "음악", "독서", "영화", "글쓰기", "코딩", "디자인", "사진", "여행",
  "운동", "요리", "게임", "덕질", "패션", "산책", "명상", "예술"
];
const PLATFORMS = [
  "Spotify", "YouTube", "Instagram", "Threads",
  "GitHub", "Letterboxd", "Goodreads", "멜론", "TikTok", "X(트위터)"
];
const HOURS = [
  { label: "새벽형 (00~04)", v: "00-04" },
  { label: "아침형 (05~09)", v: "05-09" },
  { label: "낮 활동 (10~17)", v: "10-17" },
  { label: "저녁형 (18~22)", v: "18-22" },
  { label: "밤형 (22~02)", v: "22-02" }
];

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    nickname: "",
    birthYear: "",
    interests: [] as string[],
    platforms: [] as string[],
    activeHours: "",
    vibe: ""
  });

  function toggle<T extends "interests" | "platforms">(key: T, v: string) {
    setForm((f) => {
      const arr = f[key] as string[];
      return {
        ...f,
        [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
      };
    });
  }

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          nickname: form.nickname || null,
          birthYear: form.birthYear ? Number(form.birthYear) : null,
          interests: form.interests,
          platforms: form.platforms,
          activeHours: form.activeHours || null,
          vibe: form.vibe || null
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "분석 실패");
      // 결과 페이지로 이동 (애니메이션 reveal)
      router.push(`/reveal/${json.personaId}?u=${json.userId}&kind=MAIN`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
      setLoading(false);
    }
  }

  const STEPS = 4;

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-14">
      <header className="flex items-center justify-between">
        <p className="serif text-xs tracking-[0.5em] text-nadi-gold">NADIFE</p>
        <p className="text-xs tracking-widest text-ink-100/40">
          {step + 1} / {STEPS}
        </p>
      </header>

      <div className="mt-3 h-[2px] w-full bg-ink-100/10">
        <div
          className="h-full bg-gradient-to-r from-nadi-gold to-nadi-rose transition-all"
          style={{ width: `${((step + 1) / STEPS) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="mt-14"
        >
          {step === 0 && (
            <div>
              <h2 className="serif text-3xl leading-snug text-nadi-glow">
                먼저, 당신의 디지털 흔적을
                <br />
                남길 곳을 알려주세요.
              </h2>
              <p className="mt-4 text-sm text-ink-100/60">
                회사·학교 이메일이면 그 세계도 함께 읽힙니다.
              </p>
              <input
                type="email"
                placeholder="email@domain.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-10 w-full rounded-xl border border-nadi-gold/30 bg-transparent px-5 py-4 text-lg text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold"
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="닉네임 (선택)"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  className="rounded-xl border border-ink-100/15 bg-transparent px-4 py-3 text-sm text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold/50"
                />
                <input
                  type="number"
                  placeholder="출생연도 (선택)"
                  value={form.birthYear}
                  onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
                  className="rounded-xl border border-ink-100/15 bg-transparent px-4 py-3 text-sm text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold/50"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="serif text-3xl leading-snug text-nadi-glow">
                무엇이 당신의 시간을
                <br />
                가장 많이 가져가나요?
              </h2>
              <p className="mt-4 text-sm text-ink-100/60">3개 이상 선택해주세요.</p>
              <div className="mt-10 flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <Chip
                    key={i}
                    label={i}
                    on={form.interests.includes(i)}
                    onClick={() => toggle("interests", i)}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="serif text-3xl leading-snug text-nadi-glow">
                당신은 어디에
                <br />
                흔적을 남기나요?
              </h2>
              <p className="mt-4 text-sm text-ink-100/60">자주 쓰는 플랫폼을 골라주세요.</p>
              <div className="mt-10 flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <Chip
                    key={p}
                    label={p}
                    on={form.platforms.includes(p)}
                    onClick={() => toggle("platforms", p)}
                  />
                ))}
              </div>

              <h3 className="serif mt-12 text-base text-nadi-glow/80">언제 가장 깨어있나요?</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {HOURS.map((h) => (
                  <Chip
                    key={h.v}
                    label={h.label}
                    on={form.activeHours === h.v}
                    onClick={() => setForm({ ...form, activeHours: h.v })}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="serif text-3xl leading-snug text-nadi-glow">
                마지막으로,
                <br />
                지금의 당신을 한 줄로.
              </h2>
              <p className="mt-4 text-sm text-ink-100/60">
                자유롭게 — 한 문장 또는 한 단어. AI가 더 깊이 읽어냅니다.
              </p>
              <textarea
                value={form.vibe}
                onChange={(e) => setForm({ ...form, vibe: e.target.value })}
                rows={4}
                placeholder='예: "요즘은 새벽이 더 편하다"'
                className="mt-8 w-full rounded-xl border border-nadi-gold/30 bg-transparent px-5 py-4 text-base text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold"
              />

              {err && (
                <p className="mt-4 text-sm text-nadi-rose">{err}</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto flex items-center justify-between pt-16">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || loading}
          className="px-4 py-2 text-sm tracking-widest text-ink-100/50 transition hover:text-nadi-glow disabled:opacity-30"
        >
          ← 이전
        </button>

        {step < STEPS - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 0 && !form.email}
            className="rounded-full bg-nadi-gold/15 px-8 py-3 text-sm tracking-[0.3em] text-nadi-glow ring-1 ring-nadi-gold/40 transition hover:bg-nadi-gold/25 disabled:opacity-40"
          >
            다음 →
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={loading || !form.email}
            className="rounded-full bg-gradient-to-r from-nadi-gold to-nadi-rose px-10 py-3 text-sm tracking-[0.3em] text-nadi-night transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "AI 분석 중…" : "관상 보기"}
          </button>
        )}
      </div>
    </main>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        on
          ? "rounded-full border border-nadi-gold/70 bg-nadi-gold/20 px-4 py-2 text-sm text-nadi-glow"
          : "rounded-full border border-ink-100/15 px-4 py-2 text-sm text-ink-100/60 hover:border-nadi-gold/40 hover:text-nadi-glow"
      }
    >
      {label}
    </button>
  );
}
