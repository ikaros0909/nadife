import { redirect } from "next/navigation";
import { getUidFromCookie } from "@/lib/session";
import { ConnectDetailClient } from "./ConnectDetailClient";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ u?: string }>;
}) {
  const { id } = await params;
  const { u } = await searchParams;
  const fromCookie = await getUidFromCookie();
  const userId = u ?? fromCookie ?? null;
  if (!userId) redirect("/me");
  return <ConnectDetailClient userId={userId} partnerId={id} />;
}
