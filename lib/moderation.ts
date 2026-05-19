// 최소한의 모더레이션 가드 — MVP용.
// 외설/혐오/광고/연락처 기본 패턴만 걸러낸다.

const BAN_PATTERNS: RegExp[] = [
  // 노골적 외설/혐오 (한국어 비속어 일부)
  /\b(시발|씨발|좆|병신|개새끼|존나)\b/i,
  /(fuck|shit|asshole|bitch)/i,
  // 연락처 (전화/계정 유도 차단 — 익명 원칙 보호)
  /01[016-9][\s\-.]?\d{3,4}[\s\-.]?\d{4}/, // 한국 휴대전화
  /\b@[A-Za-z0-9_.]{3,}\b/,                 // 인스타/X 핸들
  /\b(line|kakao|텔레|tg)\s*[:：]/i,         // 메신저 ID 안내
  // URL/광고
  /(https?:\/\/|www\.)/i,
  // 너무 짧은 반복 패턴 (스팸)
  /(.)\1{6,}/
];

export type ModerationResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

export function moderate(raw: string, opts?: { maxLen?: number }): ModerationResult {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return { ok: false, reason: "빈 글은 보낼 수 없어요." };
  const max = opts?.maxLen ?? 140;
  if (text.length > max) return { ok: false, reason: `${max}자까지 적을 수 있어요.` };

  for (const p of BAN_PATTERNS) {
    if (p.test(text)) {
      return { ok: false, reason: "여기서는 그런 말은 흘러가지 않아요." };
    }
  }
  return { ok: true, text };
}
