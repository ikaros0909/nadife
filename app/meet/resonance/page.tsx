import { redirect } from "next/navigation";
import { getUidFromCookie } from "@/lib/session";
import { ResonanceClient } from "./ResonanceClient";

export const dynamic = "force-dynamic";

export default async function ResonancePage({
  searchParams
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const fromCookie = await getUidFromCookie();
  const userId = u ?? fromCookie ?? null;
  if (!userId) redirect("/me");
  return <ResonanceClient userId={userId} />;
}
