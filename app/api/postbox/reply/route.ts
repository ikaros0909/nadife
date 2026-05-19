import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { moderate } from "@/lib/moderation";
import { generateAlias } from "@/lib/alias";
import { todayKey } from "@/lib/utils";

const Body = z.object({
  userId: z.string(),
  postboxId: z.string(),
  text: z.string().min(2).max(200)
});

export async function POST(req: NextRequest) {
  try {
    const { userId, postboxId, text } = Body.parse(await req.json());

    const p = await prisma.postbox.findUnique({ where: { id: postboxId } });
    if (!p) return NextResponse.json({ error: "글이 없어요." }, { status: 404 });
    if (p.authorId === userId) {
      return NextResponse.json({ error: "내 글에는 답할 수 없어요." }, { status: 400 });
    }

    const mod = moderate(text, { maxLen: 200 });
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 400 });

    try {
      const r = await prisma.postboxReply.create({
        data: {
          postboxId,
          replierId: userId,
          text: mod.text,
          alias: generateAlias(userId, todayKey(), "postbox")
        }
      });
      return NextResponse.json({ replyId: r.id });
    } catch (err: unknown) {
      const code = err instanceof Object && "code" in err ? (err as { code?: string }).code : undefined;
      if (code === "P2002") {
        return NextResponse.json(
          { error: "이미 이 글에 답신했어요." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
