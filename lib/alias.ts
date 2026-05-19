// 시적이고 익명적인 별칭 생성기.
// 한 사용자가 하루 동안 같은 별칭을 가지도록 결정적(deterministic) 해시 기반.

const ADJS = [
  "고요한", "느린", "깊은", "흩어진", "또렷한", "단단한", "부드러운",
  "잠든", "깨어있는", "묵묵한", "빛나는", "흐릿한", "잔잔한", "푸른",
  "조용한", "느슨한", "맑은", "어둑한", "투명한", "따뜻한", "차분한",
  "외로운", "다정한", "느릿한", "성실한", "수줍은", "곧은", "엷은"
];

const NOUNS = [
  "모래", "새벽", "시계", "책장", "별", "안개", "등대", "강", "발자국",
  "우산", "종이", "손", "창문", "달", "구름", "그림자", "골목", "계단",
  "오후", "편지", "지도", "벤치", "노래", "심호흡", "장면", "이야기",
  "마침표", "여백", "파도", "한숨", "거울", "촛불", "기차역"
];

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** 같은 user+date 조합이면 항상 같은 별칭이 나옴. */
export function generateAlias(userId: string, date: string, salt = ""): string {
  const seed = hash(`${userId}::${date}::${salt}`);
  const a = ADJS[seed % ADJS.length];
  const n = NOUNS[Math.floor(seed / ADJS.length) % NOUNS.length];
  const tail = String((seed >> 8) % 99).padStart(2, "0");
  return `${a} ${n} ${tail}`;
}
