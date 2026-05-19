import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUidFromCookie } from "@/lib/session";
import { todayKey } from "@/lib/utils";
import { getWorldType } from "@/lib/world-map";
import { PersonalNav } from "@/components/PersonalNav";
import { maybeSeedTodayInBackground } from "@/lib/seed-runner";

export const dynamic = "force-dynamic";

export default async function MeetHub({
  searchParams
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const fromCookie = await getUidFromCookie();
  const userId = u ?? fromCookie ?? null;
  if (!userId) redirect("/me");

  // 백그라운드로 오늘의 AI 페르소나 풀 채우기 (한 프로세스당 하루 1회만 실제 실행)
  maybeSeedTodayInBackground();

  const date = todayKey();

  const [main, daily, mirror, myNote, letterInboxCount, openDuetCount] = await Promise.all([
    prisma.persona.findFirst({
      where: { userId, kind: "MAIN" },
      orderBy: { createdAt: "desc" }
    }),
    prisma.dailyPersona.findUnique({ where: { userId_date: { userId, date } } }),
    prisma.mirrorEncounter.findUnique({ where: { userId_date: { userId, date } } }),
    prisma.resonanceNote.findUnique({ where: { userId_date: { userId, date } } }),
    prisma.letterThread.count({
      where: {
        status: "ACTIVE",
        OR: [{ initiatorId: userId }, { receiverId: userId }]
      }
    }),
    prisma.duetBook.count({
      where: {
        status: "OPEN",
        OR: [{ authorAId: userId }, { authorBId: userId }]
      }
    })
  ]);

  if (!main) redirect("/onboard");

  const baseWorld = getWorldType(daily?.worldType ?? main.worldType);

  // 모닥불 현재 인원 (오늘)
  const campfire = await prisma.campfire.findUnique({
    where: { worldType_date: { worldType: baseWorld.slug, date } },
    include: { _count: { select: { presences: true } } }
  });
  const campfirePresenceCount = campfire?._count.presences ?? 0;

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-6 pb-20">
      <PersonalNav userId={userId} current="meet" />

      <section className="pt-2">
        <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">MEET</p>
        <h1 className="serif mt-4 text-3xl leading-[1.2] text-nadi-glow sm:text-4xl">
          오늘의 만남
          <br />
          <span className="bg-gradient-to-r from-nadi-gold to-nadi-rose bg-clip-text text-transparent">
            세 갈래 길
          </span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-100/65">
          누군가에게 다가가지 않아도 — 같은 세계 속에 있다는 것만으로 충분합니다.
        </p>
      </section>

      <section className="mt-12 space-y-5">
        {/* ─── 분류 1. 그저 있어도 되는 만남 ─── */}
        <p className="serif text-[10px] tracking-[0.45em] text-nadi-gold/70">
          있는 만남
        </p>

        {/* 1. 세계 모닥불 */}
        <Link
          href={`/meet/campfire?u=${userId}`}
          className="group block overflow-hidden rounded-3xl border border-nadi-gold/30 p-7 transition hover:-translate-y-0.5"
          style={{
            background: `radial-gradient(circle at 0% 0%, ${baseWorld.hue}22, transparent 55%), rgba(11,14,26,0.55)`
          }}
        >
          <div className="flex items-center justify-between">
            <span className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
              CAMPFIRE · 세계 모닥불
            </span>
            <span
              className="rounded-full px-3 py-1 text-[10px] tracking-[0.3em]"
              style={{ color: baseWorld.hue, border: `1px solid ${baseWorld.hue}44` }}
            >
              지금 {campfirePresenceCount}명
            </span>
          </div>
          <h3 className="serif mt-6 text-2xl leading-snug text-nadi-glow">
            <span style={{ color: baseWorld.hue }}>{baseWorld.title}</span>의 사람들
            <br />
            오늘의 모닥불에 모이는 중
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-ink-100/65">
            아무 말 안 해도 돼요. 그저 들어와 있는 것만으로 같은 세계임을 확인할 수 있어요.
            <br />
            24시간 후, 모닥불은 사라집니다.
          </p>
          <p className="mt-5 text-[10px] tracking-widest text-nadi-gold group-hover:text-nadi-glow">
            들어가기 →
          </p>
        </Link>

        {/* 2. 페르소나 미러 */}
        <Link
          href={`/meet/mirror?u=${userId}`}
          className="group block overflow-hidden rounded-3xl border border-nadi-rose/30 p-7 transition hover:-translate-y-0.5"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, rgba(196,123,138,0.18), transparent 55%), rgba(11,14,26,0.55)"
          }}
        >
          <div className="flex items-center justify-between">
            <span className="serif text-[10px] tracking-[0.5em] text-nadi-rose">
              MIRROR · 페르소나 미러
            </span>
            <span className="rounded-full border border-nadi-rose/40 px-3 py-1 text-[10px] tracking-[0.3em] text-nadi-rose">
              {mirror?.signal ? "신호 보냄" : "오늘 1명"}
            </span>
          </div>
          <h3 className="serif mt-6 text-2xl leading-snug text-nadi-glow">
            나와 가장 먼 세계의
            <br />
            한 사람을 만나기
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-ink-100/65">
            매일 오직 한 명. 정해진 세 가지 신호 중 하나만 보낼 수 있어요. 답이 와도 안 와도 괜찮습니다.
          </p>
          <p className="mt-5 text-[10px] tracking-widest text-nadi-rose group-hover:text-nadi-glow">
            오늘의 거울 →
          </p>
        </Link>

        {/* 3. 오늘 합주 */}
        <Link
          href={`/meet/resonance?u=${userId}`}
          className={`group block overflow-hidden rounded-3xl border p-7 transition hover:-translate-y-0.5 ${
            daily ? "border-nadi-gold/30" : "border-ink-100/15"
          }`}
          style={{
            background:
              "radial-gradient(circle at 0% 100%, rgba(212,175,111,0.12), transparent 55%), rgba(11,14,26,0.55)"
          }}
        >
          <div className="flex items-center justify-between">
            <span className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
              RESONANCE · 오늘 합주
            </span>
            <span className="rounded-full border border-nadi-gold/40 px-3 py-1 text-[10px] tracking-[0.3em] text-nadi-gold">
              {myNote ? "한 줄 보냄" : daily ? "한 줄 가능" : "오늘 미체크"}
            </span>
          </div>
          <h3 className="serif mt-6 text-2xl leading-snug text-nadi-glow">
            오늘 같은 박자를
            <br />
            살아가는 사람들의 한 줄
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-ink-100/65">
            댓글도 메시지도 없어요. 그저 읽고, 가장 와닿는 한 줄에 ‘공명’ 한 번.
          </p>
          <p className="mt-5 text-[10px] tracking-widest text-nadi-gold group-hover:text-nadi-glow">
            {daily ? "들어가기 →" : "오늘의 페르소나 먼저 →"}
          </p>
        </Link>

        {/* ─── 분류 2. 글이 오가는 만남 ─── */}
        <p className="serif mt-8 text-[10px] tracking-[0.45em] text-nadi-gold/70">
          오가는 만남
        </p>

        {/* 4. 편지함 */}
        <Link
          href={`/meet/letter?u=${userId}`}
          className="group block overflow-hidden rounded-3xl border border-nadi-gold/30 p-7 transition hover:-translate-y-0.5"
          style={{
            background:
              "radial-gradient(circle at 0% 100%, rgba(212,175,111,0.18), transparent 55%), rgba(11,14,26,0.55)"
          }}
        >
          <div className="flex items-center justify-between">
            <span className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
              LETTER · 편지함
            </span>
            <span className="rounded-full border border-nadi-gold/40 px-3 py-1 text-[10px] tracking-[0.3em] text-nadi-gold">
              진행 {letterInboxCount}통
            </span>
          </div>
          <h3 className="serif mt-6 text-2xl leading-snug text-nadi-glow">
            한 사람과 다섯 왕복.
            <br />
            천천히 도착하는 익명 편지.
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-ink-100/65">
            300~400자 한 통. 답장은 하루 안에. 5왕복이 끝나면 편지함은 닫혀요.
          </p>
          <p className="mt-5 text-[10px] tracking-widest text-nadi-gold group-hover:text-nadi-glow">
            편지함 →
          </p>
        </Link>

        {/* 5. 우연의 시간 */}
        <Link
          href={`/meet/coincidence?u=${userId}`}
          className="group block overflow-hidden rounded-3xl border border-nadi-rose/30 p-7 transition hover:-translate-y-0.5"
          style={{
            background:
              "radial-gradient(circle at 100% 100%, rgba(196,123,138,0.18), transparent 55%), rgba(11,14,26,0.55)"
          }}
        >
          <div className="flex items-center justify-between">
            <span className="serif text-[10px] tracking-[0.5em] text-nadi-rose">
              COINCIDENCE · 우연의 시간
            </span>
            <span className="rounded-full border border-nadi-rose/40 px-3 py-1 text-[10px] tracking-[0.3em] text-nadi-rose">
              하루 6번 · 1분
            </span>
          </div>
          <h3 className="serif mt-6 text-2xl leading-snug text-nadi-glow">
            11:11, 12:34, 22:22, 23:33 — 1분.
            <br />
            그 60초 안의 우연.
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-ink-100/65">
            정해진 시각에 입장한 사람과 단 한 줄을 주고받습니다. 이어갈 수 없어요.
          </p>
          <p className="mt-5 text-[10px] tracking-widest text-nadi-rose group-hover:text-nadi-glow">
            우연의 시간 →
          </p>
        </Link>

        {/* 6. 듀엣 */}
        <Link
          href={`/meet/duet?u=${userId}`}
          className="group block overflow-hidden rounded-3xl border border-nadi-gold/30 p-7 transition hover:-translate-y-0.5"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, rgba(212,175,111,0.15), transparent 55%), rgba(11,14,26,0.55)"
          }}
        >
          <div className="flex items-center justify-between">
            <span className="serif text-[10px] tracking-[0.5em] text-nadi-gold">
              DUET · 미러 듀엣
            </span>
            <span className="rounded-full border border-nadi-gold/40 px-3 py-1 text-[10px] tracking-[0.3em] text-nadi-gold">
              열린 책 {openDuetCount}권
            </span>
          </div>
          <h3 className="serif mt-6 text-2xl leading-snug text-nadi-glow">
            서로 본 두 사람이
            <br />
            함께 쓰는 짧은 책.
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-ink-100/65">
            5개의 시제(時題). 한 줄씩 — 10줄이 모이면 한 권의 책이 완성됩니다.
            <br />
            미러에서 서로 천리안이 닿은 두 사람만.
          </p>
          <p className="mt-5 text-[10px] tracking-widest text-nadi-gold group-hover:text-nadi-glow">
            듀엣 →
          </p>
        </Link>

        {/* 7. 공중 한 줄 */}
        <Link
          href={`/meet/postbox?u=${userId}`}
          className="group block overflow-hidden rounded-3xl border border-nadi-rose/30 p-7 transition hover:-translate-y-0.5"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, rgba(196,123,138,0.18), transparent 55%), rgba(11,14,26,0.55)"
          }}
        >
          <div className="flex items-center justify-between">
            <span className="serif text-[10px] tracking-[0.5em] text-nadi-rose">
              POSTBOX · 공중 한 줄
            </span>
            <span className="rounded-full border border-nadi-rose/40 px-3 py-1 text-[10px] tracking-[0.3em] text-nadi-rose">
              일주일 1회
            </span>
          </div>
          <h3 className="serif mt-6 text-2xl leading-snug text-nadi-glow">
            공중에 띄우는 한 줄,
            <br />
            그 답신 중 한 명만 별표.
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-ink-100/65">
            모두에게 보이지만 누구도 명시적으로 부르지 않아요. 답신은 익명. 별표받은 사람만 그 사실을 알게 됩니다.
          </p>
          <p className="mt-5 text-[10px] tracking-widest text-nadi-rose group-hover:text-nadi-glow">
            공중 한 줄 →
          </p>
        </Link>
      </section>

      <p className="mt-16 text-center text-[10px] tracking-[0.45em] text-ink-100/30">
        강요하지 않고, 흩어지지 않게
      </p>
    </main>
  );
}
