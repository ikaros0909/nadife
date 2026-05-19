import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { seedDailyAI, countTodayAIUsers } from "@/lib/seed-ai";

const Body = z.object({
  count: z.number().int().min(1).max(300).optional(),
  date: z.string().optional()
});

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.SEED_SECRET;
  // SEED_SECRET 미설정 시 — 개발 편의를 위해 localhost에서만 허용
  if (!secret) {
    const host = req.headers.get("host") ?? "";
    return host.startsWith("localhost") || host.startsWith("127.0.0.1");
  }
  const provided = req.headers.get("x-seed-secret") ?? "";
  return provided === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const json = await req.json().catch(() => ({}));
    const { count, date } = Body.parse(json);
    const result = await seedDailyAI({ count, date });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const todayAI = await countTodayAIUsers();
  return NextResponse.json({ todayAI });
}
