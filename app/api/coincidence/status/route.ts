import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { coincidenceState, isCoincidenceForceOpen, COINCIDENCE_WINDOWS } from "@/lib/dialogue";
import { todayKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    if (!userId) return NextResponse.json({ error: "u required" }, { status: 400 });

    const state = coincidenceState();
    const forceOpen = isCoincidenceForceOpen();

    // 오늘 내가 참여한 우연 — 한 윈도우당 1번
    const date = todayKey();
    const myMeeting = await prisma.coincidenceMeeting.findFirst({
      where: { date, OR: [{ aliceId: userId }, { bobId: userId }] },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      windows: COINCIDENCE_WINDOWS,
      open: state.open || forceOpen,
      currentWindow: state.currentWindow,
      nextWindow: state.nextWindow,
      secondsUntilNext: state.secondsUntilNext,
      secondsRemainingInCurrent: state.secondsRemainingInCurrent,
      forceOpen,
      myMeeting: myMeeting
        ? {
            id: myMeeting.id,
            windowTime: myMeeting.windowTime,
            iAmAlice: myMeeting.aliceId === userId,
            partnerAlias: myMeeting.aliceId === userId ? myMeeting.bobAlias : myMeeting.aliceAlias,
            myLine: myMeeting.aliceId === userId ? myMeeting.aliceLine : myMeeting.bobLine,
            partnerLine:
              myMeeting.aliceId === userId ? myMeeting.bobLine : myMeeting.aliceLine,
            sealedAt: myMeeting.sealedAt
          }
        : null
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
