/**
 * 편지 본문을 읽기 쉽게 정리.
 * - 이미 단락 구분(\n\n)이 있으면 그대로 둠
 * - 단일 \n만 있으면 \n\n로 승격
 * - 줄바꿈이 전혀 없으면 문장 단위로 2~3 단락으로 자동 분리
 */
export function formatLetterText(raw: string): string {
  const text = (raw ?? "").trim();
  if (!text) return text;

  // 이미 빈 줄이 있는 경우
  if (/\n\s*\n/.test(text)) return text;

  // 단일 줄바꿈만 있을 때 — 모두 빈 줄로 승격
  if (text.includes("\n")) {
    return text.replace(/\n+/g, "\n\n");
  }

  // 줄바꿈이 전혀 없을 때 — 문장 단위로 분할
  // 한국어 종결: "다.", "요.", "죠." 등 + 영어 ".!?"
  const sentences = matchSentences(text);
  if (sentences.length <= 2) return text;

  // 6문장 이상이면 3단락, 그 미만이면 2단락
  const targetParagraphs = sentences.length >= 6 ? 3 : 2;
  const perParagraph = Math.ceil(sentences.length / targetParagraphs);
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) {
    paragraphs.push(sentences.slice(i, i + perParagraph).join("").trim());
  }
  return paragraphs.filter(Boolean).join("\n\n");
}

/** 한국어/영어 종결 부호 기반 문장 분리 */
function matchSentences(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    buf += text[i];
    const ch = text[i];
    const next = text[i + 1] ?? "";
    if ((ch === "." || ch === "!" || ch === "?") && (next === " " || next === "" || next === "\n")) {
      // 다음 문자가 공백이면 문장 끝
      // 공백을 흡수 — 모아서 다음 문장 시작이 자연스럽도록
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) {
        buf += text[j];
        j++;
      }
      out.push(buf);
      buf = "";
      i = j - 1;
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}
