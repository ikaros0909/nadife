import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  userId: z.string(),
  gender: z.string().max(20).optional(),
  country: z.string().max(40).optional(),
  occupation: z.string().max(40).optional(),
  region: z.string().max(40).optional(),
  birthYear: z.number().int().min(1940).max(2020).optional()
});

export async function POST(req: NextRequest) {
  try {
    const { userId, gender, country, occupation, region, birthYear } = Body.parse(
      await req.json()
    );

    // 빈 문자열 → null로 정규화
    const norm = (s?: string) => (s && s.trim() ? s.trim() : null);

    await prisma.user.update({
      where: { id: userId },
      data: {
        gender: gender === undefined ? undefined : norm(gender),
        country: country === undefined ? undefined : norm(country),
        occupation: occupation === undefined ? undefined : norm(occupation),
        region: region === undefined ? undefined : norm(region),
        birthYear: birthYear === undefined ? undefined : birthYear
      }
    });

    // 나에게 향한 PENDING 천리안을 모두 SUCCESS 처리
    const resolved = await prisma.sightUse.updateMany({
      where: { targetId: userId, status: "PENDING" },
      data: { status: "SUCCESS", resolvedAt: new Date() }
    });

    return NextResponse.json({ resolved: resolved.count });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
