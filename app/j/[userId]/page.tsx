import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { buildJourneyStats, type JourneyPoint } from "@/lib/journey";
import { getWorldType } from "@/lib/world-map";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function generateMetadata({
  params
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { personas: true, daily: true }
  });
  if (!user) return { title: "NADIFE" };
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
  ];
  const stats = buildJourneyStats(points);
  const title = `${stats.daysSinceStart}일, ${stats.uniqueWorlds}개의 세계 — NADIFE`;
  const description = "AI가 그린 나의 페르소나 궤적. 당신은 어떤 세계들을 거쳐왔나요?";
  const og = `${BASE}/api/og/journey/${userId}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: og, width: 1200, height: 1200 }],
      type: "article"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [og]
    }
  };
}

export default async function PublicJourneyPage({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      personas: { orderBy: { createdAt: "asc" } },
      daily: { orderBy: { date: "asc" } }
    }
  });
  if (!user) notFound();

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
  const latest = points[points.length - 1];
  const latestWorld = latest ? getWorldType(latest.worldSlug) : null;

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-xl px-6 py-10">
      <header className="flex items-center justify-between">
        <p className="serif text-[10px] tracking-[0.5em] text-nadi-gold">NADIFE</p>
        <Link href="/" className="text-xs tracking-widest text-ink-100/40 hover:text-nadi-glow">
          홈 →
        </Link>
      </header>

      <p className="serif mt-10 text-center text-xs tracking-[0.45em] text-nadi-gold">
        누군가의 디지털 궤적
      </p>

      <h1 className="serif mt-6 text-center text-3xl leading-snug text-nadi-glow sm:text-4xl">
        {stats.daysSinceStart}일,
        <br />
        <span className="bg-gradient-to-r from-nadi-gold to-nadi-rose bg-clip-text text-transparent">
          {stats.uniqueWorlds}개의 세계
        </span>
      </h1>

      {/* OG image as visual */}
      <div className="mt-10 overflow-hidden rounded-3xl border border-nadi-gold/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/og/journey/${userId}`}
          alt="journey"
          className="w-full"
        />
      </div>

      {latestWorld && (
        <div
          className="mt-8 rounded-2xl border p-6 text-center"
          style={{
            borderColor: `${latestWorld.hue}55`,
            background: `radial-gradient(circle at top, ${latestWorld.hue}22, transparent 60%)`
          }}
        >
          <p className="serif text-[10px] tracking-[0.4em] text-nadi-gold">현재 좌표</p>
          <p
            className="serif mt-3 text-2xl"
            style={{ color: latestWorld.hue }}
          >
            {latestWorld.title}
          </p>
          <p className="mt-2 text-xs text-ink-100/60">“{latest!.oneLiner}”</p>
        </div>
      )}

      <div className="mt-12 rounded-3xl border border-nadi-gold/30 bg-gradient-to-br from-nadi-gold/5 to-nadi-rose/5 p-6 text-center">
        <h3 className="serif text-xl text-nadi-glow">
          당신의 궤적은 어떻게 그려질까요?
        </h3>
        <p className="mt-2 text-xs text-ink-100/60">
          이메일 하나로 시작 — 매일 다른 당신을 기록합니다.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/onboard"
            className="rounded-full bg-gradient-to-r from-nadi-gold to-nadi-rose px-8 py-3 text-xs tracking-[0.3em] text-nadi-night hover:opacity-90"
          >
            내 궤적 시작하기
          </Link>
          <Link
            href="/me"
            className="rounded-full border border-nadi-gold/40 bg-nadi-gold/5 px-8 py-3 text-xs tracking-[0.3em] text-nadi-glow hover:bg-nadi-gold/15"
          >
            이메일로 이어가기
          </Link>
        </div>
      </div>
    </main>
  );
}
