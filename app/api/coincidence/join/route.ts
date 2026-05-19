import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { coincidenceState, isCoincidenceForceOpen } from "@/lib/dialogue";
import { todayKey } from "@/lib/utils";
import { generateAlias } from "@/lib/alias";

const Body = z.object({ userId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const { userId } = Body.parse(await req.json());
    const state = coincidenceState();
    const forceOpen = isCoincidenceForceOpen();
    const windowTime = state.currentWindow ?? (forceOpen ? "DEBUG" : null);
    if (!windowTime) {
      return NextResponse.json({ error: "지금은 우연의 시간이 아니에요." }, { status: 409 });
    }

    const date = todayKey();
    const alias = generateAlias(userId, date, "coincidence");

    // 이미 이 윈도우에 참여했나?
    const existing = await prisma.coincidenceMeeting.findFirst({
      where: {
        date,
        windowTime,
        OR: [{ aliceId: userId }, { bobId: userId }]
      }
    });
    if (existing) {
      return NextResponse.json({ meetingId: existing.id, alreadyJoined: true });
    }

    // 같은 윈도우에 alice로 대기 중인 사람을 찾아 페어
    const waiting = await prisma.coincidenceMeeting.findFirst({
      where: {
        date,
        windowTime,
        bobId: null,
        aliceId: { not: userId }
      },
      orderBy: { createdAt: "asc" }
    });
    if (waiting) {
      const updated = await prisma.coincidenceMeeting.update({
        where: { id: waiting.id },
        data: { bobId: userId, bobAlias: alias }
      });
      return NextResponse.json({ meetingId: updated.id, paired: true });
    }

    // 새 미팅으로 대기 — 같은 윈도우 안에 다른 사람이 join하면 페어
    const created = await prisma.coincidenceMeeting.create({
      data: {
        date,
        windowTime,
        aliceId: userId,
        bobId: null,
        aliceAlias: alias,
        bobAlias: null
      }
    });
    return NextResponse.json({ meetingId: created.id, waiting: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
