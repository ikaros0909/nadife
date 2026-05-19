import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setUidCookie } from "@/lib/session";

const Body = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const { email } = Body.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        personas: { select: { id: true, kind: true } },
        daily: { select: { id: true } }
      }
    });
    if (!user) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    return setUidCookie(
      NextResponse.json({
        found: true,
        userId: user.id,
        hasMain: user.personas.some((p) => p.kind === "MAIN"),
        hasSub: user.personas.some((p) => p.kind === "SUB"),
        dailyCount: user.daily.length
      }),
      user.id
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
