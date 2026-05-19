"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PersonalNav } from "@/components/PersonalNav";
import { SightTrigger } from "@/components/SightTrigger";

type Status = {
  windows: string[];
  open: boolean;
  currentWindow: string | null;
  nextWindow: string | null;
  secondsUntilNext: number;
  secondsRemainingInCurrent: number;
  forceOpen: boolean;
  myMeeting: {
    id: string;
    windowTime: string;
    iAmAlice: boolean;
    partnerId: string | null;
    partnerAlias: string;
    myLine: string | null;
    partnerLine: string | null;
    sealedAt: string | null;
  } | null;
};

export function CoincidenceClient({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [waiting, setWaiting] = useState<{ meetingId: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/coincidence/status?u=${userId}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setStatus(j);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    }
  }, [userId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function join() {
    setJoining(true);
    setErr(null);
    try {
      const r = await fetch("/api/coincidence/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      if (j.waiting) setWaiting({ meetingId: j.meetingId });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setJoining(false);
    }
  }

  async function say() {
    if (!status?.myMeeting) return;
    if (draft.length < 2) return setErr("한 줄 — 최소 2자.");
    setSending(true);
    setErr(null);
    try {
      const r = await fetch("/api/coincidence/say", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, meetingId: status.myMeeting.id, line: draft.trim() })
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

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <section className="pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
          COINCIDENCE · 우연의 시간
        </p>
        <h1 className="serif mt-4 text-3xl leading-tight text-nadi-glow">
          단 1분.
          <br />
          한 줄만 흘려보내는 순간.
        </h1>
        <p className="mt-3 text-xs text-ink-100/55">
          매일 {status?.windows.join(" · ") ?? "—"} (KST) — 그 60초 안에 입장한 사람과 한 줄을 주고받습니다.
          이어갈 수 없어요.
        </p>
      </section>

      {!status ? (
        <p className="mt-10 text-sm text-ink-100/45">불러오는 중…</p>
      ) : (
        <>
          {/* 오늘의 미팅이 이미 있으면 그것을 우선 표시 */}
          {status.myMeeting ? (
            <MeetingPanel
              userId={userId}
              meeting={status.myMeeting}
              draft={draft}
              setDraft={setDraft}
              onSay={say}
              sending={sending}
              err={err}
            />
          ) : status.open ? (
            <ActiveWindow
              status={status}
              joining={joining}
              onJoin={join}
              waitingMeetingId={waiting?.meetingId ?? null}
            />
          ) : (
            <ClosedWindow status={status} />
          )}
        </>
      )}
    </main>
  );
}

function ActiveWindow({
  status,
  joining,
  onJoin,
  waitingMeetingId
}: {
  status: Status;
  joining: boolean;
  onJoin: () => void;
  waitingMeetingId: string | null;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 rounded-3xl border border-nadi-gold/40 bg-gradient-to-br from-nadi-gold/15 to-nadi-rose/10 p-8 text-center"
    >
      <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">지금 — 열림</p>
      <p
        className="serif mt-4 text-7xl"
        style={{
          background: "linear-gradient(135deg, #d4af6f, #c47b8a)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}
      >
        {status.currentWindow}
      </p>
      <p className="mt-3 text-xs tracking-widest text-ink-100/65">
        남은 시간 {Math.max(0, status.secondsRemainingInCurrent)}초
      </p>
      {waitingMeetingId ? (
        <p className="mt-6 text-sm text-nadi-glow">
          누군가 같은 시간에 들어오기를 기다리는 중…
        </p>
      ) : (
        <button
          onClick={onJoin}
          disabled={joining}
          className="mt-6 rounded-full bg-gradient-to-r from-nadi-gold to-nadi-rose px-10 py-3 text-sm tracking-[0.3em] text-nadi-night hover:opacity-90 disabled:opacity-50"
        >
          {joining ? "입장 중…" : "✦ 들어가기"}
        </button>
      )}
    </motion.section>
  );
}

function ClosedWindow({ status }: { status: Status }) {
  const hh = Math.floor(status.secondsUntilNext / 3600);
  const mm = Math.floor((status.secondsUntilNext % 3600) / 60);
  const ss = status.secondsUntilNext % 60;
  const fmt = `${hh > 0 ? hh + "시간 " : ""}${mm}분 ${ss}초`;
  return (
    <section className="mt-10 rounded-3xl border border-ink-100/15 bg-black/30 p-8 text-center">
      <p className="serif text-[10px] tracking-[0.5em] text-ink-100/55">다음 우연까지</p>
      <p className="serif mt-3 text-5xl text-nadi-glow">{status.nextWindow}</p>
      <p className="mt-3 text-xs tracking-widest text-ink-100/55">{fmt} 후</p>
      <p className="mt-6 text-[11px] text-ink-100/45">
        그 1분 안에 들어와 있는 사람들끼리 한 명씩 — 우연히 — 짝이 됩니다.
      </p>
    </section>
  );
}

function MeetingPanel({
  userId,
  meeting,
  draft,
  setDraft,
  onSay,
  sending,
  err
}: {
  userId: string;
  meeting: NonNullable<Status["myMeeting"]>;
  draft: string;
  setDraft: (v: string) => void;
  onSay: () => void;
  sending: boolean;
  err: string | null;
}) {
  return (
    <section className="mt-10 space-y-4">
      <p className="serif text-[10px] tracking-[0.45em] text-nadi-gold">
        {meeting.windowTime} 우연 · 짝 — <span className="text-nadi-glow">{meeting.partnerAlias}</span>
      </p>

      {meeting.partnerId && (
        <div className="rounded-2xl border border-nadi-gold/25 bg-black/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] tracking-widest text-ink-100/55">
              이 우연의 짝은 누구일까?
            </span>
            <SightTrigger viewerId={userId} targetId={meeting.partnerId} source="coincidence" />
          </div>
        </div>
      )}

      <AnimatePresence>
        {meeting.partnerLine && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-nadi-rose/30 bg-black/30 px-6 py-5"
          >
            <p className="text-[10px] tracking-widest text-ink-100/45">{meeting.partnerAlias}</p>
            <p className="serif mt-2 text-base leading-relaxed text-nadi-glow">
              “{meeting.partnerLine}”
            </p>
          </motion.div>
        )}

        {meeting.myLine ? (
          <motion.div
            key="mine-done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-nadi-gold/40 bg-nadi-gold/5 px-6 py-5"
          >
            <p className="text-[10px] tracking-widest text-nadi-gold">나</p>
            <p className="serif mt-2 text-base leading-relaxed text-nadi-glow">
              “{meeting.myLine}”
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="mine-write"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-nadi-gold/40 bg-nadi-gold/10 px-6 py-5"
          >
            <p className="text-[10px] tracking-widest text-nadi-gold">내가 흘려보낼 한 줄</p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 200))}
              placeholder="200자 — 한 줄. 다시 못 보내요."
              rows={3}
              className="mt-3 w-full resize-none rounded-xl border border-nadi-gold/20 bg-transparent px-4 py-3 text-sm text-nadi-glow placeholder:text-ink-100/30 outline-none focus:border-nadi-gold"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] tracking-widest text-ink-100/40">
                {draft.length}/200
              </span>
              <button
                onClick={onSay}
                disabled={sending || draft.length < 2}
                className="rounded-full bg-gradient-to-r from-nadi-gold to-nadi-rose px-7 py-2 text-xs tracking-[0.3em] text-nadi-night hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "흘려보내는 중…" : "✦ 흘려보내기"}
              </button>
            </div>
            {err && <p className="mt-2 text-[11px] text-nadi-rose">{err}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {meeting.sealedAt && (
        <p className="mt-2 text-center text-[11px] tracking-widest text-ink-100/50">
          ✦ 두 줄이 만나 — 이 우연은 봉인되었어요.
        </p>
      )}

      {!meeting.partnerLine && !meeting.myLine && (
        <p className="mt-2 text-center text-[11px] tracking-widest text-ink-100/45">
          상대도 곧 한 줄을 흘려보낼 거예요.
        </p>
      )}
    </section>
  );
}
