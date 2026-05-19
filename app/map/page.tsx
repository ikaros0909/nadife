import Link from "next/link";
import { prisma } from "@/lib/db";
import { WORLD_TYPES, getWorldType, worldDistance } from "@/lib/world-map";
import { PersonalNav } from "@/components/PersonalNav";
import { getUidFromCookie } from "@/lib/session";

export default async function MapPage({
  searchParams
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const cookieUid = await getUidFromCookie();
  const userId = u ?? cookieUid ?? null;
  const personas = userId
    ? await prisma.persona.findMany({ where: { userId } })
    : [];
  const main = personas.find((p) => p.kind === "MAIN");
  const sub = personas.find((p) => p.kind === "SUB");
  const distance =
    main && sub
      ? worldDistance(getWorldType(main.worldType), getWorldType(sub.worldType))
      : null;

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-4xl px-6 pb-20">
      {userId ? (
        <PersonalNav userId={userId} current="map" />
      ) : (
        <header className="flex items-center justify-between py-6">
          <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
            NADIFE · WORLD MAP
          </p>
          <Link href="/" className="text-xs tracking-widest text-ink-100/40 hover:text-nadi-glow">
            ← 홈
          </Link>
        </header>
      )}

      <h1 className="serif mt-4 text-3xl leading-snug text-nadi-glow sm:text-4xl">
        16개의 세계,
        <br />
        무한한 당신
      </h1>

      {/* MAP CANVAS */}
      <div className="relative mt-14 aspect-square w-full overflow-hidden rounded-3xl border border-nadi-gold/20 bg-[radial-gradient(circle_at_center,_rgba(212,175,111,0.08),_transparent_70%),linear-gradient(180deg,#0b0e1a,#11142b)]">
        {/* 축 */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-nadi-gold/15" />
        <div className="absolute bottom-0 top-0 left-1/2 w-px bg-nadi-gold/15" />
        {/* 축 라벨 */}
        <span className="absolute left-3 top-3 text-[10px] tracking-[0.3em] text-ink-100/40">
          ↑ 사람 중심
        </span>
        <span className="absolute bottom-3 left-3 text-[10px] tracking-[0.3em] text-ink-100/40">
          ↓ 혼자 몰입
        </span>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.3em] text-ink-100/40">
          변화·속도 →
        </span>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.3em] text-ink-100/40">
          ← 안정·느림
        </span>

        {WORLD_TYPES.map((w) => {
          // axis 좌표 -1..1 -> 0..100%
          const x = (w.axisX + 1) * 50;
          const y = (1 - w.axisY) * 50; // 위가 +1
          const isMine = personas.some((p) => p.worldType === w.slug);
          return (
            <div
              key={w.slug}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div
                className="group relative flex flex-col items-center"
                style={{ color: w.hue }}
              >
                <span
                  className={`serif text-2xl transition ${isMine ? "scale-150 drop-shadow-[0_0_18px_currentColor]" : "opacity-70"}`}
                >
                  {w.glyph}
                </span>
                <span
                  className={`mt-1 text-[10px] tracking-wider transition ${isMine ? "text-nadi-glow font-bold" : "text-ink-100/55"}`}
                >
                  {w.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 사용자 좌표 요약 */}
      {personas.length > 0 && (
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {personas.map((p) => {
            const w = getWorldType(p.worldType);
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-nadi-gold/25 bg-black/30 p-6"
                style={{ boxShadow: `0 0 60px -25px ${w.hue}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.4em] text-nadi-gold">
                    {p.kind === "MAIN" ? "MAIN · 메인캐" : "SUB · 부캐"}
                  </span>
                  <span className="serif text-2xl" style={{ color: w.hue }}>
                    {w.glyph}
                  </span>
                </div>
                <h3 className="serif mt-3 text-xl text-nadi-glow">{w.title}</h3>
                <p className="mt-2 text-sm text-ink-100/70">“{p.oneLiner}”</p>
                <div className="mt-3 text-[10px] tracking-[0.35em] text-ink-100/40">
                  좌표 ({w.axisX.toFixed(1)}, {w.axisY.toFixed(1)})
                </div>
              </div>
            );
          })}
        </div>
      )}

      {distance !== null && (
        <div className="mt-8 rounded-2xl border border-nadi-rose/30 bg-nadi-rose/5 p-6 text-center">
          <p className="serif text-[10px] tracking-[0.5em] text-nadi-rose">
            메인캐 ↔ 부캐 거리
          </p>
          <p className="serif mt-3 text-3xl text-nadi-glow">
            {distance.toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-ink-100/60">
            {distance > 1.4
              ? "두 자아 사이의 거리가 매우 큽니다. 당신은 두 세계를 한 사람 안에 품고 있어요."
              : distance > 0.8
              ? "꽤 다른 결을 가진 두 자아입니다."
              : "두 페르소나가 비슷한 결을 공유합니다."}
          </p>
        </div>
      )}

      <div className="mt-12 flex justify-center">
        <Link
          href={userId ? `/explore?u=${userId}` : "/explore"}
          className="rounded-full border border-nadi-gold/40 bg-nadi-gold/10 px-8 py-3 text-xs tracking-[0.3em] text-nadi-glow hover:bg-nadi-gold/20"
        >
          다른 세계 탐험하기 →
        </Link>
      </div>
    </main>
  );
}
