import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isLlmConfigured, llmComplete } from "@/lib/llm";

type KindSpec = {
  /** 최대 글자 수 — 클라이언트의 textarea max와 일치 */
  max: number;
  /** AI에게 줄 길이/톤 가이드 */
  hint: string;
};

const KINDS: Record<string, KindSpec> = {
  "campfire-whisper": {
    max: 140,
    hint: "세계 모닥불의 짧은 속삭임. 60~140자. 따뜻하고 짧게, 같은 세계 사람들에게 슬쩍 흘려놓는 결."
  },
  "resonance-note": {
    max: 140,
    hint: "오늘의 박자를 한 줄로 흘려보내는 글. 60~140자. 시(詩)에 가까운 한 호흡."
  },
  "letter-first": {
    max: 400,
    hint: "익명의 첫 편지. 300~400자. 인사–본문 한두 단락–마무리 흐름. 정중하면서 다정하게."
  },
  "letter-reply": {
    max: 400,
    hint: "편지 답장. 300~400자. 받은 편지의 결에 자연스레 닿는 한 통."
  },
  "coincidence-line": {
    max: 200,
    hint: "우연의 1분 안에 흘려보내는 단 한 줄. 40~200자. 다시 못 보내는 짧은 인사."
  },
  "postbox-drop": {
    max: 200,
    hint: "일주일에 한 번, 공중에 띄우는 한 줄. 60~200자. 누구에게도 보내지 않은 듯 모두에게 닿는 결."
  },
  "postbox-reply": {
    max: 200,
    hint: "익명 답신 한 줄. 40~200자. 공중에 떠도는 글에 슬며시 닿는 결."
  },
  "duet-line": {
    max: 200,
    hint: "듀엣 책의 한 줄. 40~200자. 주어진 시제(時題)의 결을 짧고 또렷하게."
  }
};

const Body = z.object({
  kind: z.enum([
    "campfire-whisper",
    "resonance-note",
    "letter-first",
    "letter-reply",
    "coincidence-line",
    "postbox-drop",
    "postbox-reply",
    "duet-line"
  ]),
  text: z.string().min(1).max(2000),
  /** 답장이라면 받은 편지 / 듀엣 시제 등 보조 컨텍스트 */
  context: z.string().max(2000).optional().nullable()
});

const SYSTEM_BASE = `너는 NADIPE의 "글쓰기 도우미"다.
사용자가 적은 거친 메모 — 몇 단어, 짧은 한 줄, 또는 정리되지 않은 두세 문장 — 을 받아,
같은 감정과 의도를 유지한 채 **가독성 높고 시(詩)에 가까운 한국어 문장**으로 다듬어준다.

[지킬 규칙]
- 사용자의 본래 의미·감정을 절대 바꾸지 않는다. 없던 사실을 만들지 않는다.
- 거친 단어 몇 개만 들어와도, 그 결을 살려 자연스럽게 채워 쓴다.
- 톤: 따뜻하면서도 단정한, 한국어 산문/짧은 시. 명사형 종결 금지(문장형으로 끝낸다).
- 인스타 스토리에 캡쳐할 만큼 매력적이고, 한 호흡으로 읽힌다.
- 부정 라벨/진단/비하/외모·스펙 언급 금지.
- 이모지·해시태그·따옴표로 감싸지 않는다.
- 출력은 다듬은 본문 텍스트 하나만. 마크다운, 머리말, 설명, 코드펜스 금지.`;

export async function POST(req: NextRequest) {
  try {
    const { kind, text, context } = Body.parse(await req.json());
    const spec = KINDS[kind];

    if (!isLlmConfigured()) {
      return NextResponse.json(
        { error: "AI가 설정되어 있지 않아요." },
        { status: 503 }
      );
    }

    const system = `${SYSTEM_BASE}

[이번 글의 형식]
${spec.hint}

[길이 제한]
- 결과는 ${spec.max}자를 절대 넘기지 않는다.`;

    const userParts = [
      `[사용자의 거친 메모]\n${text.trim()}`
    ];
    if (context && context.trim()) {
      userParts.push(
        `[참고 — 직전 맥락]\n${context.trim().slice(0, 1500)}\n\n위 맥락의 결을 살피되, 직접 인용·복제하지 말고 사용자의 메모를 다듬는 데에만 쓴다.`
      );
    }

    const raw = await llmComplete({
      temperature: 0.85,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userParts.join("\n\n") }
      ]
    });

    const polished = sanitize(raw, spec.max);
    if (!polished) {
      return NextResponse.json({ error: "다듬은 결과가 비어 있어요." }, { status: 502 });
    }
    return NextResponse.json({ polished });
  } catch (err: unknown) {
    console.error("[ai.polish]", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/** 코드펜스/따옴표/접두 라벨 제거 + 길이 컷 */
function sanitize(raw: string, maxLen: number): string {
  let s = (raw ?? "").trim();
  // ```...``` 펜스
  const fence = s.match(/```(?:[a-zA-Z]*)\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // 양 끝 따옴표/꺽쇠
  s = s.replace(/^["'“”『「《]+/, "").replace(/["'“”』」》]+$/, "");
  // 흔한 머리말("다듬은 글:", "결과:" 등) 제거
  s = s.replace(/^(다듬은\s*글|결과|출력|답|polished)\s*[:：]\s*/i, "");
  s = s.trim();
  if (s.length > maxLen) {
    s = s.slice(0, maxLen).trimEnd();
  }
  return s;
}
