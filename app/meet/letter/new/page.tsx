import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUidFromCookie } from "@/lib/session";
import { getWorldType, worldDistance } from "@/lib/world-map";
import { generateAlias } from "@/lib/alias";
import { todayKey } from "@/lib/utils";
import { NewLetterClient } from "./NewLetterClient";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ u?: string; to?: string }>;
}) {
  const { u, to } = await searchParams;
  const fromCookie = await getUidFromCookie();
  const userId = u ?? fromCookie ?? null;
  if (!userId) redirect("/me");

  const me = await prisma.persona.findFirst({
    where: { userId, kind: "MAIN" },
    orderBy: { createdAt: "desc" }
  });
  if (!me) redirect("/onboard");
  const myWorld = getWorldType(me.worldType);

  // 후보 추천 — 비슷한 세계 3명 + 먼 세계 3명. AI 포함.
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: userId },
      personas: { some: { kind: "MAIN" } }
    },
    include: {
      personas: { where: { kind: "MAIN" }, orderBy: { createdAt: "desc" }, take: 1 }
    },
    take: 200
  });

  const date = todayKey();
  const ranked = candidates
    .map((c) => {
      const p = c.personas[0];
      const w = getWorldType(p.worldType);
      return {
        id: c.id,
        alias: generateAlias(c.id, date, "letter"),
        worldType: w.slug,
        worldTitle: w.title,
        hue: w.hue,
        oneLiner: p.oneLiner,
        d: worldDistance(myWorld, w)
      };
    })
    .sort((a, b) => a.d - b.d);

  const near = ranked.slice(0, Math.min(3, ranked.length));
  const far = ranked.slice(-3).reverse();

  const selectedTo = to ?? null;

  return (
    <NewLetterClient
      userId={userId}
      myWorld={{ title: myWorld.title, hue: myWorld.hue }}
      nearCandidates={near}
      farCandidates={far}
      initialTargetId={selectedTo}
    />
  );
}
