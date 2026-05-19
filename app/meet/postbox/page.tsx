import { redirect } from "next/navigation";
import { getUidFromCookie } from "@/lib/session";
import { PostboxClient } from "./PostboxClient";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const fromCookie = await getUidFromCookie();
  const userId = u ?? fromCookie ?? null;
  if (!userId) redirect("/me");
  return <PostboxClient userId={userId} />;
}
