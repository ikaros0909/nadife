import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/utils";
import { TodayClient } from "./TodayClient";

export default async function TodayPage({
  searchParams
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  if (!u) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-center">
        <div className="text-ink-100/60">
          <p>먼저 디지털 관상을 만들어주세요.</p>
          <a href="/onboard" className="mt-6 inline-block text-nadip-gold underline">시작하기 →</a>
        </div>
      </main>
    );
  }

  const date = todayKey();
  const todayEntry = await prisma.dailyPersona.findUnique({
    where: { userId_date: { userId: u, date } }
  });
  const history = await prisma.dailyPersona.findMany({
    where: { userId: u },
    orderBy: { date: "desc" },
    take: 14
  });

  return <TodayClient userId={u} initial={todayEntry} history={history} />;
}
