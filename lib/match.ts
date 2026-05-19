// 연결 매칭 + 위치/거리 + 종이비행기 비행 시간.
//
// 핵심:
// - 양측 모두 서로의 조건(성별·국적·나이·지역)에 부합해야 connection 제안 가능
// - 비어 있는 조건(빈 배열 / null)은 무관 — 항상 통과
// - 위치는 양측 모두 opt-in해야 거리 계산. 1km 그리드로 반올림 저장
// - 종이비행기 속도 100km/h — 비행 시간 비례 배달

export type ProfileFields = {
  gender?: string | null;
  country?: string | null;
  region?: string | null;
  birthYear?: number | null;
};

export type ConnectPreferences = {
  connectGenders: string[];
  connectCountries: string[];
  connectRegions: string[];
  connectAgeMin: number | null;
  connectAgeMax: number | null;
};

export type MatchCheck = {
  ok: boolean;
  failures: ("gender" | "country" | "region" | "age")[];
};

export type MutualMatch = {
  matched: boolean;
  mineSide: MatchCheck;       // 내 조건이 그쪽을 받아들이는가
  theirsSide: MatchCheck;     // 그쪽 조건이 나를 받아들이는가
};

// ───── 매칭 ─────

export function ageOf(birthYear: number | null | undefined): number | null {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

function ageInRange(age: number | null, min: number | null, max: number | null): boolean {
  if (min === null && max === null) return true;
  if (age === null) return false;
  if (min !== null && age < min) return false;
  if (max !== null && age > max) return false;
  return true;
}

/** prefs가 profile을 받아들이는가 (단방향) */
export function checkMatch(profile: ProfileFields, prefs: ConnectPreferences): MatchCheck {
  const failures: MatchCheck["failures"] = [];
  if (prefs.connectGenders.length > 0) {
    if (!profile.gender || !prefs.connectGenders.includes(profile.gender)) failures.push("gender");
  }
  if (prefs.connectCountries.length > 0) {
    if (!profile.country || !prefs.connectCountries.includes(profile.country)) failures.push("country");
  }
  if (prefs.connectRegions.length > 0) {
    if (!profile.region || !prefs.connectRegions.includes(profile.region)) failures.push("region");
  }
  if (prefs.connectAgeMin !== null || prefs.connectAgeMax !== null) {
    if (!ageInRange(ageOf(profile.birthYear), prefs.connectAgeMin ?? null, prefs.connectAgeMax ?? null)) {
      failures.push("age");
    }
  }
  return { ok: failures.length === 0, failures };
}

/** 양방향 매칭 — 둘 다 ok여야 matched=true */
export function checkMutualMatch(
  myProfile: ProfileFields,
  myPrefs: ConnectPreferences,
  theirProfile: ProfileFields,
  theirPrefs: ConnectPreferences
): MutualMatch {
  const mineSide = checkMatch(theirProfile, myPrefs);
  const theirsSide = checkMatch(myProfile, theirPrefs);
  return {
    matched: mineSide.ok && theirsSide.ok,
    mineSide,
    theirsSide
  };
}

// ───── 거리 (Haversine) ─────

/** 1km 그리드로 반올림 (~0.009도 = 약 1km) — 위치 보호용 */
export function roundCoord(v: number): number {
  return Math.round(v * 100) / 100; // 소수점 2자리 = 약 1km
}

export function distanceKm(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined
): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** UI 표시용 거리 버킷 — 정확한 좌표 노출 방지 */
export function distanceBucket(km: number | null): string {
  if (km === null) return "위치 미공유";
  if (km < 0.5) return "0.5km 이내";
  if (km < 1) return "약 1km";
  if (km < 5) return "5km 이내";
  if (km < 20) return "같은 도시";
  if (km < 100) return "100km 이내";
  if (km < 500) return "다른 도시";
  if (km < 2000) return "다른 지역";
  if (km < 8000) return "다른 대륙";
  return "지구 반대편";
}

// ───── 종이비행기 비행 시간 ─────
//
// 거리에 비례해 편지 배달이 지연된다. 종이비행기 속도 = 100 km/h.
// - 5분 최소 (같은 자리여도 약간의 여유)
// - 7일 최대 (지구 반대편이라도 일주일 안에는 도착)
// - 위치 미공유: 30분 고정 (어디서 출발했는지 모르는 우편)

const FLIGHT_SPEED_KMH = 100; // 종이비행기 — 비행기보다 느리고 우편보다 빠르게
const MIN_DELIVERY_MS = 5 * 60 * 1000; // 5분
const MAX_DELIVERY_MS = 7 * 24 * 60 * 60 * 1000; // 7일
const UNKNOWN_DELIVERY_MS = 30 * 60 * 1000; // 30분 — 위치 모를 때

export function deliveryDelayMs(distanceKm: number | null): number {
  if (distanceKm === null) return UNKNOWN_DELIVERY_MS;
  const flightMs = (distanceKm / FLIGHT_SPEED_KMH) * 60 * 60 * 1000;
  const totalMs = MIN_DELIVERY_MS + flightMs;
  return Math.min(totalMs, MAX_DELIVERY_MS);
}

export function formatDeliveryTime(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}일`);
  if (hours > 0) parts.push(`${hours}시간`);
  if (mins > 0 && days === 0) parts.push(`${mins}분`);
  return parts.join(" ") || "곧";
}

export function arrivalCountdown(arrivesAt: Date | string | null): string {
  if (!arrivesAt) return "곧 도착";
  const ts = typeof arrivesAt === "string" ? Date.parse(arrivesAt) : arrivesAt.getTime();
  const remaining = ts - Date.now();
  if (remaining <= 0) return "도착";
  return formatDeliveryTime(remaining);
}
