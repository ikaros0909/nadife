// 페르소나 분석 — provider-agnostic. 내부에서 lib/llm을 통해 OpenAI/로컬을 스위치.

import { WORLD_TYPES, getWorldType, pickContrastingType, type WorldType } from "./world-map";
import { isLlmConfigured, llmJson } from "./llm";

export type AnalyzeInput = {
  nickname?: string | null;
  birthYear?: number | null;
  email: string;
  interests: string[];
  platforms: string[];
  activeHours?: string | null;
  vibe?: string | null;
};

export type PersonaAnalysis = {
  worldSlug: string;
  title: string;
  oneLiner: string;
  rhythm: string;
  speed: string;
  emotion: string;
  recovery: string;
  energy: string;
  narrative: string;
};

const SYSTEM_BASE = `너는 NADIFE의 "디지털 관상가"다.
사람의 디지털 흔적을 읽고 그가 속한 "세계 유형"을 짚어내는 AI다.
규칙:
- 절대 외모/스펙/우열로 판단하지 않는다.
- 분류는 반드시 주어진 16개 WORLD TYPES 중 하나의 slug로 한다.
- 톤은 따뜻하면서도 시(詩)에 가까운 한국어. 명사형 종결 금지, 문장형으로 쓴다.
- 문장은 짧고 단정해야 하며, 인스타 스토리에 캡쳐할 만큼 매력적이어야 한다.
- 부정적 라벨이나 진단적 표현(병리적, 회피형 등) 절대 금지.
- 출력은 반드시 JSON. 추가 설명 금지.`;

function worldList(): string {
  return WORLD_TYPES.map(
    (w) => `- ${w.slug} :: ${w.title} :: ${w.keywords.join(", ")} :: "${w.oneLiner}"`
  ).join("\n");
}

function userPrompt(input: AnalyzeInput, mode: "MAIN" | "SUB"): string {
  const age = input.birthYear ? new Date().getFullYear() - input.birthYear : null;
  const lines = [
    `이메일 도메인: ${input.email.split("@")[1] ?? "unknown"}`,
    input.nickname ? `닉네임: ${input.nickname}` : null,
    age ? `대략 연령: ${age}세` : null,
    input.activeHours ? `주된 활동 시간대: ${input.activeHours}` : null,
    input.interests.length ? `관심사: ${input.interests.join(", ")}` : null,
    input.platforms.length ? `연동/주 사용 플랫폼: ${input.platforms.join(", ")}` : null,
    input.vibe ? `자가 묘사 한 줄: "${input.vibe}"` : null
  ].filter(Boolean);

  return `[입력]\n${lines.join("\n")}\n\n[과제]\n${
    mode === "MAIN"
      ? "이 사람의 '메인 페르소나(메인캐)'를 16개 WORLD TYPE 중 가장 잘 어울리는 하나로 매핑하라."
      : "이 사람의 '숨은 부캐(섀도우 페르소나)'를 찾아라. 메인캐와는 의도적으로 다른 결을 가진, '본인도 몰랐을 또 다른 자아'를 골라야 한다."
  }`;
}

const PERSONA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["worldSlug", "title", "oneLiner", "rhythm", "speed", "emotion", "recovery", "energy", "narrative"],
  properties: {
    worldSlug: { type: "string", enum: WORLD_TYPES.map((w) => w.slug) },
    title: { type: "string" },
    oneLiner: { type: "string", description: "한 줄 AI 한줄평. 25자 이내 권장. 시적이고 따뜻하게." },
    rhythm: { type: "string", description: "사회적 리듬을 한 단어~한 구절." },
    speed: { type: "string", description: "관계가 가까워지는 속도를 한 구절." },
    emotion: { type: "string", description: "감정 표현 방식 한 구절." },
    recovery: { type: "string", description: "회복 방식 한 구절." },
    energy: { type: "string", description: "사회적 에너지 한 구절." },
    narrative: { type: "string", description: "2~3문장의 짧은 산문. 한국어." }
  }
};

export async function analyzePersona(
  input: AnalyzeInput,
  mode: "MAIN" | "SUB",
  opts?: { avoidSlug?: string }
): Promise<PersonaAnalysis> {
  if (!isLlmConfigured()) {
    return mockAnalysis(input, mode, opts?.avoidSlug);
  }

  let avoidLine = "";
  if (mode === "SUB" && opts?.avoidSlug) {
    const farTypes = pickContrastingType(opts.avoidSlug).slice(0, 6);
    avoidLine = `\n\n[부캐 선정 가이드]\n메인캐(${opts.avoidSlug})와 결이 가장 다른 후보군을 우선 고려해. 다음 중 하나가 유력하다:\n${farTypes
      .map((t) => `- ${t.slug} (${t.title})`)
      .join("\n")}\n반드시 메인캐와 같은 slug는 피한다.`;
  }

  const system = `${SYSTEM_BASE}\n\n[WORLD TYPES]\n${worldList()}${avoidLine}`;

  try {
    const parsed = await llmJson<PersonaAnalysis>({
      temperature: mode === "SUB" ? 0.95 : 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt(input, mode) }
      ],
      jsonSchema: { name: "persona_analysis", schema: PERSONA_SCHEMA }
    });

    if (mode === "SUB" && parsed.worldSlug === opts?.avoidSlug) {
      const fallback = pickContrastingType(opts.avoidSlug)[0];
      parsed.worldSlug = fallback.slug;
      parsed.title = fallback.title;
    }
    if (!getWorldType(parsed.worldSlug)) {
      parsed.worldSlug = WORLD_TYPES[0].slug;
    }
    return parsed;
  } catch (err) {
    console.error("[persona.analyze] fallback to mock", err);
    return mockAnalysis(input, mode, opts?.avoidSlug);
  }
}

export type DailyAnalysis = {
  worldSlug: string;
  title: string;
  oneLiner: string;
};

const DAILY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["worldSlug", "title", "oneLiner"],
  properties: {
    worldSlug: { type: "string", enum: WORLD_TYPES.map((w) => w.slug) },
    title: { type: "string" },
    oneLiner: { type: "string" }
  }
};

export async function analyzeToday(mood: string, mainSlug?: string): Promise<DailyAnalysis> {
  if (!isLlmConfigured()) return mockToday(mood);

  const system = `${SYSTEM_BASE}\n\n[WORLD TYPES]\n${worldList()}\n\n[과제]\n사용자의 "오늘의 컨디션" 한 단어를 보고 오늘 어울리는 WORLD TYPE 하나와 25자 이내 한줄평을 생성해.`;

  try {
    return await llmJson<DailyAnalysis>({
      temperature: 0.9,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `오늘 컨디션: "${mood}"\n참고 — 평소 메인캐: ${mainSlug ?? "unknown"}` }
      ],
      jsonSchema: { name: "daily", schema: DAILY_SCHEMA }
    });
  } catch (err) {
    console.error("[persona.today] fallback", err);
    return mockToday(mood);
  }
}

// ───────── Fallback (LLM 미구성 시) ─────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function mockAnalysis(input: AnalyzeInput, mode: "MAIN" | "SUB", avoid?: string): PersonaAnalysis {
  const seed = hashStr(input.email + (input.activeHours ?? "") + mode);
  let pool: WorldType[] = WORLD_TYPES;
  if (mode === "SUB" && avoid) pool = pickContrastingType(avoid).slice(0, 8);
  const pick = pool[seed % pool.length];

  return {
    worldSlug: pick.slug,
    title: pick.title,
    oneLiner: pick.oneLiner,
    rhythm: pick.keywords[0] ?? "자기 박자",
    speed: pick.keywords[1] ?? "느림",
    emotion: pick.keywords[2] ?? "은은함",
    recovery: "혼자 회복형",
    energy: "선택적 몰입",
    narrative: pick.longLiner
  };
}

function mockToday(mood: string): DailyAnalysis {
  const seed = hashStr(mood + new Date().toDateString());
  const pick = WORLD_TYPES[seed % WORLD_TYPES.length];
  return { worldSlug: pick.slug, title: pick.title, oneLiner: pick.oneLiner };
}
