import Link from "next/link";
import { prisma } from "@/lib/db";
import { WORLD_TYPES, getWorldType } from "@/lib/world-map";
import { PersonalNav } from "@/components/PersonalNav";
import { getUidFromCookie } from "@/lib/session";

const ESSAYS: Record<string, { title: string; body: string }[]> = {
  "night-maker": [
    {
      title: "새벽 2시에 살아있는 사람들",
      body: "낮 동안 흘려보낸 자신을 새벽이 되어서야 다시 줍는 사람들. 그들은 늦는 게 아니라, 다른 박자를 살고 있다."
    }
  ],
  "city-leader": [
    {
      title: "대기업 인간의 외로움",
      body: "결정을 내리는 사람은 외롭다. 그 외로움을 미팅과 회식으로 가리는 사람들의 세계."
    }
  ],
  "deep-sea": [
    {
      title: "쉽게 가까워지지 않는 사람들",
      body: "표면에 잘 떠오르지 않지만 한번 내려가면 끝까지 함께 가는 사람들."
    }
  ],
  "spark-explorer": [
    {
      title: "왜 그들의 답장은 늦는가",
      body: "지금 이 순간이 너무 강해서. 다음 순간이 너무 궁금해서."
    }
  ],
  "silent-archivist": [
    {
      title: "말하지 않고 쓰는 사람들",
      body: "그들에게 메모장은 친구이자 일기장이며, 자기 자신과의 대화 창구다."
    }
  ],
  "starlight-optimist": [
    {
      title: "포기를 모르는 사람들",
      body: "어둠 속에서 별을 먼저 보는 눈을 가진 사람들."
    }
  ],
  "dawn-thinker": [
    {
      title: "사람 많은 곳에서 혼자였던 사람",
      body: "그 자리에 있었지만 거기 있지 않았다. 그가 머문 곳은 늘 자기 안이었다."
    }
  ]
};

function defaultEssay(slug: string) {
  const w = getWorldType(slug);
  return [
    {
      title: `${w.title}의 세계`,
      body: w.longLiner
    }
  ];
}

export default async function ExplorePage({
  searchParams
}: {
  searchParams: Promise<{ u?: string; kind?: string }>;
}) {
  const { u } = await searchParams;
  const cookieUid = await getUidFromCookie();
  const userId = u ?? cookieUid ?? null;
  const personas = userId
    ? await prisma.persona.findMany({ where: { userId } })
    : [];
  const mineSlugs = new Set(personas.map((p) => p.worldType));

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-6 pb-20">
      {userId ? (
        <PersonalNav userId={userId} current="explore" />
      ) : (
        <header className="flex items-center justify-between py-6">
          <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
            다른 세계 탐험
          </p>
          <Link href="/" className="text-xs tracking-widest text-ink-100/40 hover:text-nadi-glow">
            ← 홈
          </Link>
        </header>
      )}

      <h1 className="serif mt-4 text-3xl leading-snug text-nadi-glow sm:text-4xl">
        우리는 모두
        <br />
        다른 세계를 살아간다.
      </h1>
      <p className="mt-4 text-sm text-ink-100/60">
        AI가 그려낸 16개 세계의 단편을 둘러보세요.
      </p>

      <div className="mt-12 space-y-12">
        {WORLD_TYPES.map((w) => {
          const essays = ESSAYS[w.slug] ?? defaultEssay(w.slug);
          const isMine = mineSlugs.has(w.slug);
          return (
            <article
              key={w.slug}
              className="rounded-3xl border border-nadi-gold/15 bg-black/30 p-7"
              style={{
                borderLeft: `2px solid ${w.hue}`,
                boxShadow: isMine ? `0 0 60px -20px ${w.hue}` : undefined
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="serif text-2xl" style={{ color: w.hue }}>
                    {w.glyph}
                  </span>
                  <div>
                    <h2 className="serif text-xl text-nadi-glow">{w.title}</h2>
                    <p className="text-[10px] tracking-[0.3em] text-ink-100/40">
                      {w.keywords.join(" · ")}
                    </p>
                  </div>
                </div>
                {isMine && (
                  <span className="rounded-full border border-nadi-gold/40 bg-nadi-gold/10 px-3 py-1 text-[10px] tracking-[0.3em] text-nadi-gold">
                    당신의 좌표
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-5">
                {essays.map((e, i) => (
                  <div key={i}>
                    <h3 className="serif text-base text-nadi-glow">{e.title}</h3>
                    <p className="serif mt-2 text-sm leading-[1.95] text-ink-100/70">{e.body}</p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-16 rounded-3xl border border-nadi-gold/30 bg-gradient-to-br from-nadi-gold/5 to-nadi-rose/5 p-7 text-center">
        <h3 className="serif text-xl text-nadi-glow">
          당신의 세계는 어디인가요?
        </h3>
        <Link
          href="/onboard"
          className="mt-5 inline-flex rounded-full bg-gradient-to-r from-nadi-gold to-nadi-rose px-8 py-3 text-xs tracking-[0.3em] text-nadi-night hover:opacity-90"
        >
          내 관상 보러 가기
        </Link>
      </div>
    </main>
  );
}
