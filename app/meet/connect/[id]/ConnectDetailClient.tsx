"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { PersonalNav } from "@/components/PersonalNav";
import { WORLD_TYPES, getWorldType } from "@/lib/world-map";
import { toSvg } from "@/lib/journey";

type Detail = {
  partner: {
    partnerId: string;
    alias: string;
    worldType: string | null;
    worldTitle: string | null;
    hue: string | null;
    vibe: string | null;
    oneLiner: string | null;
    isHuman: boolean;
    revealed: {
      nickname: string | null;
      gender: string | null;
      country: string | null;
      occupation: string | null;
      region: string | null;
    } | null;
  };
  affinity: {
    score: number;
    thresholdProgress: number;
    types: string[];
    typesCount: number;
    requiredTypes: number;
    detail: {
      letterCount: number;
      letterArchived: boolean;
      sightAtoB: boolean;
      sightBtoA: boolean;
      duetLines: number;
      duetComplete: boolean;
      mirrorReciprocated: number;
      echoesFromMeToThem: number;
      echoesFromThemToMe: number;
      postboxRepliesToTheirs: number;
      postboxRepliesToMine: number;
      postboxStarsMine: number;
      postboxStarsTheirs: number;
      coincidenceSealed: number;
    };
    timeline: { at: string; source: string; description: string }[];
  };
  connection: {
    status: string;
    proposerId: string | null;
    proposedAt: string | null;
    acceptedAt: string | null;
    declinedAt: string | null;
    disconnectedAt: string | null;
    blockedAt: string | null;
    iAmProposer: boolean;
    iBlocked: boolean;
    iDisconnected: boolean;
  } | null;
  eligibility: {
    eligible: boolean;
    reason: string | null;
    message: string | null;
    cooldownUntil: string | null;
  };
  match: {
    matched: boolean;
    myPrefsOk: boolean;
    theirPrefsOk: boolean;
  };
  distance: {
    bothOptIn: boolean;
    bucket: string | null;
    approxKm: number | null;
  };
};

const SOURCE_LABEL: Record<string, string> = {
  letter: "편지",
  sight: "천리안",
  duet: "듀엣",
  mirror: "미러",
  resonance: "합주",
  postbox: "공중 한 줄",
  coincidence: "우연"
};

export function ConnectDetailClient({ userId, partnerId }: { userId: string; partnerId: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/connect/detail?u=${userId}&t=${partnerId}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      setData(j);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [userId, partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActing(action);
    setActionErr(null);
    try {
      const r = await fetch("/api/connect/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, partnerId, action })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "오류");
      await load();
    } catch (e: unknown) {
      setActionErr(e instanceof Error ? e.message : "오류");
    } finally {
      setActing(null);
    }
  }

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-2xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <header className="flex items-center justify-between pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">CONNECT</p>
        <Link
          href={`/meet/connect?u=${userId}`}
          className="text-xs tracking-widest text-ink-100/45 hover:text-nadip-glow"
        >
          ← 연결 목록
        </Link>
      </header>

      {loading && <p className="mt-10 text-sm text-ink-100/45">불러오는 중…</p>}
      {err && <p className="mt-6 text-sm text-nadip-rose">{err}</p>}

      {data && (
        <>
          {/* 상단 — 상대 카드 */}
          <section
            className="mt-8 rounded-3xl border border-nadip-gold/30 p-6"
            style={
              data.partner.hue
                ? {
                    background: `radial-gradient(circle at 30% 0%, ${data.partner.hue}22, transparent 55%), rgba(11,14,26,0.55)`
                  }
                : undefined
            }
          >
            <p className="serif text-[10px] tracking-[0.45em]" style={{ color: data.partner.hue ?? "#bfb7a3" }}>
              {data.partner.worldTitle ?? "디지털 자아"}
              {data.partner.vibe && ` · ${data.partner.vibe}`}
            </p>
            <h1 className="serif mt-3 text-2xl text-nadip-glow">{data.partner.alias}</h1>
            {data.partner.oneLiner && (
              <p className="mt-2 text-sm leading-relaxed text-ink-100/65">“{data.partner.oneLiner}”</p>
            )}
            {data.partner.revealed && (
              <div className="mt-4 rounded-2xl border border-nadip-gold/40 bg-nadip-gold/10 p-4 text-xs">
                <p className="text-[10px] tracking-widest text-nadip-gold">연결됨 — 공개된 윤곽</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-ink-100/75">
                  {data.partner.revealed.nickname && (
                    <p>닉네임 · <span className="text-nadip-glow">{data.partner.revealed.nickname}</span></p>
                  )}
                  {data.partner.revealed.gender && <p>성별 · {data.partner.revealed.gender}</p>}
                  {data.partner.revealed.country && <p>국적 · {data.partner.revealed.country}</p>}
                  {data.partner.revealed.region && <p>지역 · {data.partner.revealed.region}</p>}
                  {data.partner.revealed.occupation && <p>직업 · {data.partner.revealed.occupation}</p>}
                </div>
              </div>
            )}
          </section>

          {/* 매칭 + 거리 — 연결 자격 */}
          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <div
              className={
                data.match.matched
                  ? "rounded-2xl border border-nadip-gold/40 bg-nadip-gold/5 px-5 py-4"
                  : "rounded-2xl border border-nadip-rose/30 bg-nadip-rose/5 px-5 py-4"
              }
            >
              <p className="text-[10px] tracking-[0.3em] text-nadip-gold">조건</p>
              <p className="serif mt-2 text-sm text-nadip-glow">
                {data.match.matched
                  ? "두 사람의 조건이 맞아요"
                  : "조건이 맞지 않아요"}
              </p>
              {!data.match.matched && (
                <p className="mt-1 text-[10px] tracking-widest text-ink-100/45">
                  {!data.match.myPrefsOk && "내 조건에 그쪽이 맞지 않아요. "}
                  {!data.match.theirPrefsOk && "그쪽 조건에 내가 맞지 않아요."}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-nadip-gold/25 bg-black/30 px-5 py-4">
              <p className="text-[10px] tracking-[0.3em] text-nadip-gold">거리</p>
              {data.distance.bothOptIn ? (
                <>
                  <p className="serif mt-2 text-sm text-nadip-glow">
                    {data.distance.bucket ?? "—"}
                  </p>
                  {data.distance.approxKm !== null && (
                    <p className="mt-1 text-[10px] tracking-widest text-ink-100/45">
                      약 {data.distance.approxKm}km
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-[11px] leading-relaxed text-ink-100/55">
                  양쪽 모두 위치 공유를 켜야 보여요.
                </p>
              )}
            </div>
          </section>

          {/* 연결됨 — 무제한 편지 채널 진입 */}
          {data.connection?.status === "CONNECTED" && (
            <>
              <ConnectedUnlocks
                meId={userId}
                partnerId={data.partner.partnerId}
                distance={data.distance}
              />
              <JourneyOverlay meId={userId} partnerId={data.partner.partnerId} />
            </>
          )}

          {/* 인연의 결 — 카테고리별 요약 */}
          <section className="mt-8">
            <p className="serif text-xs tracking-[0.4em] text-nadip-gold">인연의 결</p>
            <p className="mt-1 text-[11px] text-ink-100/45">
              {data.affinity.typesCount}가지 결로 만났어요 (연결까지 최소 {data.affinity.requiredTypes}가지 필요).
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {data.affinity.detail.letterCount > 0 && (
                <KindRow
                  label="편지"
                  value={`${data.affinity.detail.letterCount}통${data.affinity.detail.letterArchived ? " · 5왕복 완성" : ""}`}
                />
              )}
              {(data.affinity.detail.sightAtoB || data.affinity.detail.sightBtoA) && (
                <KindRow
                  label="천리안"
                  value={
                    data.affinity.detail.sightAtoB && data.affinity.detail.sightBtoA
                      ? "양방향"
                      : data.affinity.detail.sightAtoB
                      ? "내가 그쪽을 봄"
                      : "그쪽이 나를 봄"
                  }
                />
              )}
              {data.affinity.detail.duetLines > 0 && (
                <KindRow
                  label="듀엣"
                  value={
                    data.affinity.detail.duetComplete
                      ? "한 권 완성"
                      : `${data.affinity.detail.duetLines}줄 진행`
                  }
                />
              )}
              {data.affinity.detail.mirrorReciprocated > 0 && (
                <KindRow label="미러 양방향" value={`${data.affinity.detail.mirrorReciprocated}회`} />
              )}
              {(data.affinity.detail.echoesFromMeToThem + data.affinity.detail.echoesFromThemToMe) >
                0 && (
                <KindRow
                  label="공명"
                  value={`${data.affinity.detail.echoesFromMeToThem + data.affinity.detail.echoesFromThemToMe}회 (내→그 ${data.affinity.detail.echoesFromMeToThem}, 그→내 ${data.affinity.detail.echoesFromThemToMe})`}
                />
              )}
              {(data.affinity.detail.postboxRepliesToTheirs +
                data.affinity.detail.postboxRepliesToMine) >
                0 && (
                <KindRow
                  label="공중 한 줄"
                  value={`답신 ${data.affinity.detail.postboxRepliesToTheirs + data.affinity.detail.postboxRepliesToMine}회${(data.affinity.detail.postboxStarsMine + data.affinity.detail.postboxStarsTheirs) > 0 ? " · 별표 있음" : ""}`}
                />
              )}
              {data.affinity.detail.coincidenceSealed > 0 && (
                <KindRow label="우연" value={`${data.affinity.detail.coincidenceSealed}회 봉인`} />
              )}
            </div>
          </section>

          {/* 타임라인 — 겹쳐온 순간들 */}
          {data.affinity.timeline.length > 0 && (
            <section className="mt-10">
              <p className="serif text-xs tracking-[0.4em] text-nadip-gold">겹쳐온 순간</p>
              <ol className="mt-4 space-y-2">
                {data.affinity.timeline.map((ev, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-baseline gap-3 rounded-xl border border-ink-100/10 bg-black/30 px-4 py-2.5"
                  >
                    <span className="shrink-0 text-[10px] tracking-widest text-ink-100/40">
                      {new Date(ev.at).toLocaleDateString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit"
                      })}
                    </span>
                    <span className="shrink-0 text-[10px] tracking-[0.3em] text-nadip-gold">
                      {SOURCE_LABEL[ev.source] ?? ev.source}
                    </span>
                    <span className="text-xs text-ink-100/70">{ev.description}</span>
                  </motion.li>
                ))}
              </ol>
            </section>
          )}

          {/* 안전 안내 + 액션 */}
          <ActionPanel data={data} acting={acting} actionErr={actionErr} act={act} />
        </>
      )}
    </main>
  );
}

function KindRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100/10 bg-black/30 px-4 py-3">
      <div className="text-[10px] tracking-[0.3em] text-nadip-gold">{label}</div>
      <div className="serif mt-1 text-sm text-nadip-glow">{value}</div>
    </div>
  );
}

function ActionPanel({
  data,
  acting,
  actionErr,
  act
}: {
  data: Detail;
  acting: string | null;
  actionErr: string | null;
  act: (action: string, confirmMsg?: string) => void;
}) {
  const c = data.connection;
  const e = data.eligibility;
  const status = c?.status ?? null;

  // 차단됨 — 차단한 본인만 해제 가능
  if (status === "BLOCKED") {
    if (c?.iBlocked) {
      return (
        <section className="mt-12 rounded-3xl border border-nadip-rose/40 bg-nadip-rose/5 p-6 text-center">
          <p className="serif text-base text-nadip-glow">이 사람을 차단했어요.</p>
          <p className="mt-2 text-xs text-ink-100/55">
            언제든 해제할 수 있지만, 차분히 결정하세요.
          </p>
          <button
            onClick={() => act("unblock", "차단을 해제할까요?")}
            disabled={acting === "unblock"}
            className="mt-4 rounded-full border border-ink-100/20 px-6 py-2 text-xs tracking-widest text-ink-100/70 hover:border-ink-100/40 disabled:opacity-50"
          >
            {acting === "unblock" ? "해제 중…" : "차단 해제"}
          </button>
          {actionErr && <p className="mt-3 text-[11px] text-nadip-rose">{actionErr}</p>}
        </section>
      );
    }
    return (
      <section className="mt-12 rounded-3xl border border-ink-100/15 bg-black/30 p-6 text-center text-xs text-ink-100/55">
        이 관계는 닫혀 있어요.
      </section>
    );
  }

  // 연결됨
  if (status === "CONNECTED") {
    return (
      <section className="mt-12 rounded-3xl border border-nadip-gold/40 bg-gradient-to-br from-nadip-gold/10 to-nadip-rose/10 p-7">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">✦ 연결됨</p>
        <h3 className="serif mt-3 text-xl leading-snug text-nadip-glow">
          서로를 알아본 사이.
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-ink-100/65">
          익명의 결을 넘어 — 윤곽을 공유한 사이가 됐어요.
          {c?.acceptedAt && (
            <>
              <br />
              연결된 시점 — {new Date(c.acceptedAt).toLocaleDateString("ko-KR")}
            </>
          )}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() =>
              act(
                "disconnect",
                "연결을 해제할까요? 다시 익명의 결로 돌아가요. (서로의 윤곽은 다시 가려집니다)"
              )
            }
            disabled={acting === "disconnect"}
            className="flex-1 rounded-xl border border-ink-100/20 px-4 py-2 text-xs tracking-widest text-ink-100/65 hover:border-ink-100/40 disabled:opacity-50"
          >
            연결 해제
          </button>
          <button
            onClick={() =>
              act(
                "block",
                "차단하면 두 사람 사이의 모든 만남이 닫히고 — 다시 만날 수 없어요. 계속할까요?"
              )
            }
            disabled={acting === "block"}
            className="flex-1 rounded-xl border border-nadip-rose/40 bg-nadip-rose/5 px-4 py-2 text-xs tracking-widest text-nadip-rose hover:bg-nadip-rose/15 disabled:opacity-50"
          >
            차단
          </button>
        </div>
        {actionErr && <p className="mt-3 text-[11px] text-nadip-rose">{actionErr}</p>}
      </section>
    );
  }

  // 내가 받은 제안
  if ((status === "PROPOSED_A" || status === "PROPOSED_B") && c && !c.iAmProposer) {
    return (
      <section className="mt-12 rounded-3xl border border-nadip-rose/40 bg-gradient-to-br from-nadip-rose/10 to-nadip-gold/5 p-7">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-rose">✦ 연결 제안</p>
        <h3 className="serif mt-3 text-xl leading-snug text-nadip-glow">
          이 사람이 — 당신과 정식으로 연결되기를 청해왔어요.
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-ink-100/65">
          수락하면 서로의 윤곽이 공유됩니다. 거절해도 — 상대에게 알림은 가지 않고, 둘 사이의 관계는 그대로 머물러요.
        </p>
        <div className="mt-5 space-y-2">
          <button
            onClick={() =>
              act(
                "accept",
                "연결을 수락할까요? 서로의 윤곽이 공유돼요. 한번 더 확인해주세요."
              )
            }
            disabled={!!acting}
            className="w-full rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-6 py-3 text-sm tracking-[0.3em] text-nadip-night hover:opacity-90 disabled:opacity-50"
          >
            {acting === "accept" ? "수락 중…" : "✦ 연결 수락"}
          </button>
          <button
            onClick={() => act("decline", "이 제안을 거절할까요? 상대에게는 알림이 가지 않아요.")}
            disabled={!!acting}
            className="w-full rounded-full border border-ink-100/20 px-6 py-3 text-xs tracking-widest text-ink-100/65 hover:border-ink-100/40 disabled:opacity-50"
          >
            거절 (조용히)
          </button>
          <button
            onClick={() =>
              act(
                "block",
                "차단하면 두 사람 사이의 모든 만남이 영원히 닫혀요. 계속할까요?"
              )
            }
            disabled={!!acting}
            className="w-full rounded-full border border-nadip-rose/30 bg-nadip-rose/5 px-6 py-3 text-xs tracking-widest text-nadip-rose hover:bg-nadip-rose/15 disabled:opacity-50"
          >
            차단 (영원히 안 만나기)
          </button>
        </div>
        {actionErr && <p className="mt-3 text-[11px] text-nadip-rose">{actionErr}</p>}
      </section>
    );
  }

  // 내가 제안한 상태 — 기다리는 중
  if ((status === "PROPOSED_A" || status === "PROPOSED_B") && c?.iAmProposer) {
    return (
      <section className="mt-12 rounded-3xl border border-nadip-gold/30 bg-nadip-gold/5 p-7">
        <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">연결 제안 보냄</p>
        <h3 className="serif mt-3 text-xl leading-snug text-nadip-glow">
          답을 기다리는 중…
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-ink-100/55">
          {c.proposedAt && `${new Date(c.proposedAt).toLocaleString("ko-KR")} 에 보냈어요.`}
          <br />
          답이 도착하면 알려드릴게요. 답이 안 와도 — 그대로 이대로 머무를 수 있어요.
        </p>
      </section>
    );
  }

  // 거절됨/해제됨 — 다시 제안 가능
  if (status === "DECLINED" || status === "DISCONNECTED") {
    const label = status === "DECLINED" ? "조용히 머무른 시간" : "한 번 연결됐다 풀린 시간";
    return (
      <section className="mt-12 rounded-3xl border border-ink-100/15 bg-black/20 p-6">
        <p className="serif text-[10px] tracking-[0.45em] text-ink-100/55">{label}</p>
        <p className="mt-3 text-xs text-ink-100/55">
          이 관계는 닫혀 있지만 — 새로 시간이 쌓이면 다시 제안할 수 있어요.
        </p>
        {e.eligible && (
          <button
            onClick={() => act("propose", "다시 연결을 제안할까요?")}
            disabled={!!acting}
            className="mt-4 w-full rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-6 py-3 text-sm tracking-[0.3em] text-nadip-night hover:opacity-90 disabled:opacity-50"
          >
            다시 ✦ 연결 제안
          </button>
        )}
        {actionErr && <p className="mt-3 text-[11px] text-nadip-rose">{actionErr}</p>}
      </section>
    );
  }

  // 깊어지는 중 / 충분히 깊어짐 — 첫 제안
  return (
    <section className="mt-12 rounded-3xl border border-nadip-gold/40 bg-gradient-to-br from-nadip-gold/10 to-nadip-deep/40 p-7">
      <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">✦ 연결 — 신중하게</p>
      <h3 className="serif mt-3 text-xl leading-snug text-nadip-glow">
        충분히 검토한 뒤에 — 결정해주세요.
      </h3>
      <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-100/65">
        <li>· 연결되면 서로의 윤곽(닉네임·성별·국적·지역·직업 중 채워둔 것)이 공유돼요.</li>
        <li>· 연결은 양쪽이 모두 명시적으로 동의해야 시작됩니다.</li>
        <li>· 언제든 해제할 수 있고 — 차단도 가능합니다.</li>
        <li>· 거절은 상대에게 알리지 않아요.</li>
      </ul>

      {e.eligible ? (
        <button
          onClick={() =>
            act(
              "propose",
              "정말 연결을 제안할까요? 상대가 수락하면 서로의 윤곽이 공유돼요. 신중하게 결정해주세요."
            )
          }
          disabled={!!acting}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-6 py-3 text-sm tracking-[0.3em] text-nadip-night hover:opacity-90 disabled:opacity-50"
        >
          {acting === "propose" ? "보내는 중…" : "✦ 연결 제안하기"}
        </button>
      ) : (
        <div className="mt-6 rounded-2xl border border-ink-100/15 bg-black/30 px-5 py-4 text-center text-xs text-ink-100/65">
          {e.message ?? "아직 제안할 수 없어요."}
          {e.cooldownUntil && (
            <p className="mt-2 text-[10px] tracking-widest text-ink-100/45">
              가능 시점 — {new Date(e.cooldownUntil).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
      )}

      <button
        onClick={() =>
          act(
            "block",
            "차단하면 두 사람 사이의 모든 만남이 영원히 닫혀요. 정말 계속할까요?"
          )
        }
        disabled={!!acting}
        className="mt-3 w-full rounded-full border border-nadip-rose/30 bg-nadip-rose/5 px-6 py-2 text-[11px] tracking-widest text-nadip-rose hover:bg-nadip-rose/15 disabled:opacity-50"
      >
        차단 (영원히 안 만나기)
      </button>
      {actionErr && <p className="mt-3 text-[11px] text-nadip-rose">{actionErr}</p>}
    </section>
  );
}

function ConnectedUnlocks({
  meId,
  partnerId,
  distance
}: {
  meId: string;
  partnerId: string;
  distance: { bothOptIn: boolean; bucket: string | null; approxKm: number | null };
}) {
  return (
    <section className="mt-6 rounded-3xl border border-nadip-gold/40 bg-gradient-to-br from-nadip-gold/10 to-nadip-rose/10 p-6">
      <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">✦ 연결된 사이</p>
      <h3 className="serif mt-3 text-lg leading-snug text-nadip-glow">
        끊임없이 편지를 주고받을 수 있어요.
      </h3>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-100/65">
        {distance.bothOptIn && distance.bucket
          ? `${distance.bucket} — 두 사람 사이를 종이비행기가 날아가는 시간만큼, 편지는 천천히 도착해요.`
          : "위치 공유를 켜면 — 거리에 비례한 비행 시간으로 편지가 도착해요. 같은 도시는 분 단위, 다른 대륙은 며칠."}
      </p>
      <a
        href={`/meet/letter/new?u=${meId}&to=${partnerId}`}
        className="mt-5 inline-flex rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-6 py-2 text-xs tracking-[0.3em] text-nadip-night hover:opacity-90"
      >
        ✉ 편지 띄우기
      </a>
    </section>
  );
}

// ──────────────── 공통 궤적 overlay ────────────────

type OverlayPoint = {
  id: string;
  source: "MAIN" | "SUB" | "DAILY";
  date: string;
  worldSlug: string;
  axisX: number;
  axisY: number;
};

const OVERLAY_SIZE = 380;
const OVERLAY_PAD = 30;

function JourneyOverlay({ meId, partnerId }: { meId: string; partnerId: string }) {
  const [data, setData] = useState<{
    me: { points: OverlayPoint[] };
    partner: { points: OverlayPoint[] };
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/connect/overlay?u=${meId}&t=${partnerId}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (alive) setData({ me: j.me, partner: j.partner });
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [meId, partnerId]);

  const mePath = useMemo(() => buildPath(data?.me.points ?? []), [data]);
  const theirPath = useMemo(() => buildPath(data?.partner.points ?? []), [data]);

  if (!data) return null;

  const meCount = data.me.points.length;
  const theirCount = data.partner.points.length;
  const sharedWorlds = computeSharedWorlds(data.me.points, data.partner.points);

  return (
    <section className="mt-6 rounded-3xl border border-nadip-gold/30 bg-black/30 p-6">
      <p className="serif text-[10px] tracking-[0.5em] text-nadip-gold">
        ✦ 공통 궤적
      </p>
      <h3 className="serif mt-3 text-lg leading-snug text-nadip-glow">
        같은 평면 위 — 두 사람의 결.
      </h3>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-100/55">
        나(<span className="text-nadip-gold">금색</span>)와 그쪽(<span className="text-nadip-rose">분홍</span>)의 궤적이 16개의 세계 위에 겹쳐 그려졌어요.
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-nadip-gold/20 bg-[radial-gradient(circle_at_center,_rgba(212,175,111,0.06),_transparent_70%),linear-gradient(180deg,#0b0e1a,#11142b)]">
        <svg
          viewBox={`0 0 ${OVERLAY_SIZE} ${OVERLAY_SIZE}`}
          className="block w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="me-path" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d4af6f" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#d4af6f" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="their-path" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c47b8a" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#c47b8a" stopOpacity="1" />
            </linearGradient>
          </defs>

          <line x1={OVERLAY_SIZE / 2} y1={OVERLAY_PAD} x2={OVERLAY_SIZE / 2} y2={OVERLAY_SIZE - OVERLAY_PAD} stroke="rgba(212,175,111,0.12)" />
          <line x1={OVERLAY_PAD} y1={OVERLAY_SIZE / 2} x2={OVERLAY_SIZE - OVERLAY_PAD} y2={OVERLAY_SIZE / 2} stroke="rgba(212,175,111,0.12)" />

          {WORLD_TYPES.map((w) => {
            const { cx, cy } = toSvg(w.axisX, w.axisY, OVERLAY_SIZE, OVERLAY_PAD);
            const isShared = sharedWorlds.has(w.slug);
            return (
              <g key={w.slug}>
                <circle cx={cx} cy={cy} r={isShared ? 4 : 2.5} fill={w.hue} opacity={isShared ? 0.6 : 0.22} />
                {isShared && (
                  <circle cx={cx} cy={cy} r={9} fill="none" stroke={w.hue} strokeWidth="0.6" opacity="0.5" />
                )}
              </g>
            );
          })}

          {theirPath && (
            <path d={theirPath} fill="none" stroke="url(#their-path)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3" />
          )}
          {mePath && (
            <path d={mePath} fill="none" stroke="url(#me-path)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {data.partner.points.map((p, i) => {
            const w = getWorldType(p.worldSlug);
            const { cx, cy } = toSvg(w.axisX, w.axisY, OVERLAY_SIZE, OVERLAY_PAD);
            const isLatest = i === data.partner.points.length - 1;
            return (
              <circle
                key={`their-${p.id}`}
                cx={cx}
                cy={cy}
                r={isLatest ? 5 : 3.5}
                fill="#c47b8a"
                stroke="#0b0e1a"
                strokeWidth="1.2"
                opacity={isLatest ? 1 : 0.85}
              />
            );
          })}
          {data.me.points.map((p, i) => {
            const w = getWorldType(p.worldSlug);
            const { cx, cy } = toSvg(w.axisX, w.axisY, OVERLAY_SIZE, OVERLAY_PAD);
            const isLatest = i === data.me.points.length - 1;
            return (
              <circle
                key={`me-${p.id}`}
                cx={cx}
                cy={cy}
                r={isLatest ? 5.5 : 4}
                fill="#d4af6f"
                stroke="#0b0e1a"
                strokeWidth="1.2"
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] tracking-widest">
        <div className="rounded-lg border border-nadip-gold/25 bg-nadip-gold/5 px-3 py-2 text-center">
          <div className="text-ink-100/55">내 점</div>
          <div className="serif mt-1 text-nadip-gold">{meCount}</div>
        </div>
        <div className="rounded-lg border border-nadip-rose/25 bg-nadip-rose/5 px-3 py-2 text-center">
          <div className="text-ink-100/55">그쪽 점</div>
          <div className="serif mt-1 text-nadip-rose">{theirCount}</div>
        </div>
        <div className="rounded-lg border border-nadip-glow/25 bg-black/40 px-3 py-2 text-center">
          <div className="text-ink-100/55">겹친 세계</div>
          <div className="serif mt-1 text-nadip-glow">{sharedWorlds.size}</div>
        </div>
      </div>
    </section>
  );
}

function buildPath(points: OverlayPoint[]): string {
  if (points.length < 2) return "";
  return points
    .map((p, i) => {
      const w = getWorldType(p.worldSlug);
      const { cx, cy } = toSvg(w.axisX, w.axisY, OVERLAY_SIZE, OVERLAY_PAD);
      return `${i === 0 ? "M" : "L"} ${cx} ${cy}`;
    })
    .join(" ");
}

function computeSharedWorlds(a: OverlayPoint[], b: OverlayPoint[]): Set<string> {
  const aSet = new Set(a.map((p) => p.worldSlug));
  const bSet = new Set(b.map((p) => p.worldSlug));
  const shared = new Set<string>();
  for (const s of aSet) if (bSet.has(s)) shared.add(s);
  return shared;
}
