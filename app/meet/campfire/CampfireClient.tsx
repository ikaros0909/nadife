"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PersonalNav } from "@/components/PersonalNav";
import { SightTrigger } from "@/components/SightTrigger";
import { AiPolishButton } from "@/components/AiPolishButton";
import { getWorldType } from "@/lib/world-map";

type Presence = { id: string; userId: string; alias: string; isMe: boolean; joinedAt: string };
type Whisper  = { id: string; userId: string; alias: string; text: string; isMe: boolean; createdAt: string };
type Room = { id: string; worldType: string; date: string };

export function CampfireClient({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<{ alias: string } | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [whisperErr, setWhisperErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const join = useCallback(async () => {
    try {
      const r = await fetch("/api/campfire/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "들어갈 수 없어요.");
      setRoom(j.campfire);
      setMe(j.me);
      setPresences(j.presences);
      setWhispers(j.whispers);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    join();
  }, [join]);

  // 30초마다 새로고침 — 같은 모닥불 다른 속삭임 받아오기
  useEffect(() => {
    if (!room) return;
    const t = setInterval(join, 30000);
    return () => clearInterval(t);
  }, [room, join]);

  // 새 글 오면 아래로 스크롤
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [whispers.length]);

  async function sendWhisper() {
    if (!room || !draft.trim()) return;
    setSending(true);
    setWhisperErr(null);
    try {
      const r = await fetch("/api/campfire/whisper", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, campfireId: room.id, text: draft.trim() })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "보낼 수 없어요.");
      setWhispers((ws) => [...ws, j.whisper]);
      setDraft("");
    } catch (e: unknown) {
      setWhisperErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSending(false);
    }
  }

  const world = room ? getWorldType(room.worldType) : null;

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <section className="pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">
          CAMPFIRE · 세계 모닥불
        </p>
        {loading ? (
          <p className="mt-6 text-sm text-ink-100/50">불을 피우는 중…</p>
        ) : err ? (
          <p className="mt-6 text-sm text-nadip-rose">{err}</p>
        ) : (
          world &&
          me && (
            <>
              <h1 className="serif mt-4 text-3xl leading-tight text-nadip-glow">
                <span style={{ color: world.hue }}>{world.title}</span>의 사람들이
                <br />
                지금 이곳에 있어요.
              </h1>
              <p className="mt-2 text-xs tracking-widest text-ink-100/45">
                나는 — <span className="text-nadip-glow">{me.alias}</span>
              </p>
            </>
          )
        )}
      </section>

      {/* 현재 입장 */}
      {!loading && !err && room && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <p className="serif text-xs tracking-[0.4em] text-nadip-gold">
              지금 모인 사람들
            </p>
            <span className="text-[10px] tracking-widest text-ink-100/50">
              {presences.length}명
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {presences.map((p) => (
              <div key={p.id} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      p.isMe
                        ? "rounded-full border border-nadip-gold/60 bg-nadip-gold/15 px-3 py-1 text-xs text-nadip-glow"
                        : "rounded-full border border-ink-100/15 bg-black/30 px-3 py-1 text-xs text-ink-100/65"
                    }
                  >
                    {p.alias}{p.isMe && " · 나"}
                  </span>
                  {!p.isMe && (
                    <SightTrigger viewerId={userId} targetId={p.userId} size="xs" source="campfire" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 속삭임 피드 */}
      {!loading && !err && room && (
        <section className="mt-10">
          <p className="serif text-xs tracking-[0.4em] text-nadip-gold">속삭임</p>
          <p className="mt-1 text-[10px] tracking-widest text-ink-100/40">
            하루 5개까지 · 24시간 뒤 사라짐
          </p>

          <div
            ref={scrollRef}
            className="mt-4 max-h-[400px] space-y-3 overflow-y-auto pr-1"
          >
            {whispers.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-ink-100/15 bg-black/20 p-6 text-center text-xs text-ink-100/45">
                아직 아무도 입을 열지 않았어요.
                <br />
                그래도 같은 자리에 있다는 것만으로 충분합니다.
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {whispers.map((w) => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={
                      w.isMe
                        ? "rounded-2xl border border-nadip-gold/40 bg-nadip-gold/10 px-5 py-4"
                        : "rounded-2xl border border-ink-100/10 bg-black/30 px-5 py-4"
                    }
                  >
                    <div className="flex items-center justify-between text-[10px] tracking-widest text-ink-100/45">
                      <span>{w.alias}{w.isMe && " · 나"}</span>
                      <span>{new Date(w.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="serif mt-2 text-base leading-relaxed text-nadip-glow">
                      {w.text}
                    </p>
                    {!w.isMe && (
                      <div className="mt-3">
                        <SightTrigger viewerId={userId} targetId={w.userId} size="xs" source="campfire" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* 입력 */}
          <div className="mt-6 rounded-2xl border border-nadip-gold/20 bg-black/30 p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 140))}
              placeholder="140자까지 — 같은 세계 사람들에게만 닿아요"
              rows={2}
              className="w-full resize-none bg-transparent px-2 py-1 text-sm text-nadip-glow placeholder:text-ink-100/30 outline-none"
            />
            <div className="mt-2 px-1">
              <AiPolishButton
                kind="campfire-whisper"
                current={draft}
                onPolished={(t) => setDraft(t.slice(0, 140))}
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] tracking-widest text-ink-100/40">
                {draft.length}/140
              </span>
              <button
                onClick={sendWhisper}
                disabled={sending || !draft.trim()}
                className="rounded-full bg-nadip-gold/15 px-5 py-1.5 text-xs tracking-[0.3em] text-nadip-glow ring-1 ring-nadip-gold/40 hover:bg-nadip-gold/25 disabled:opacity-40"
              >
                {sending ? "보내는 중…" : "흘려보내기"}
              </button>
            </div>
            {whisperErr && (
              <p className="mt-2 px-2 text-[11px] text-nadip-rose">{whisperErr}</p>
            )}
          </div>

          <p className="mt-6 text-center text-[10px] tracking-widest text-ink-100/35">
            아무 말 안 해도 됩니다. 들어와 있는 것 자체가 인사예요.
          </p>
        </section>
      )}
    </main>
  );
}
