// 편지함 AI 답장 처리 — setTimeout 대신 DB 클레임 기반.
// 서버 재시작에도 큐가 살아남음. /api/inbox, /api/letter/thread/[id], /home 등에서 lazy 트리거.

import { createHash } from "crypto";
import { prisma } from "./db";
import { generateAILetterReply } from "./dialogue";
import { generateAlias } from "./alias";
import { todayKey } from "./utils";
import { getWorldType } from "./world-map";

const CLAIM_TTL_MS = 5 * 60 * 1000;     // 5분 후 자동 만료 (실패 복구)
const SWEEP_DEBOUNCE_MS = 30 * 1000;    // 30초 이내 sweep 했으면 skip
const MAX_THREADS_PER_SWEEP = 30;

let lastSweepAt = 0;
let sweepInFlight: Promise<unknown> | null = null;

/** 한 thread당 답장 지연(60~180s). thread id 해시로 결정적으로 분산 */
function delayMsForThread(threadId: string): number {
  const h = createHash("md5").update(threadId).digest();
  const n = h.readUInt32BE(0);
  return 60_000 + (n % 120_000);
}

/** 답장이 필요한 모든 thread를 sweep. fire-and-forget — 호출자는 await하지 않음 */
export function maybeSweepAIReplies(): void {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_DEBOUNCE_MS) return;
  if (sweepInFlight) return;
  lastSweepAt = now;
  sweepInFlight = runSweep()
    .catch((err) => console.error("[ai-reply-sweep]", err))
    .finally(() => {
      sweepInFlight = null;
    });
}

async function runSweep(): Promise<void> {
  const now = Date.now();
  const threads = await prisma.letterThread.findMany({
    where: {
      status: "ACTIVE",
      lastLetterAt: { lt: new Date(now - 30_000) }, // 최소 30s는 지났어야 큰틀에서 후보
      OR: [
        { aiReplyClaimedAt: null },
        { aiReplyClaimedAt: { lt: new Date(now - CLAIM_TTL_MS) } }
      ]
    },
    include: {
      letters: { orderBy: { createdAt: "desc" }, take: 1 },
      initiator: { select: { id: true, isAI: true } },
      receiver: { select: { id: true, isAI: true } }
    },
    take: MAX_THREADS_PER_SWEEP
  });

  for (const t of threads) {
    const last = t.letters[0];
    if (!last) continue;
    const partnerId = last.senderId === t.initiatorId ? t.receiverId : t.initiatorId;
    const partner = partnerId === t.initiatorId ? t.initiator : t.receiver;
    if (!partner.isAI) continue; // 상대가 사람이면 — 사람이 답할 때까지 기다림

    // 마지막 글이 AI 본인이면 — 이미 답함, skip
    const lastSenderIsThisPartner = last.senderId === partnerId;
    if (lastSenderIsThisPartner) continue;

    // thread-specific delay 통과?
    const dueAt = last.createdAt.getTime() + delayMsForThread(t.id);
    if (now < dueAt) continue;

    // process — 비동기로 흘려보냄
    void processAIReply(t.id).catch((err) =>
      console.error("[ai-reply-process]", t.id, err)
    );
  }
}

/** 특정 thread에 대해 답장 가능한지 확인하고 처리. fire-and-forget */
export function maybeProcessThread(threadId: string): void {
  void processAIReply(threadId).catch((err) =>
    console.error("[ai-reply-process-one]", threadId, err)
  );
}

async function processAIReply(threadId: string): Promise<void> {
  // 1) claim — 가능하면 자기 자신을 락
  const claim = await prisma.letterThread.updateMany({
    where: {
      id: threadId,
      status: "ACTIVE",
      OR: [
        { aiReplyClaimedAt: null },
        { aiReplyClaimedAt: { lt: new Date(Date.now() - CLAIM_TTL_MS) } }
      ]
    },
    data: { aiReplyClaimedAt: new Date() }
  });
  if (claim.count === 0) return; // 다른 워커가 잡았거나 status 변경됨

  try {
    const thread = await prisma.letterThread.findUnique({
      where: { id: threadId },
      include: {
        letters: { orderBy: { createdAt: "asc" } },
        initiator: { select: { id: true, isAI: true } },
        receiver: { select: { id: true, isAI: true } }
      }
    });
    if (!thread || thread.status !== "ACTIVE") return;

    const last = thread.letters[thread.letters.length - 1];
    if (!last) return;

    const partnerId = last.senderId === thread.initiatorId ? thread.receiverId : thread.initiatorId;
    const partner = partnerId === thread.initiatorId ? thread.initiator : thread.receiver;
    if (!partner.isAI) return; // 상대가 사람
    if (last.senderId === partnerId) return; // AI가 마지막에 보냄

    // delay 검증
    if (Date.now() - last.createdAt.getTime() < delayMsForThread(threadId)) return;

    // AI persona 컨텍스트
    const aiUser = await prisma.user.findUnique({
      where: { id: partnerId },
      include: { personas: { where: { kind: "MAIN" }, take: 1 } }
    });
    if (!aiUser) return;
    const persona = aiUser.personas[0];
    const world = persona ? getWorldType(persona.worldType) : null;

    const aiText = await generateAILetterReply({
      partnerLetters: thread.letters.map((l) => ({
        text: l.text,
        isMine: l.senderId === partnerId
      })),
      receiverWorldTitle: world?.title ?? "조용한 사람",
      receiverOneLiner: persona?.oneLiner ?? "느린 박자로 살아가는 사람"
    });

    const newCount = thread.letterCount + 1;
    const shouldArchive = newCount >= 10;

    // 저장 — race 재확인
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.letterThread.findUnique({
        where: { id: threadId },
        include: { letters: { orderBy: { createdAt: "desc" }, take: 1 } }
      });
      if (!fresh || fresh.status !== "ACTIVE") return;
      const lastNow = fresh.letters[0];
      if (lastNow && lastNow.senderId === partnerId) return; // 누가 먼저 처리함

      await tx.letter.create({
        data: {
          threadId,
          senderId: partnerId,
          alias: generateAlias(partnerId, todayKey(), "letter"),
          text: aiText,
          isAI: true
        }
      });
      await tx.letterThread.update({
        where: { id: threadId },
        data: {
          letterCount: newCount,
          lastLetterAt: new Date(),
          status: shouldArchive ? "ARCHIVED" : "ACTIVE",
          archivedAt: shouldArchive ? new Date() : undefined,
          aiReplyClaimedAt: null
        }
      });
    });
  } catch (err) {
    console.error("[ai-reply-process]", threadId, err);
    // 실패 시 claim 해제 → 다음 sweep에서 재시도
    await prisma.letterThread
      .update({ where: { id: threadId }, data: { aiReplyClaimedAt: null } })
      .catch(() => {});
  }
}
