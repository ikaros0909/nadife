import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canonicalPair, checkEligibility, computeAffinity } from "@/lib/affinity";
import { checkMutualMatch } from "@/lib/match";

const Body = z.object({
  userId: z.string(),
  partnerId: z.string(),
  action: z.enum(["propose", "accept", "decline", "disconnect", "block", "unblock"])
});

export async function POST(req: NextRequest) {
  try {
    const { userId, partnerId, action } = Body.parse(await req.json());
    if (userId === partnerId) {
      return NextResponse.json({ error: "자기 자신과는 할 수 없어요." }, { status: 400 });
    }

    const [a, b] = canonicalPair(userId, partnerId);
    const existing = await prisma.connection.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } }
    });

    switch (action) {
      case "propose":
        return await handlePropose(userId, partnerId, a, b, existing);
      case "accept":
        return await handleAccept(userId, a, b, existing);
      case "decline":
        return await handleDecline(userId, a, b, existing);
      case "disconnect":
        return await handleDisconnect(userId, a, b, existing);
      case "block":
        return await handleBlock(userId, a, b, existing);
      case "unblock":
        return await handleUnblock(userId, a, b, existing);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

async function handlePropose(
  userId: string,
  partnerId: string,
  a: string,
  b: string,
  existing: { status: string; proposerId: string | null; blockedById: string | null } | null
) {
  if (existing?.status === "BLOCKED") {
    return NextResponse.json({ error: "차단된 관계예요." }, { status: 403 });
  }
  if (existing?.status === "CONNECTED") {
    return NextResponse.json({ error: "이미 연결된 상태예요." }, { status: 409 });
  }
  // 상대가 먼저 제안한 상태면 — propose 대신 accept를 써야 함
  if (
    (existing?.status === "PROPOSED_A" || existing?.status === "PROPOSED_B") &&
    existing.proposerId &&
    existing.proposerId !== userId
  ) {
    return NextResponse.json(
      { error: "이미 상대로부터 제안이 와 있어요. 수락 또는 거절을 선택하세요." },
      { status: 409 }
    );
  }
  // 내가 이미 제안 중이면 — 중복 방지
  if (
    (existing?.status === "PROPOSED_A" || existing?.status === "PROPOSED_B") &&
    existing.proposerId === userId
  ) {
    return NextResponse.json({ ok: true, alreadyProposed: true });
  }

  // 자격 검증
  const aff = await computeAffinity(userId, partnerId);
  const eligibility = checkEligibility(aff, existing?.status ?? null, userId, partnerId);
  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error: "message" in eligibility ? eligibility.message : "자격이 안 돼요.",
        reason: "reason" in eligibility ? eligibility.reason : null
      },
      { status: 403 }
    );
  }

  // 조건 매칭 — 양측의 선호도가 서로를 받아들이는가
  const [me, them] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        gender: true, country: true, region: true, birthYear: true,
        connectGenders: true, connectCountries: true, connectRegions: true,
        connectAgeMin: true, connectAgeMax: true
      }
    }),
    prisma.user.findUnique({
      where: { id: partnerId },
      select: {
        gender: true, country: true, region: true, birthYear: true,
        connectGenders: true, connectCountries: true, connectRegions: true,
        connectAgeMin: true, connectAgeMax: true
      }
    })
  ]);
  if (!me || !them) {
    return NextResponse.json({ error: "사용자를 찾을 수 없어요." }, { status: 404 });
  }
  const mutual = checkMutualMatch(
    me,
    { connectGenders: me.connectGenders, connectCountries: me.connectCountries, connectRegions: me.connectRegions, connectAgeMin: me.connectAgeMin, connectAgeMax: me.connectAgeMax },
    them,
    { connectGenders: them.connectGenders, connectCountries: them.connectCountries, connectRegions: them.connectRegions, connectAgeMin: them.connectAgeMin, connectAgeMax: them.connectAgeMax }
  );
  if (!mutual.matched) {
    return NextResponse.json(
      { error: "지금은 두 사람의 조건이 맞지 않아요. 인연은 깊지만 — 연결은 어려운 시간이에요.", reason: "match_failed" },
      { status: 403 }
    );
  }

  const isAProposer = userId === a;
  const status = isAProposer ? "PROPOSED_A" : "PROPOSED_B";

  await prisma.connection.upsert({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    update: {
      status,
      proposerId: userId,
      proposedAt: new Date(),
      // 이전 거절/해제/차단 상태에서 새 제안 시 메타 클리어
      declinedAt: null,
      declinedById: null,
      disconnectedAt: null,
      disconnectedById: null
    },
    create: {
      userAId: a,
      userBId: b,
      status,
      proposerId: userId,
      proposedAt: new Date()
    }
  });

  return NextResponse.json({ ok: true, status });
}

async function handleAccept(
  userId: string,
  a: string,
  b: string,
  existing: { status: string; proposerId: string | null } | null
) {
  if (!existing) return NextResponse.json({ error: "제안이 없어요." }, { status: 404 });
  if (existing.status !== "PROPOSED_A" && existing.status !== "PROPOSED_B") {
    return NextResponse.json({ error: "수락 가능한 제안이 아니에요." }, { status: 409 });
  }
  if (existing.proposerId === userId) {
    return NextResponse.json({ error: "내 제안은 내가 수락할 수 없어요." }, { status: 403 });
  }
  // 수락하는 쪽은 양측 중 한 명이어야 함
  if (userId !== a && userId !== b) {
    return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  }

  await prisma.connection.update({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    data: { status: "CONNECTED", acceptedAt: new Date() }
  });

  // 두 사람 사이의 모든 LetterThread를 무제한 채널로 승격
  await prisma.letterThread.updateMany({
    where: {
      OR: [
        { initiatorId: a, receiverId: b },
        { initiatorId: b, receiverId: a }
      ]
    },
    data: { unlimited: true, status: "ACTIVE", archivedAt: null }
  });

  return NextResponse.json({ ok: true, status: "CONNECTED" });
}

async function handleDecline(
  userId: string,
  a: string,
  b: string,
  existing: { status: string; proposerId: string | null } | null
) {
  if (!existing) return NextResponse.json({ error: "제안이 없어요." }, { status: 404 });
  if (existing.status !== "PROPOSED_A" && existing.status !== "PROPOSED_B") {
    return NextResponse.json({ error: "거절 가능한 제안이 아니에요." }, { status: 409 });
  }
  if (existing.proposerId === userId) {
    return NextResponse.json({ error: "내 제안을 거절할 순 없어요." }, { status: 403 });
  }
  // 거절은 상대에게 비노출이지만 status는 DECLINED로 저장 (재제안은 가능)
  await prisma.connection.update({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    data: {
      status: "DECLINED",
      declinedAt: new Date(),
      declinedById: userId
    }
  });
  return NextResponse.json({ ok: true });
}

async function handleDisconnect(
  userId: string,
  a: string,
  b: string,
  existing: { status: string } | null
) {
  if (!existing || existing.status !== "CONNECTED") {
    return NextResponse.json({ error: "연결되어 있지 않아요." }, { status: 409 });
  }
  await prisma.connection.update({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    data: {
      status: "DISCONNECTED",
      disconnectedAt: new Date(),
      disconnectedById: userId
    }
  });
  return NextResponse.json({ ok: true });
}

async function handleBlock(
  userId: string,
  a: string,
  b: string,
  existing: { status: string } | null
) {
  if (existing) {
    await prisma.connection.update({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      data: {
        status: "BLOCKED",
        blockedAt: new Date(),
        blockedById: userId
      }
    });
  } else {
    await prisma.connection.create({
      data: {
        userAId: a,
        userBId: b,
        status: "BLOCKED",
        blockedAt: new Date(),
        blockedById: userId
      }
    });
  }
  // 차단 시 모든 편지함 영구 종료
  await prisma.letterThread.updateMany({
    where: {
      status: "ACTIVE",
      OR: [
        { initiatorId: a, receiverId: b },
        { initiatorId: b, receiverId: a }
      ]
    },
    data: { status: "DROPPED", archivedAt: new Date() }
  });
  return NextResponse.json({ ok: true });
}

async function handleUnblock(
  userId: string,
  a: string,
  b: string,
  existing: { status: string; blockedById: string | null } | null
) {
  if (!existing || existing.status !== "BLOCKED") {
    return NextResponse.json({ error: "차단된 상태가 아니에요." }, { status: 409 });
  }
  if (existing.blockedById !== userId) {
    return NextResponse.json({ error: "차단한 사람만 해제할 수 있어요." }, { status: 403 });
  }
  // 차단 해제 후 — DISCONNECTED 상태로 두어 다시 만남부터 시작
  await prisma.connection.update({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    data: {
      status: "DISCONNECTED",
      blockedAt: null,
      blockedById: null
    }
  });
  return NextResponse.json({ ok: true });
}
