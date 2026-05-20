import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildJourneyStats, type JourneyPoint } from "@/lib/journey";
import { getUidFromCookie } from "@/lib/session";
import { JourneyView } from "./JourneyView";

export default async function JourneyPage({
  searchParams
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const uidFromCookie = await getUidFromCookie();
  const userId = u ?? uidFromCookie ?? null;

  if (!userId) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <div className="text-center">
          <p className="serif text-2xl text-nadip-glow">아직 궤적이 없어요.</p>
          <p className="mt-4 text-sm text-ink-100/60">
            이메일로 시작했었다면 이어가기, 아니면 새로 시작하세요.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/me"
              className="rounded-full border border-nadip-gold/40 bg-nadip-gold/10 px-8 py-3 text-xs tracking-[0.3em] text-nadip-glow hover:bg-nadip-gold/20"
            >
              이메일로 이어가기
            </Link>
            <Link
              href="/onboard"
              className="rounded-full bg-gradient-to-r from-nadip-gold to-nadip-rose px-8 py-3 text-xs tracking-[0.3em] text-nadip-night hover:opacity-90"
            >
              처음 시작하기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      personas: { orderBy: { createdAt: "asc" } },
      daily: { orderBy: { date: "asc" } }
    }
  });

  if (!user) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-center text-ink-100/60">
        사용자를 찾을 수 없어요. <Link href="/me" className="text-nadip-gold underline">다시 시도</Link>
      </main>
    );
  }

  const points: JourneyPoint[] = [
    ...user.personas.map((p) => ({
      id: p.id,
      source: p.kind as "MAIN" | "SUB",
      date: p.createdAt.toISOString(),
      worldSlug: p.worldType,
      title: p.title,
      oneLiner: p.oneLiner,
      axisX: p.axisX,
      axisY: p.axisY
    })),
    ...user.daily.map((d) => ({
      id: d.id,
      source: "DAILY" as const,
      date: d.date,
      worldSlug: d.worldType,
      title: d.title,
      oneLiner: d.oneLiner,
      axisX: 0,
      axisY: 0
    }))
  ].sort((a, b) => a.date.localeCompare(b.date));

  const stats = buildJourneyStats(points);

  return (
    <JourneyView
      userId={userId}
      email={user.email}
      nickname={user.nickname}
      points={points}
      stats={stats}
      personasCount={user.personas.length}
      dailyCount={user.daily.length}
    />
  );
}
