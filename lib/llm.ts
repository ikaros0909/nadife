// 통합 LLM 추상화 — OpenAI ↔ 로컬 모델(stream-it 등)을 한 곳에서 스위치.
//
// 환경변수:
//   AI_PROVIDER          = "openai" | "local"  (기본 openai)
//   OPENAI_API_KEY       = sk-...
//   OPENAI_MODEL         = gpt-4o-mini (기본)
//   LOCAL_LLM_URL        = http://10.2.2.44:8000/api/chat
//   LOCAL_LLM_API_KEY    = jk-...
//   LOCAL_LLM_SECRET_KEY = sk-...
//   LOCAL_LLM_MODEL      = exaone3.5:32b (기본)
//   LOCAL_LLM_TIMEOUT_MS = 60000 (기본)

import OpenAI from "openai";

export type Provider = "openai" | "local";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmJsonSchema = {
  name: string;
  schema: Record<string, unknown>;
};

export type LlmRequest = {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  /** 구조화된 JSON 출력을 요청. local 모델은 system_prompt에 자연어 가이드가 주입되고 후처리로 파싱한다. */
  jsonSchema?: LlmJsonSchema;
  /** 강제 모델명 — 미지정 시 provider 기본값 */
  model?: string;
};

export function currentProvider(): Provider {
  const v = (process.env.AI_PROVIDER ?? "").toLowerCase();
  if (v === "local") return "local";
  return "openai";
}

export function isLlmConfigured(): boolean {
  if (currentProvider() === "local") {
    return !!process.env.LOCAL_LLM_URL;
  }
  return !!process.env.OPENAI_API_KEY;
}

/** 메인 진입점 — 텍스트 응답을 돌려준다 */
export async function llmComplete(req: LlmRequest): Promise<string> {
  if (currentProvider() === "local") return localComplete(req);
  return openaiComplete(req);
}

/** JSON 응답 — 스키마를 강제 + 파싱 후 반환. 실패 시 throw */
export async function llmJson<T>(req: LlmRequest): Promise<T> {
  if (!req.jsonSchema) {
    throw new Error("llmJson requires jsonSchema");
  }
  const raw = await llmComplete(req);
  const cleaned = extractJsonBlob(raw);
  return JSON.parse(cleaned) as T;
}

// ────────────────── OpenAI ──────────────────

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function openaiComplete(req: LlmRequest): Promise<string> {
  const model = req.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await openaiClient.chat.completions.create({
    model,
    temperature: req.temperature ?? 0.7,
    max_tokens: req.maxTokens,
    messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    response_format: req.jsonSchema
      ? {
          type: "json_schema",
          json_schema: { name: req.jsonSchema.name, schema: req.jsonSchema.schema, strict: true }
        }
      : undefined
  });
  return res.choices[0]?.message?.content ?? "";
}

// ────────────────── Local (stream-it) ──────────────────

const MAX_LOCAL_RETRIES = 1;
const RETRY_DELAY_MS = 800;

async function localComplete(req: LlmRequest): Promise<string> {
  const url = process.env.LOCAL_LLM_URL;
  if (!url) throw new Error("LOCAL_LLM_URL not set");

  const apiKey = process.env.LOCAL_LLM_API_KEY ?? "";
  const secretKey = process.env.LOCAL_LLM_SECRET_KEY ?? "";
  const model = req.model || process.env.LOCAL_LLM_MODEL || "exaone3.5:32b";
  const timeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT_MS ?? "60000");

  // 1) system_prompt 빌드 — 모든 system 메시지 합치고, JSON 가이드 부가
  const sysMessages = req.messages.filter((m) => m.role === "system");
  let systemPrompt = sysMessages.map((m) => m.content).join("\n\n");

  if (req.jsonSchema) {
    systemPrompt += `

[출력 형식 — 매우 중요]
답은 반드시 아래 JSON 형식으로만 작성한다. 마크다운 코드펜스(\`\`\`)·주석·설명 일체 금지. 키 이름은 정확히 그대로.

${buildJsonGuide(req.jsonSchema.schema)}`;
  }

  // 2) user/assistant 메시지를 단일 message 필드로 직렬화
  const turns = req.messages.filter((m) => m.role !== "system");
  const message =
    turns.length === 1 && turns[0].role === "user"
      ? turns[0].content
      : turns
          .map((m) => (m.role === "user" ? `[사용자] ${m.content}` : `[너의 이전 답] ${m.content}`))
          .join("\n\n");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;
  if (secretKey) headers["X-Secret-Key"] = secretKey;

  const body = JSON.stringify({
    message,
    system_prompt: systemPrompt || undefined,
    model,
    temperature: req.temperature ?? 0.5
  });

  // 5xx 발생 시 1회 재시도
  for (let attempt = 0; attempt <= MAX_LOCAL_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, { method: "POST", headers, signal: ctrl.signal, body });
    } catch (err) {
      clearTimeout(t);
      // network/timeout — 마지막 시도면 throw, 아니면 재시도
      if (attempt < MAX_LOCAL_RETRIES) {
        console.warn(`[local-llm] network error, retrying (${attempt + 1}/${MAX_LOCAL_RETRIES})`, err);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw err;
    }
    clearTimeout(t);

    if (res.ok) {
      return await parseLocalResponse(res, model);
    }

    // 5xx면 재시도, 4xx면 즉시 throw
    const bodyText = await res.text().catch(() => "");
    if (res.status >= 500 && res.status < 600 && attempt < MAX_LOCAL_RETRIES) {
      console.warn(
        `[local-llm] ${res.status}: ${bodyText.slice(0, 100)} — retrying (${attempt + 1}/${MAX_LOCAL_RETRIES})`
      );
      await sleep(RETRY_DELAY_MS);
      continue;
    }
    throw new Error(`local LLM ${res.status}: ${bodyText.slice(0, 200)}`);
  }

  throw new Error("local LLM: 재시도 모두 실패");
}

async function parseLocalResponse(res: Response, model: string): Promise<string> {
  const json = (await res.json()) as Record<string, unknown>;

  // stream-it 응답 계약: { answer, model, usage: { input_tokens, output_tokens, total_tokens } }
  const answer = typeof json.answer === "string" ? json.answer : null;

  const usage = json.usage as
    | { input_tokens?: number; output_tokens?: number; total_tokens?: number }
    | undefined;
  if (usage) {
    console.log(
      `[local-llm] model=${json.model ?? model} in=${usage.input_tokens ?? "?"} out=${usage.output_tokens ?? "?"} total=${usage.total_tokens ?? "?"}`
    );
  }

  if (answer && answer.trim()) return answer;

  // 계약 외 응답 — 안전 fallback으로 흔히 쓰이는 키들도 탐색
  for (const k of ["response", "message", "content", "text"]) {
    const v = json[k];
    if (typeof v === "string" && v.trim()) return v;
  }

  throw new Error(`local LLM: 응답에 answer가 없어요. keys=${Object.keys(json).join(",")}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ────────────────── 로컬 모델용 JSON 가이드 빌더 ──────────────────

type SchemaProp = {
  type?: string;
  enum?: unknown[];
  description?: string;
  items?: SchemaProp;
};

/**
 * JSON 스키마를 로컬 LLM이 따르기 쉬운 "예시 형태"로 변환한다.
 * 스키마 raw dump (additionalProperties: false 등)는 모델이 헷갈려해서 500 유발할 수 있음.
 */
function buildJsonGuide(schema: Record<string, unknown>): string {
  const props = schema.properties as Record<string, SchemaProp> | undefined;
  if (!props || typeof props !== "object") {
    return JSON.stringify(schema, null, 2);
  }

  const lines: string[] = ["{"];
  const entries = Object.entries(props);
  for (let i = 0; i < entries.length; i++) {
    const [key, prop] = entries[i];
    const comma = i < entries.length - 1 ? "," : "";
    let valueHint = '"<문자열>"';

    if (Array.isArray(prop.enum) && prop.enum.length > 0) {
      const enumList = prop.enum.slice(0, 50).join(" | ");
      valueHint = `"<반드시 다음 중 하나: ${enumList}>"`;
    } else if (prop.type === "number" || prop.type === "integer") {
      valueHint = "<숫자>";
    } else if (prop.type === "boolean") {
      valueHint = "<true 또는 false>";
    } else if (prop.type === "array") {
      valueHint = "[<문자열>, ...]";
    } else if (prop.description) {
      valueHint = `"<${prop.description}>"`;
    }

    lines.push(`  "${key}": ${valueHint}${comma}`);
  }
  lines.push("}");
  return lines.join("\n");
}

// ────────────────── JSON 추출 헬퍼 ──────────────────

/** 모델이 ```json ... ``` 펜스로 감쌌거나 앞뒤에 설명을 붙였을 때 JSON 본문만 추출 */
function extractJsonBlob(s: string): string {
  if (!s) throw new Error("empty LLM response");
  const trimmed = s.trim();

  // ```json ... ``` 또는 ``` ... ```
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();

  // 첫 { … 마지막 } 자르기
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);

  return trimmed;
}
