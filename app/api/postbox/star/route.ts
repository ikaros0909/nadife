import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  userId: z.string(),
  postboxId: z.string(),
  replyId: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const { userId, postboxId, replyId } = Body.parse(await req.json());
    const p = await prisma.postbox.findUnique({ where: { id: postboxId } });
    if (!p) return NextResponse.json({ error: "글이 없어요." }, { status: 404 });
    if (p.authorId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (p.starredReplyId) return NextResponse.json({ error: "이미 별표한 답신이 있어요." }, { status: 409 });

    const reply = await prisma.postboxReply.findUnique({ where: { id: replyId } });
    if (!reply || reply.postboxId !== postboxId) {
      return NextResponse.json({ error: "답신이 맞지 않아요." }, { status: 400 });
    }

    await prisma.postbox.update({
      where: { id: postboxId },
      data: { starredReplyId: replyId }
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
