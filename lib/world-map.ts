// NADIFE WORLD MAP — 16 WORLD TYPES
// axisX: -1.0 (안정/느림) ~ 1.0 (변화/속도)
// axisY: -1.0 (혼자 몰입) ~ 1.0 (사람 중심)

export type WorldType = {
  slug: string;
  title: string;
  keywords: string[];
  oneLiner: string;
  longLiner: string;
  axisX: number;
  axisY: number;
  // 카드 시각 정체성
  hue: string;          // hex (그라데이션 메인)
  hueAlt: string;       // hex (그라데이션 보조)
  glyph: string;        // 카드 상징 한 글자
  vibe: string;         // 한 단어 분위기
};

export const WORLD_TYPES: WorldType[] = [
  {
    slug: "dawn-thinker",
    title: "새벽 사색가",
    keywords: ["깊은 몰입", "혼자 회복", "야행성 감성"],
    oneLiner: "사람 많은 곳에서도 자기만의 세계를 유지하는 사람",
    longLiner: "낮의 소음을 견디고 새벽에 비로소 또렷해지는 타입. 침묵 속에서 가장 많은 말을 한다.",
    axisX: -0.5, axisY: -0.8,
    hue: "#4b5fbf", hueAlt: "#0b0e1a", glyph: "◐", vibe: "고요"
  },
  {
    slug: "city-leader",
    title: "도시 리더형",
    keywords: ["책임감", "빠른 실행", "사회적 중심"],
    oneLiner: "바쁜 도시의 흐름 속에서도 중심을 잡는 사람",
    longLiner: "결정을 두려워하지 않는다. 속도 위에서 사람을 모으는 능력자.",
    axisX: 0.7, axisY: 0.7,
    hue: "#d4af6f", hueAlt: "#7a5a2b", glyph: "✦", vibe: "추진"
  },
  {
    slug: "mood-reader",
    title: "감정 관찰자",
    keywords: ["분위기 민감", "감정 피로", "조용한 공감"],
    oneLiner: "말보다 분위기를 먼저 읽는 사람",
    longLiner: "공기를 본다. 모두가 놓친 표정을 기억하는 사람.",
    axisX: -0.2, axisY: 0.3,
    hue: "#a18ad4", hueAlt: "#3d2d6b", glyph: "❋", vibe: "감각"
  },
  {
    slug: "night-maker",
    title: "밤의 제작자",
    keywords: ["새벽 몰입", "창작", "깊은 집중"],
    oneLiner: "세상이 잠든 시간에 가장 선명해지는 사람",
    longLiner: "23시 이후가 본업. 어둠 속에서 무언가를 만들어낸다.",
    axisX: 0.3, axisY: -0.7,
    hue: "#c47b8a", hueAlt: "#3d1a2b", glyph: "✺", vibe: "창작"
  },
  {
    slug: "deep-sea",
    title: "심해형 인간",
    keywords: ["느린 관계", "깊은 신뢰", "내면형"],
    oneLiner: "쉽게 가까워지진 않지만 오래 남는 사람",
    longLiner: "표면에는 잘 떠오르지 않지만, 한번 내려가면 끝까지 함께 간다.",
    axisX: -0.7, axisY: -0.5,
    hue: "#2c5f7e", hueAlt: "#0a1a26", glyph: "▽", vibe: "심연"
  },
  {
    slug: "spark-explorer",
    title: "불꽃 탐험가",
    keywords: ["즉흥", "경험 중심", "자유"],
    oneLiner: "새로운 세계를 발견할 때 가장 살아나는 사람",
    longLiner: "익숙함은 적이다. 다음 모퉁이를 향해 늘 한 발을 들고 있는 사람.",
    axisX: 0.8, axisY: 0.2,
    hue: "#e07a3d", hueAlt: "#6b2a0d", glyph: "✷", vibe: "점화"
  },
  {
    slug: "reality-architect",
    title: "현실 설계자",
    keywords: ["계획", "안정감", "구조 선호"],
    oneLiner: "감정보다 삶의 균형을 먼저 설계하는 사람",
    longLiner: "혼란을 견디지 않는다. 시스템을 짜고, 그 안에서 자유로워지는 타입.",
    axisX: -0.6, axisY: 0.0,
    hue: "#7a8e6b", hueAlt: "#2c3a24", glyph: "▦", vibe: "구축"
  },
  {
    slug: "world-connector",
    title: "세계 연결자",
    keywords: ["관계 중심", "소통", "커뮤니티"],
    oneLiner: "사람과 연결될 때 가장 큰 에너지를 얻는 사람",
    longLiner: "혼자보다 함께가 빠른 타입. 사람과 사람 사이의 통역가.",
    axisX: 0.2, axisY: 0.9,
    hue: "#e8b04d", hueAlt: "#7a5a1a", glyph: "◉", vibe: "연결"
  },
  {
    slug: "silent-archivist",
    title: "고요한 기록자",
    keywords: ["관찰", "기록", "혼자 생각"],
    oneLiner: "말보다 기록 속에서 자신을 표현하는 사람",
    longLiner: "메모장에 더 많은 자아가 산다. 침묵은 자료가 된다.",
    axisX: -0.4, axisY: -0.6,
    hue: "#7e7e7e", hueAlt: "#2a2a2a", glyph: "▢", vibe: "기록"
  },
  {
    slug: "wave-empath",
    title: "파동 공감자",
    keywords: ["감정 동기화", "분위기 흡수", "공감력"],
    oneLiner: "타인의 감정을 자신의 일처럼 느끼는 사람",
    longLiner: "주변의 기쁨과 슬픔이 그대로 자신의 날씨가 되는 사람.",
    axisX: 0.1, axisY: 0.5,
    hue: "#9bc4e2", hueAlt: "#1c3a52", glyph: "≈", vibe: "공명"
  },
  {
    slug: "future-builder",
    title: "미래 구축자",
    keywords: ["성장", "목표", "추진력"],
    oneLiner: "현재보다 미래를 더 오래 바라보는 사람",
    longLiner: "오늘은 도구일 뿐. 3년 뒤의 자신을 위해 지금을 쓰는 타입.",
    axisX: 0.9, axisY: 0.4,
    hue: "#3d8b8b", hueAlt: "#0e2929", glyph: "▶", vibe: "전진"
  },
  {
    slug: "slow-wanderer",
    title: "느린 여행자",
    keywords: ["여유", "감성", "경험"],
    oneLiner: "속도보다 순간의 감정을 더 중요하게 여기는 사람",
    longLiner: "도착보다 풍경. 효율보다 향기. 다른 박자를 사는 사람.",
    axisX: -0.8, axisY: 0.1,
    hue: "#c2a878", hueAlt: "#5a4a2c", glyph: "◌", vibe: "여운"
  },
  {
    slug: "gray-analyst",
    title: "회색 분석가",
    keywords: ["논리", "분석", "거리 유지"],
    oneLiner: "감정보다 구조를 먼저 이해하려는 사람",
    longLiner: "거리감은 무관심이 아니라 정확성을 위한 것. 차갑게 보이지만 정밀하다.",
    axisX: 0.4, axisY: -0.4,
    hue: "#5c6c7e", hueAlt: "#1a232c", glyph: "◇", vibe: "정밀"
  },
  {
    slug: "glass-soul",
    title: "유리 감성가",
    keywords: ["섬세", "감정 축적", "내면 깊이"],
    oneLiner: "조용하지만 감정의 밀도가 높은 사람",
    longLiner: "겉은 투명하고 안은 무겁다. 작은 일에 오래 머무는 사람.",
    axisX: -0.3, axisY: -0.3,
    hue: "#e5c4d4", hueAlt: "#5a3a48", glyph: "❍", vibe: "밀도"
  },
  {
    slug: "starlight-optimist",
    title: "별빛 낙관가",
    keywords: ["희망", "따뜻함", "긍정 에너지"],
    oneLiner: "사람과 가능성을 쉽게 포기하지 않는 사람",
    longLiner: "어둠 속에서도 별을 먼저 보는 사람. 가까이 있으면 따뜻해진다.",
    axisX: -0.1, axisY: 0.7,
    hue: "#f4d35e", hueAlt: "#7a5e1a", glyph: "✧", vibe: "온기"
  },
  {
    slug: "edge-drifter",
    title: "경계의 방랑자",
    keywords: ["자유", "독립", "새로운 세계"],
    oneLiner: "한곳에 머무르기보다 새로운 세계를 떠도는 사람",
    longLiner: "소속을 의심한다. 익숙해질 즈음에 떠나는 것이 자신을 지키는 방식.",
    axisX: 0.6, axisY: -0.2,
    hue: "#8a6bbf", hueAlt: "#2a1a44", glyph: "↯", vibe: "경계"
  }
];

export const WORLD_MAP_BY_SLUG: Record<string, WorldType> = Object.fromEntries(
  WORLD_TYPES.map((w) => [w.slug, w])
);

export function getWorldType(slug: string): WorldType {
  return WORLD_MAP_BY_SLUG[slug] ?? WORLD_TYPES[0];
}

/** 두 페르소나 사이 WORLD MAP 거리 — 멀수록 바이럴 ↑ */
export function worldDistance(a: WorldType, b: WorldType): number {
  const dx = a.axisX - b.axisX;
  const dy = a.axisY - b.axisY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** SUB 페르소나는 MAIN과 의도적으로 먼 좌표를 선호 — 반전 효과 */
export function pickContrastingType(mainSlug: string): WorldType[] {
  const main = getWorldType(mainSlug);
  return [...WORLD_TYPES]
    .filter((w) => w.slug !== mainSlug)
    .sort((a, b) => worldDistance(main, b) - worldDistance(main, a));
}
