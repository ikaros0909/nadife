// 백그라운드 AI 시드 트리거 — /meet 접속 시 호출되는 가벼운 lazy 시더.
// 같은 서버 프로세스 안에서는 하루 한 번만 실제 시드를 수행.

import { todayKey } from "./utils";
import { seedDailyAI, countTodayAIUsers } from "./seed-ai";

let lastRunDate: string | null = null;
let inFlight: Promise<unknown> | null = null;

/** 오늘 AI 사용자가 threshold 미만이면 백그라운드로 채워넣는다. 즉시 반환 */
export function maybeSeedTodayInBackground(threshold = 10): void {
  if (process.env.SEED_AUTO === "off") return;

  const date = todayKey();
  if (lastRunDate === date) return;
  if (inFlight) return;
  lastRunDate = date;

  inFlight = (async () => {
    try {
      const existing = await countTodayAIUsers(date);
      if (existing >= threshold) return;
      const target = 10 + Math.floor(Math.random() * 91); // 10~100
      const need = Math.max(0, target - existing);
      if (need === 0) return;
      const r = await seedDailyAI({ count: need, date });
      console.log(`[seed-runner] seeded ${r.count} AI personas for ${date}`);
    } catch (err) {
      console.error("[seed-runner] error", err);
      lastRunDate = null;
    } finally {
      inFlight = null;
    }
  })();
}
