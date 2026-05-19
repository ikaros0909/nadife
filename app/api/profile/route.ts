import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { roundCoord } from "@/lib/match";

// GET — 내 프로필 + 선호도 + 위치 상태 조회
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    if (!userId) return NextResponse.json({ error: "u required" }, { status: 400 });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        nickname: true,
        birthYear: true,
        gender: true,
        country: true,
        occupation: true,
        region: true,
        connectGenders: true,
        connectCountries: true,
        connectRegions: true,
        connectAgeMin: true,
        connectAgeMax: true,
        geoOptIn: true,
        geoLat: true,
        geoLng: true,
        geoUpdatedAt: true
      }
    });
    if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ profile: user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// PATCH — 프로필 부분 갱신
const Body = z.object({
  userId: z.string(),
  // 노출용 필드 (천리안)
  nickname: z.string().max(40).nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  birthYear: z.number().int().min(1900).max(2025).nullable().optional(),
  country: z.string().max(40).nullable().optional(),
  occupation: z.string().max(40).nullable().optional(),
  region: z.string().max(40).nullable().optional(),
  // 연결 선호도
  connectGenders: z.array(z.string().max(20)).max(5).optional(),
  connectCountries: z.array(z.string().max(40)).max(20).optional(),
  connectRegions: z.array(z.string().max(40)).max(20).optional(),
  connectAgeMin: z.number().int().min(15).max(120).nullable().optional(),
  connectAgeMax: z.number().int().min(15).max(120).nullable().optional(),
  // 위치
  geoOptIn: z.boolean().optional(),
  geoLat: z.number().min(-90).max(90).nullable().optional(),
  geoLng: z.number().min(-180).max(180).nullable().optional()
});

export async function PATCH(req: NextRequest) {
  try {
    const data = Body.parse(await req.json());

    const update: Record<string, unknown> = {};
    if ("nickname" in data) update.nickname = data.nickname;
    if ("gender" in data) update.gender = data.gender;
    if ("birthYear" in data) update.birthYear = data.birthYear;
    if ("country" in data) update.country = data.country;
    if ("occupation" in data) update.occupation = data.occupation;
    if ("region" in data) update.region = data.region;
    if ("connectGenders" in data) update.connectGenders = data.connectGenders;
    if ("connectCountries" in data) update.connectCountries = data.connectCountries;
    if ("connectRegions" in data) update.connectRegions = data.connectRegions;
    if ("connectAgeMin" in data) update.connectAgeMin = data.connectAgeMin;
    if ("connectAgeMax" in data) update.connectAgeMax = data.connectAgeMax;

    if ("geoOptIn" in data) {
      update.geoOptIn = data.geoOptIn;
      if (data.geoOptIn === false) {
        // opt-out 시 좌표도 즉시 제거
        update.geoLat = null;
        update.geoLng = null;
        update.geoUpdatedAt = null;
      }
    }
    if (
      typeof data.geoLat === "number" &&
      typeof data.geoLng === "number"
    ) {
      update.geoLat = roundCoord(data.geoLat);
      update.geoLng = roundCoord(data.geoLng);
      update.geoUpdatedAt = new Date();
    }

    await prisma.user.update({ where: { id: data.userId }, data: update });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
