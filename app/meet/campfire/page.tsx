import { redirect } from "next/navigation";
import { getUidFromCookie } from "@/lib/session";
import { prisma } from "@/lib/db";
import { CampfireClient } from "./CampfireClient";

export const dynamic = "force-dynamic";

export default async function CampfirePage({
  searchParams
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const fromCookie = await getUidFromCookie();
  const userId = u ?? fromCookie ?? null;
  if (!userId) redirect("/me");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/me");

  return <CampfireClient userId={userId} />;
}
