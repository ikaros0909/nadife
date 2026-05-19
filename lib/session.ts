import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE = "nadife_uid";
const MAX_AGE = 60 * 60 * 24 * 365; // 1년

export function setUidCookie(res: NextResponse, userId: string): NextResponse {
  res.cookies.set(COOKIE, userId, {
    httpOnly: false, // 클라이언트에서도 읽을 수 있게 (UX용 — 보안 요구는 아직 약함)
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE
  });
  return res;
}

export async function getUidFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}
