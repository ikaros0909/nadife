import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUidFromCookie } from "@/lib/session";
import { todayKey } from "@/lib/utils";
import { buildJourneyStats, type JourneyPoint } from "@/lib/journey";
import { HomeView } from "./HomeView";
import { maybeSeedTodayInBackground } from "@/lib/seed-runner";
import { maybeSweepAIReplies } from "@/lib/ai-reply-runner";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const fromCookie = await getUidFromCookie();
  const userId = u ?? fromCookie ?? null;
  if (!userId) redirect("/me");

  maybeSeedTodayInBackground();
  maybeSweepAIReplies();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      personas: { orderBy: { createdAt: "asc" } },
      daily: { orderBy: { date: "desc" }, take: 14 }
    }
  });

  if (!user) redirect("/me");

  const allPoints: JourneyPoint[] = [
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

  const stats = buildJourneyStats(allPoints);

  const today = todayKey();
  const todayDaily = await prisma.dailyPersona.findUnique({
    where: { userId_date: { userId, date: today } }
  });

  const main = user.personas.find((p) => p.kind === "MAIN") ?? null;
  const sub = user.personas.find((p) => p.kind === "SUB") ?? null;

  if (!main) {
    // 메인캐도 없으면 온보딩으로
    redirect("/onboard");
  }

  return (
    <HomeView
      userId={userId}
      nickname={user.nickname}
      email={user.email}
      main={{
        id: main.id,
        worldType: main.worldType,
        title: main.title,
        oneLiner: main.oneLiner,
        rhythm: main.rhythm,
        speed: main.speed,
        emotion: main.emotion,
        recovery: main.recovery,
        energy: main.energy,
        narrative: main.narrative
      }}
      sub={
        sub
          ? {
              id: sub.id,
              worldType: sub.worldType,
              title: sub.title,
              oneLiner: sub.oneLiner,
              rhythm: sub.rhythm,
              speed: sub.speed,
              emotion: sub.emotion,
              recovery: sub.recovery,
              energy: sub.energy,
              narrative: sub.narrative
            }
          : null
      }
      todayDaily={todayDaily}
      recentDailies={user.daily.map((d) => ({
        id: d.id,
        date: d.date,
        mood: d.mood,
        worldType: d.worldType,
        title: d.title,
        oneLiner: d.oneLiner
      }))}
      allPoints={allPoints}
      stats={stats}
      sight={{
        balance: user.sightBalance,
        todayGranted: !!(await prisma.sightGrant.findUnique({
          where: { userId_date: { userId, date: today } }
        })),
        profile: {
          gender: user.gender,
          country: user.country,
          occupation: user.occupation,
          region: user.region,
          birthYear: user.birthYear
        },
        pendingIncoming: await prisma.sightUse.count({
          where: { targetId: userId, status: "PENDING" }
        })
      }}
    />
  );
}
