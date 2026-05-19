import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/utils";
import { weekKey } from "@/lib/dialogue";
import { expireOldPendings } from "@/lib/sight";
import { maybeSweepAIReplies } from "@/lib/ai-reply-runner";

/**
 * 통합 인박스 — "확인해야 할 것"의 모든 알림 카운트와 일부 미리보기.
 * /home 의 "오늘 당신을 기다리는 것" 섹션과 PersonalNav 배지가 공유.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    if (!userId) return NextResponse.json({ error: "u required" }, { status: 400 });

    // PENDING 천리안 만료 — lazy
    await expireOldPendings();

    // AI 편지 답장 큐 sweep — fire-and-forget
    maybeSweepAIReplies();

    const today = todayKey();
    const wk = weekKey();
    const sightResolveSince = new Date(Date.now() - 24 * 3600 * 1000);

    const [
      letterThreads,
      sightBalance,
      sightIncoming,
      sightResolvedSinceYesterday,
      todayMyMirror,
      openDuets,
      myResonance,
      myPostbox,
      starredMyReplyHits
    ] = await Promise.all([
      // 1. 편지: 진행 중 + 마지막 편지 가져오기
      prisma.letterThread.findMany({
        where: {
          status: "ACTIVE",
          OR: [{ initiatorId: userId }, { receiverId: userId }]
        },
        orderBy: { lastLetterAt: "desc" },
        include: {
          letters: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              senderId: true,
              alias: true,
              text: true,
              createdAt: true,
              readAt: true
            }
          }
        }
      }),

      // 2. 천리안 잔량
      prisma.user.findUnique({
        where: { id: userId },
        select: { sightBalance: true }
      }),

      // 3. 천리안: 누가 나를 보려 함 (PENDING)
      prisma.sightUse.count({
        where: { targetId: userId, status: "PENDING" }
      }),

      // 4. 천리안: 내가 본 사람이 답을 채워서 최근 24h 안에 SUCCESS로 풀린 것
      prisma.sightUse.findMany({
        where: {
          viewerId: userId,
          status: "SUCCESS",
          resolvedAt: { gt: sightResolveSince }
        },
        orderBy: { resolvedAt: "desc" },
        take: 5,
        include: {
          target: {
            select: {
              id: true,
              personas: {
                where: { kind: "MAIN" },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { worldType: true, title: true }
              }
            }
          }
        }
      }),

      // 5. 미러: 오늘 내 거울에서 상대방의 응답이 도착했는지
      prisma.mirrorEncounter.findUnique({
        where: { userId_date: { userId, date: today } }
      }),

      // 6. 듀엣: OPEN인 책 + 라인들
      prisma.duetBook.findMany({
        where: { status: "OPEN", OR: [{ authorAId: userId }, { authorBId: userId }] },
        include: {
          lines: { select: { authorId: true, themeIdx: true } }
        }
      }),

      // 7. 합주: 오늘 내 글의 공명 카운트
      prisma.resonanceNote.findUnique({
        where: { userId_date: { userId, date: today } },
        include: { _count: { select: { echoes: true } } }
      }),

      // 8. 공중: 이번 주 내 글의 답신 개수 + 별표 상태
      prisma.postbox.findUnique({
        where: { authorId_weekKey: { authorId: userId, weekKey: wk } },
        include: { _count: { select: { replies: true } } }
      }),

      // 9. 공중: 내 답신이 별표받았는지 (이번 주)
      prisma.postboxReply.findMany({
        where: {
          replierId: userId,
          postbox: { weekKey: wk, starredReplyId: { not: null } }
        },
        include: { postbox: { select: { starredReplyId: true } } }
      })
    ]);

    // ─── 편지 답장 차례 ───
    const letterAwaitingMe = letterThreads.filter((t) => {
      const last = t.letters[0];
      return !!last && last.senderId !== userId && t.letterCount < 10;
    });

    // ─── 미러 양방향 — 상대도 신호를 보냈는가 ───
    let mirrorReciprocated = false;
    if (todayMyMirror?.signal) {
      const reverse = await prisma.mirrorEncounter.findFirst({
        where: {
          userId: todayMyMirror.otherUserId,
          otherUserId: userId,
          date: today,
          signal: { not: null }
        }
      });
      mirrorReciprocated = !!reverse;
    }

    // ─── 듀엣 내 차례 ───
    // 상대가 한 줄 적어둔 시제 중 내가 아직 안 적은 게 있는 책 + 진행 정보
    const duetMyTurn = openDuets.filter((book) => {
      for (let i = 0; i < book.themes.length; i++) {
        const mine = book.lines.find((l) => l.themeIdx === i && l.authorId === userId);
        const theirs = book.lines.find((l) => l.themeIdx === i && l.authorId !== userId);
        if (!mine && theirs) return true;
      }
      return false;
    });

    // ─── 공중 별표받음 ───
    const iWasStarred = starredMyReplyHits.some(
      (r) => r.id === r.postbox.starredReplyId
    );

    // ─── 합주 공명 (오늘) ───
    const resonanceEchoes = myResonance?._count.echoes ?? 0;

    // ─── 공중 답신 ───
    const postboxReplies =
      myPostbox && !myPostbox.starredReplyId ? myPostbox._count.replies : 0;

    // ─── 카운트 묶음 ───
    const meetCount =
      letterAwaitingMe.length +
      (mirrorReciprocated ? 1 : 0) +
      duetMyTurn.length +
      resonanceEchoes +
      postboxReplies +
      (iWasStarred ? 1 : 0);

    const homeCount = sightIncoming + sightResolvedSinceYesterday.length;

    const grandTotal = meetCount + homeCount;

    // ─── 미리보기 ───
    const letterPreviews = letterAwaitingMe.slice(0, 3).map((t) => {
      const last = t.letters[0];
      return {
        threadId: t.id,
        partnerAlias: last?.alias ?? "",
        snippet: (last?.text ?? "").replace(/\n+/g, " ").slice(0, 50),
        unread: last && !last.readAt
      };
    });

    const sightResolvedPreviews = sightResolvedSinceYesterday
      .slice(0, 3)
      .map((s) => ({
        useId: s.id,
        targetTitle: s.target.personas[0]?.title ?? "디지털 자아"
      }));

    return NextResponse.json({
      sight: {
        balance: sightBalance?.sightBalance ?? 0,
        incoming: sightIncoming,
        resolvedRecently: sightResolvedSinceYesterday.length
      },
      meet: {
        letter: letterAwaitingMe.length,
        mirror: mirrorReciprocated ? 1 : 0,
        duet: duetMyTurn.length,
        resonance: resonanceEchoes,
        postboxReplies,
        postboxStarred: iWasStarred ? 1 : 0,
        total: meetCount
      },
      counts: {
        home: homeCount,
        meet: meetCount,
        total: grandTotal
      },
      previews: {
        letter: letterPreviews,
        sightResolved: sightResolvedPreviews
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
