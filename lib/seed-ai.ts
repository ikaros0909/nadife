// AI 페르소나 시드 — 매일 10~100명 사이로 만남 공간을 채운다.
// 텍스트 풀 기반 (OpenAI 비용 0). 익명 alias로 사용자/AI 구분이 어려운 상태가 의도된 디자인.

import { randomBytes } from "crypto";
import { prisma } from "./db";
import { WORLD_TYPES, getWorldType, type WorldType } from "./world-map";
import { todayKey } from "./utils";
import { generateAlias } from "./alias";

const ONE_LINERS: string[] = [
  "사람 많은 곳에서도 늘 자기만의 세계를 유지하는 사람",
  "쉽게 가까워지진 않지만 가까워지면 오래 남는 사람",
  "세상이 잠든 시간에 가장 또렷해지는 사람",
  "감정보다 분위기를 먼저 읽는 사람",
  "느린 속도로 깊어지는 관계를 가진 사람",
  "새로운 세계를 발견할 때 살아나는 사람",
  "현재보다 미래를 더 오래 바라보는 사람",
  "사람과 연결될 때 가장 큰 에너지를 얻는 사람",
  "혼자 있는 시간이 가장 단단한 사람",
  "조용히 모든 것을 다 보는 사람",
  "감정의 밀도가 깊은 사람",
  "다정함이 디폴트인 사람",
  "한 번 정한 박자는 잘 바꾸지 않는 사람",
  "지나간 일들을 자주 꺼내보는 사람",
  "겉으로는 차분하지만 안은 분주한 사람"
];

const NARRATIVES: string[] = [
  "낮 동안 흘려보낸 자기 자신을 새벽이 되어서야 다시 줍는 사람. 침묵 속에서 가장 많은 말을 한다.",
  "결정을 두려워하지 않는다. 속도 위에서 사람을 모으는 능력을 가진 타입.",
  "공기를 본다. 모두가 놓친 표정을 기억하는 사람.",
  "23시 이후가 본업. 어둠 속에서 무언가를 만들어낸다.",
  "표면에는 잘 떠오르지 않지만, 한번 내려가면 끝까지 함께 가는 사람.",
  "익숙함이 답답한 사람. 다음 모퉁이를 향해 늘 한 발을 들고 있다.",
  "혼란을 견디지 않고 시스템을 짠 뒤 그 안에서 자유로워지는 타입.",
  "혼자보다 함께가 빠른 사람. 사람과 사람 사이의 통역가.",
  "메모장에 더 많은 자아가 산다. 침묵은 자료가 된다.",
  "주변의 기쁨과 슬픔이 그대로 자신의 날씨가 되는 사람.",
  "오늘은 도구일 뿐. 3년 뒤의 자신을 위해 지금을 쓰는 타입.",
  "도착보다 풍경. 효율보다 향기. 다른 박자를 사는 사람.",
  "거리감은 무관심이 아니라 정확성을 위한 것. 차갑게 보이지만 정밀하다.",
  "겉은 투명하고 안은 무겁다. 작은 일에 오래 머무는 사람.",
  "어둠 속에서도 별을 먼저 보는 사람. 가까이 있으면 따뜻해진다.",
  "소속을 의심한다. 익숙해질 즈음에 떠나는 것이 자신을 지키는 방식."
];

const RESONANCE_NOTES: string[] = [
  "새벽 두 시 — 음악이 가장 또렷해지는 시간.",
  "오늘은 답장이 늦어도 괜찮을 것 같다.",
  "혼자 있는데 외롭지가 않다.",
  "오랜만에 햇볕을 오래 쬔 하루.",
  "내가 좋아하는 거리, 좋아하는 속도로 걸었다.",
  "말하지 않아도 알겠다, 같은 박자라는 게.",
  "오후 네 시의 빛이 너무 짧게 지나갔다.",
  "조용히 있고 싶은 날이지만 외면당하고 싶진 않다.",
  "오늘 산 책의 첫 문장이 마음에 박혔다.",
  "내가 만든 플레이리스트로 하루를 견뎠다.",
  "비가 와서 좋은 핑계가 생겼다.",
  "오랫동안 안 하던 생각을 다시 했다.",
  "누군가의 안부를 묻고 싶은데 묻지 않았다.",
  "이상하게 잘 잤고, 이상하게 잘 깼다.",
  "한 시간만 더 깨어 있고 싶은 새벽.",
  "오늘은 아무것도 결정하지 않기로 결정.",
  "조용한 사람이 옆에 있으면 마음이 가라앉는다.",
  "어떤 음악은 그 자체로 위로가 된다.",
  "안 만난 친구의 안부가 궁금해진 오후.",
  "오랜만에 손편지를 받은 기분의 하루.",
  "다음 약속까지 오래 비워둬도 괜찮다.",
  "퇴근길에 하늘이 너무 좋아서 사진을 찍었다.",
  "왠지 오늘은 천천히 걷고 싶었다.",
  "익숙한 카페에서 익숙하지 않은 자리에 앉았다.",
  "잠깐 멍하니 있는 게 오늘의 최고 일정이었다.",
  "혼자만의 짧은 의식 하나를 새로 만들었다.",
  "마음이 흩어졌지만 그게 나쁘지만은 않다.",
  "오랜만에 누군가의 농담에 크게 웃었다.",
  "정리를 하니 마음도 약간 정리된 것 같다.",
  "오늘 하루를 한 단어로 줄이면 — 단단함.",
  "이유 없이 다정해지고 싶은 하루.",
  "글이 안 써져서 산책을 더 했다.",
  "한 곡을 반복해서 다섯 번 들었다.",
  "오늘 산 커피가 유난히 맛있었다.",
  "잘 자라는 말이 오늘은 무겁게 느껴졌다.",
  "괜찮은 하루였다. 그게 다였고, 그게 컸다.",
  "조용한 사람 옆은 늘 좋은 자리다.",
  "비를 좋아하는 사람과 좋아하지 않는 사람으로 세상은 나뉘는 것 같다.",
  "익숙한 길을 다른 속도로 걸어봤다.",
  "오늘은 하나도 새롭지 않아도 좋다."
];

const TODAY_ONE_LINERS: string[] = [
  "오늘은 아무것도 하지 않을 권리",
  "조용한 박자로 흘러가는 하루",
  "혼자 회복하는 시간",
  "낮은 채도의 평일",
  "잘 흔들렸지만 잘 가라앉은 하루",
  "들뜸과 차분함 사이 어딘가",
  "오랜만에 자기에게 다정한 날",
  "느린 속도가 정답인 시간",
  "마음의 창을 닫지 않은 하루",
  "잠깐 환해진 마음"
];

const RHYTHMS    = ["몰입형", "느린 박자", "단단한 흐름", "흩어짐을 견디는", "선택적 사회성", "조용한 집중", "새벽형 인간"];
const SPEEDS     = ["느리지만 깊어지는", "한 번에 가까워지지 않는", "오래 머무는", "쉽게 곁을 주지 않는", "관계를 시처럼 쓰는"];
const EMOTIONS   = ["은은한 표현형", "내면 축적형", "표정으로 말하는", "글로 표현하는", "음악으로 말하는"];
const RECOVERIES = ["혼자 회복형", "걷기로 회복하는", "음악으로 회복하는", "글로 회복하는", "잠으로 회복하는"];
const ENERGIES   = ["선택적 몰입", "은은한 에너지", "조용한 추진력", "내면 발산형", "여백을 가진 에너지"];

const MOODS = [
  "몰입", "회복", "공허", "설렘", "지침", "선명함",
  "흩어짐", "그리움", "단단함", "허기짐", "들뜸", "조용함"
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randId(): string {
  return randomBytes(8).toString("hex");
}

export type SeedResult = {
  count: number;
  date: string;
  perWorld: Record<string, number>;
};

/**
 * 매일 한 번 호출 — 10~100명의 익명 AI 페르소나를 채워넣는다.
 * 메인캐 + 오늘의 페르소나 + 50% 공명 노트 + 70% 모닥불 입장 자동 생성.
 */
export async function seedDailyAI(opts?: {
  count?: number;
  date?: string;
}): Promise<SeedResult> {
  const date = opts?.date ?? todayKey();
  const count = clamp(
    opts?.count ?? randInt(10, 100),
    1,
    300
  );

  // 16개 세계에 비교적 고르게 분포
  const worlds = balancedWorldPicks(count);
  const perWorld: Record<string, number> = {};

  for (const world of worlds) {
    perWorld[world.slug] = (perWorld[world.slug] ?? 0) + 1;

    const email = `ai-${randId()}@nadi.ai`;
    const user = await prisma.user.create({
      data: {
        email,
        isAI: true,
        nickname: null,
        birthYear: 1990 + randInt(0, 25)
      }
    });

    const persona = await prisma.persona.create({
      data: {
        userId: user.id,
        kind: "MAIN",
        worldType: world.slug,
        title: world.title,
        oneLiner: pick(ONE_LINERS),
        rhythm: pick(RHYTHMS),
        speed: pick(SPEEDS),
        emotion: pick(EMOTIONS),
        recovery: pick(RECOVERIES),
        energy: pick(ENERGIES),
        narrative: pick(NARRATIVES),
        axisX: world.axisX,
        axisY: world.axisY,
        revealed: true,
        revealAt: new Date()
      }
    });

    const mood = pick(MOODS);
    // 오늘의 페르소나는 메인캐와 같은 세계로 둘 수도, 다른 세계로 흩어질 수도 있게
    const todayWorld = Math.random() < 0.6 ? world : pick(WORLD_TYPES);
    await prisma.dailyPersona.create({
      data: {
        userId: user.id,
        date,
        mood,
        worldType: todayWorld.slug,
        title: todayWorld.title,
        oneLiner: pick(TODAY_ONE_LINERS)
      }
    });

    // 50% 공명 한 줄
    if (Math.random() < 0.5) {
      try {
        await prisma.resonanceNote.create({
          data: {
            userId: user.id,
            date,
            mood,
            worldType: todayWorld.slug,
            text: pick(RESONANCE_NOTES),
            alias: generateAlias(user.id, date, "resonance")
          }
        });
      } catch {
        // unique(userId,date) 충돌 — 무시
      }
    }

    // 70% 모닥불 입장 (오늘의 페르소나 세계 기준)
    if (Math.random() < 0.7) {
      try {
        const campfire = await prisma.campfire.upsert({
          where: { worldType_date: { worldType: todayWorld.slug, date } },
          update: {},
          create: { worldType: todayWorld.slug, date }
        });
        await prisma.campfirePresence.upsert({
          where: {
            campfireId_userId: { campfireId: campfire.id, userId: user.id }
          },
          update: {},
          create: {
            campfireId: campfire.id,
            userId: user.id,
            alias: generateAlias(user.id, date, todayWorld.slug)
          }
        });

        // 일부(30%)는 속삭임도 한 줄 던짐
        if (Math.random() < 0.3) {
          await prisma.campfireWhisper.create({
            data: {
              campfireId: campfire.id,
              userId: user.id,
              alias: generateAlias(user.id, date, todayWorld.slug),
              text: pick(RESONANCE_NOTES)
            }
          });
        }
      } catch {
        /* ignore */
      }
    }

    // 무엇보다 persona 생성에는 항상 성공해야 함
    void persona;
  }

  return { count, date, perWorld };
}

/** 오늘 새로 만든 AI 사용자 수 */
export async function countTodayAIUsers(date?: string): Promise<number> {
  const d = date ?? todayKey();
  const start = new Date(`${d}T00:00:00`);
  const end = new Date(`${d}T23:59:59.999`);
  return prisma.user.count({
    where: {
      isAI: true,
      createdAt: { gte: start, lte: end }
    }
  });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function randInt(min: number, maxInclusive: number): number {
  return min + Math.floor(Math.random() * (maxInclusive - min + 1));
}

function balancedWorldPicks(n: number): WorldType[] {
  // 16개 round-robin + 살짝의 무작위성
  const order = [...WORLD_TYPES].sort(() => Math.random() - 0.5);
  const out: WorldType[] = [];
  for (let i = 0; i < n; i++) out.push(order[i % order.length]);
  // 다시 섞기
  return out.sort(() => Math.random() - 0.5);
}
