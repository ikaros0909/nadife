import Link from "next/link";
import { WORLD_TYPES } from "@/lib/world-map";
import { getUidFromCookie } from "@/lib/session";

export default async function LandingPage() {
  const uid = await getUidFromCookie();
  return (
    <main className="relative z-10 min-h-screen w-full">
      {/* HERO */}
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
        <p className="serif text-sm tracking-[0.55em] text-nadi-gold">
          N · A · D · I · F · E
        </p>
        <h1 className="serif mt-10 text-5xl leading-[1.1] text-nadi-glow sm:text-7xl">
          당신은
          <br />
          <span className="bg-gradient-to-r from-nadi-gold via-nadi-rose to-nadi-gold bg-clip-text text-transparent">
            한 명이 아닙니다.
          </span>
        </h1>
        <p className="mt-10 max-w-xl text-base leading-[1.9] text-ink-100/80 sm:text-lg">
          AI가 당신의 디지털 흔적을 읽고,
          <br />
          <span className="text-nadi-glow">메인캐</span>와{" "}
          <span className="text-nadi-rose">숨어 있던 부캐</span>를 꺼냅니다.
          <br />
          오늘의 당신은, 어떤 세계를 살고 있나요?
        </p>

        <Link
          href={uid ? "/home" : "/onboard"}
          className="group mt-14 inline-flex items-center gap-3 rounded-full border border-nadi-gold/40 bg-nadi-gold/10 px-10 py-4 text-nadi-glow shadow-[0_0_40px_-10px_rgba(212,175,111,0.6)] backdrop-blur-md transition hover:bg-nadi-gold/20"
        >
          <span className="serif text-lg tracking-[0.3em]">
            {uid ? "내 화면으로" : "관상 보러 가기"}
          </span>
          <span className="text-nadi-gold transition group-hover:translate-x-1">→</span>
        </Link>

        <Link
          href={uid ? "/onboard" : "/me"}
          className="mt-4 text-xs tracking-[0.3em] text-ink-100/50 underline-offset-4 hover:text-nadi-glow hover:underline"
        >
          {uid ? "다른 이메일로 새로 시작" : "이미 시작했나요? — 이메일로 이어가기"}
        </Link>

        <p className="mt-6 text-xs tracking-widest text-ink-100/40">
          이메일과 디지털 흔적 몇 가지로 60초 만에
        </p>

        <div className="mt-24 grid w-full grid-cols-3 gap-3 text-[11px] text-ink-100/50 sm:text-xs">
          <Stat top="16개" bottom="WORLD TYPE" />
          <Stat top="∞" bottom="멀티 페르소나" />
          <Stat top="매일" bottom="다른 당신" />
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="mx-auto max-w-3xl px-6 py-32">
        <p className="serif text-center text-xs tracking-[0.5em] text-nadi-gold/80">
          디지털 관상이란
        </p>
        <h2 className="serif mt-6 text-center text-3xl leading-snug text-nadi-glow sm:text-4xl">
          과거에는 얼굴을 보았다.
          <br />
          이제는 디지털 흔적을 본다.
        </h2>
        <div className="mt-14 space-y-6 text-center text-base leading-[1.95] text-ink-100/70">
          <p>
            새벽 두 시의 플레이리스트, 검색 기록, 답장하는 속도,
            <br />
            당신이 머무는 시간대 — 그것이 새 시대의 관상이다.
          </p>
          <p className="text-nadi-rose/90">
            그리고 당신의 디지털 관상은, 결코 하나가 아니다.
          </p>
        </div>
      </section>

      {/* WORLD MAP TEASER */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <p className="serif text-center text-xs tracking-[0.5em] text-nadi-gold/80">
          NADIFE WORLD MAP
        </p>
        <h2 className="serif mt-6 text-center text-3xl leading-snug text-nadi-glow sm:text-4xl">
          16개의 세계, 무한한 당신
        </h2>
        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WORLD_TYPES.map((w) => (
            <div
              key={w.slug}
              className="glass group relative overflow-hidden rounded-2xl p-5 transition hover:-translate-y-1"
              style={{
                background: `radial-gradient(circle at 30% 0%, ${w.hue}22, transparent 60%), rgba(245,230,200,0.04)`
              }}
            >
              <div
                className="serif text-2xl"
                style={{ color: w.hue }}
              >
                {w.glyph}
              </div>
              <div className="serif mt-3 text-lg text-nadi-glow">{w.title}</div>
              <div className="mt-1 text-[11px] tracking-widest text-ink-100/50">
                {w.vibe}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h2 className="serif text-4xl leading-snug text-nadi-glow">
          당신 안의
          <br />
          <span className="bg-gradient-to-r from-nadi-gold to-nadi-rose bg-clip-text text-transparent">
            여러 명을 만나보세요.
          </span>
        </h2>
        <Link
          href="/onboard"
          className="mt-12 inline-flex items-center gap-2 rounded-full bg-nadi-gold px-10 py-4 font-medium text-nadi-night transition hover:bg-nadi-glow"
        >
          <span className="serif tracking-[0.2em]">시작하기</span>
          <span>→</span>
        </Link>
        <p className="mt-10 text-xs tracking-[0.4em] text-ink-100/30">
          우리는 모두 다른 세계를 살아간다
        </p>
      </section>
    </main>
  );
}

function Stat({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="glass rounded-2xl px-3 py-4">
      <div className="serif text-xl text-nadi-glow sm:text-2xl">{top}</div>
      <div className="mt-1 tracking-[0.25em] text-ink-100/40">{bottom}</div>
    </div>
  );
}
