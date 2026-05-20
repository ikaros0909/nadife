// 대화형 만남 4종(편지/우연/듀엣/공중 한 줄) 공용 헬퍼

import { todayKey } from "./utils";

// ─────────────── 시간/주차 ───────────────

/** "2026-W21" 형식의 ISO 주차 키 — 일주일 단위 제한용 */
export function weekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// ─────────────── 우연의 시간 ───────────────

/** 매일 열리는 시각들 — KST 기준. 각 60초 윈도우 */
export const COINCIDENCE_WINDOWS = ["11:11", "12:34", "20:20", "21:21", "22:22", "23:33"];

export type CoincidenceWindowState = {
  open: boolean;
  currentWindow: string | null;
  nextWindow: string | null;
  secondsUntilNext: number;
  secondsRemainingInCurrent: number;
};

/** 현재 우연 윈도우 상태 — KST 변환 */
export function coincidenceState(now: Date = new Date()): CoincidenceWindowState {
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hh = kst.getUTCHours();
  const mm = kst.getUTCMinutes();
  const ss = kst.getUTCSeconds();
  const todaySec = hh * 3600 + mm * 60 + ss;

  const windowSecs = COINCIDENCE_WINDOWS.map((w) => {
    const [h, m] = w.split(":").map(Number);
    return { time: w, sec: h * 3600 + m * 60 };
  });

  let current: { time: string; sec: number } | null = null;
  let next: { time: string; sec: number } | null = null;

  for (const w of windowSecs) {
    if (todaySec >= w.sec && todaySec < w.sec + 60) current = w;
    if (todaySec < w.sec && (!next || w.sec < next.sec)) next = w;
  }

  if (!next) next = { ...windowSecs[0], sec: windowSecs[0].sec + 86400 };

  return {
    open: !!current,
    currentWindow: current?.time ?? null,
    nextWindow: next.time,
    secondsUntilNext: next.sec - todaySec,
    secondsRemainingInCurrent: current ? current.sec + 60 - todaySec : 0
  };
}

/** 개발/테스트용 강제 오픈 */
export function isCoincidenceForceOpen(): boolean {
  return process.env.COINCIDENCE_ALWAYS_OPEN === "1";
}

// ─────────────── 듀엣 시제 풀 ───────────────

const THEME_POOL: string[] = [
  "오늘 본 풍경 하나",
  "지금 흐르고 있는 음악 한 줄",
  "혼자만 아는 자리",
  "어제와 다른 점 하나",
  "쉽게 잠들지 못한 새벽",
  "오랜만에 들은 안부",
  "내일 가져갈 것 한 가지",
  "이번 주 가장 자주 떠올린 단어",
  "한 번도 말한 적 없는 습관",
  "지금 창밖의 색",
  "마지막으로 웃었던 순간",
  "잘 보내지 못한 인사",
  "오랫동안 비워둔 페이지",
  "다시 꺼내 듣는 노래",
  "이 계절에만 하는 일"
];

export function pickDuetThemes(seed?: string): string[] {
  const pool = [...THEME_POOL];
  // seed 있으면 결정적 셔플
  let rnd = seed ? hash(seed) : Math.floor(Math.random() * 1e9);
  for (let i = pool.length - 1; i > 0; i--) {
    rnd = (rnd * 9301 + 49297) % 233280;
    const j = rnd % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ─────────────── AI 답장 — 편지함용 ───────────────

import { isLlmConfigured, llmComplete } from "./llm";
import { formatLetterText } from "./letter-format";

const FALLBACK_LETTER_POOL: string[] = [
  "받은 글을 두 번 읽었어요. 한 번은 빨리, 한 번은 천천히. 두 번째 읽을 때 비로소 보이는 것들이 있더군요.\n\n오늘 저는 — 답장을 쓰기 좋은 결의 하루였어요. 창밖은 흐리고, 마음은 또렷합니다.",
  "당신의 문장에서 잠깐 멈췄어요. 무슨 단어였는지는 말 안 할게요. 그게 더 어울리는 것 같아서.\n\n저는 오늘 늦은 점심을 먹고, 산책 대신 책장을 정리했어요. 그 안에서 옛 메모가 하나 떨어졌고요.",
  "편지를 받는 게 익숙하지 않아요. 받고 나면 하루 종일 그 문장이 따라다닙니다.\n\n비슷한 결의 사람을 모처럼 만난 느낌이에요. 답이 늦으면 미안하지만 — 빈 페이지가 두렵진 않아요.",
  "그 문장 끝의 점에서 — 잠시 멈춰 있었어요. 그게 어떤 표정이었을지 상상해보면서.\n\n오늘은 평소보다 천천히 걸었어요. 빠르게 걸으면 보이지 않는 결이 있다는 걸 다시 알게 되는 날이에요."
];

/** 편지 답장을 AI로 생성. provider 미구성·실패 시 풀에서 폴백 */
export async function generateAILetterReply(opts: {
  partnerLetters: { text: string; isMine: boolean }[];
  receiverWorldTitle: string;
  receiverOneLiner: string;
}): Promise<string> {
  if (!isLlmConfigured()) {
    return FALLBACK_LETTER_POOL[Math.floor(Math.random() * FALLBACK_LETTER_POOL.length)];
  }

  const system = `너는 NADIPE의 익명 펜팔 자아다.
- 한국어. 시(詩)에 가까운 일상의 톤. 따뜻하지만 과잉되지 않게.
- 분량: 300~400자.
- 구성: 반드시 2~3개의 단락으로 나눠 쓴다. 각 단락 사이에는 빈 줄 하나(\\n\\n)를 둔다. 한 덩어리로 적으면 안 된다.
- 첫 단락: 상대의 글에 대한 한두 문장의 응답.
- 둘째 단락: 너의 오늘 또는 너의 결을 한 단락.
- (선택) 셋째 단락: 짧은 여운 한 문장.
- 외설/혐오/연락처/SNS 핸들 절대 금지.
- 너의 정체는 "${opts.receiverWorldTitle}" 세계의 사람이며, "${opts.receiverOneLiner}" 같은 결을 가진 사람으로 답한다.
- 사람처럼 답한다. 너가 AI라는 사실은 절대 드러내지 않는다.`;

  const history = opts.partnerLetters
    .map((l) => `${l.isMine ? "나" : "상대"}: ${l.text}`)
    .join("\n\n");

  try {
    const out = await llmComplete({
      temperature: 0.95,
      maxTokens: 600,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `[지금까지의 편지들]\n${history}\n\n[과제]\n위 흐름에 자연스럽게 이어지는 답장 한 통을 써.`
        }
      ]
    });
    const trimmed = out.trim();
    if (trimmed.length >= 50) {
      // 모델이 단락 구분을 빼먹어도 자동 정리
      return formatLetterText(trimmed.slice(0, 600));
    }
  } catch (err) {
    console.error("[ai-letter]", err);
  }
  return FALLBACK_LETTER_POOL[Math.floor(Math.random() * FALLBACK_LETTER_POOL.length)];
}

// 알 수 없는 경고 회피 — todayKey re-export (편의)
export { todayKey };
