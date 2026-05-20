# NADIPE — 나의 디지털 페르소나

AI가 읽어주는 **디지털 관상** & **멀티 페르소나 탐험** MVP.
한 명이 아닌, **메인캐 / 부캐 / 오늘의 나** — 16개의 세계 좌표 위에서 자기 자신을 발견합니다.

> "당신은 한 명이 아닙니다." — NADIPE

## 폭발적 이슈화 설계

1. **부캐 리빌 의식** — 메인캐를 본 직후, “AI가 들킨 또 다른 당신”이 등장. WORLD MAP 위 거리가 멀수록 반전 임팩트 ↑
2. **WORLD MAP 16 좌표** — 한 사람이 여러 좌표를 점유. 메인캐 ↔ 부캐 거리값(거리가 큰 사람일수록 떡밥)
3. **오늘의 페르소나** — 매일 다른 카드 = DAU 엔진
4. **OG 카드 자동 생성** — `/api/og/persona/[id]` 1200×1200 정방형. 인스타·카톡·스레드 최적화
5. **공유 카드 페이지 `/card/[id]`** — 받은 사람도 “내 것 만들기” CTA로 루프
6. **세대 가교 톤** — 한지 질감 다크 톤 + 한국 명조체 = MZ의 감성과 X세대의 고급스러움 동시

## 사전 준비

- Node.js 18.18+ (권장 20+)
- PostgreSQL `nadipe` DB (이미 생성된 상태)
- OpenAI API Key (`OPENAI_API_KEY`)

## 설치 & 실행

```bash
# 1. 의존성 설치 (postinstall로 prisma generate 자동 실행)
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 DATABASE_URL과 OPENAI_API_KEY 채우기

# 3. DB 스키마 동기화 (둘 중 하나)
# 3-A. 빠른 동기화 — 로컬 개발 + 마이그레이션 히스토리 없이
npm run db:push

# 3-B. 마이그레이션 적용 — prisma/migrations/ 의 SQL 파일들을 순차 실행
npm run db:deploy

# 4. 개발 서버
npm run dev
# → http://localhost:3000
```

### 마이그레이션 워크플로

| 시나리오 | 명령 |
|---|---|
| 로컬에서 schema 변경 후 SQL 파일 생성+적용 | `npm run db:migrate -- --name <change_name>` |
| 현재 마이그레이션 상태 확인 | `npm run db:status` |
| 프로덕션 배포 (마이그레이션 적용 + 빌드) | `npm run build:prod && npm run start` |
| schema와 DB만 빠르게 맞추기 (마이그레이션 안 만듦) | `npm run db:push` |

> **주의**: 프로덕션은 항상 `db:deploy`(또는 `build:prod`)를 써야 합니다. `db:push`는 마이그레이션 히스토리를 남기지 않고 직접 DB를 변경하므로 운영용으로는 부적절합니다.

`prisma/migrations/0_init/migration.sql` 이 초기 마이그레이션입니다. 이후 schema 변경 시 `npm run db:migrate -- --name <설명>`으로 추가 마이그레이션이 생성됩니다.

### 환경 변수

| 키 | 설명 |
|---|---|
| `DATABASE_URL` | `postgresql://USER:PASS@localhost:5432/nadipe?schema=public` |
| `OPENAI_API_KEY` | OpenAI 시크릿 키 (필수 — 비어 있으면 mock 폴백) |
| `OPENAI_MODEL` | 기본 `gpt-4o-mini` (가성비). `gpt-4o`로 올리면 카피 품질 ↑ |
| `NEXT_PUBLIC_BASE_URL` | OG 카드 절대 URL (배포 시 도메인) |

## 사용자 흐름 (MVP)

```
/                  랜딩 — "당신은 한 명이 아닙니다."
↓
/onboard           4단계 온보딩 (이메일 / 관심사 / 플랫폼·시간 / 한 줄)
↓
POST /api/onboard  → 사용자 저장 + GPT 분석 → 메인캐 페르소나 생성
↓
/reveal/[id]       메인캐 시네마틱 리빌 + "부캐 보러 가기" CTA
↓
POST /api/reveal   → 메인캐와 멀리 떨어진 WORLD TYPE으로 부캐 강제 매핑
↓
/reveal/[id] (SUB) 부캐 리빌 — 가장 큰 바이럴 모멘트
↓
/map?u=…           WORLD MAP — 16개 좌표 위 내 페르소나 표시 + 거리값
/today?u=…         오늘의 페르소나 (재방문)
/explore?u=…       다른 세계 탐험 (16종 에세이 피드)
/card/[id]         공유받은 사람용 페이지 + 자기 것 만들기 루프
```

## 디렉토리

```
app/
  page.tsx                          랜딩
  onboard/page.tsx                  온보딩
  reveal/[id]/                      페르소나 리빌 의식
  map/page.tsx                      WORLD MAP 시각화
  today/                            오늘의 페르소나
  explore/page.tsx                  세계 탐험 피드
  card/[id]/page.tsx                공유 카드 페이지 (OG 메타데이터)
  api/
    onboard/route.ts                메인캐 생성
    reveal/route.ts                 부캐 리빌
    today/route.ts                  오늘 페르소나
    og/persona/[id]/route.tsx       OG 이미지 (1200×1200)
components/
  PersonaCard.tsx                   공통 페르소나 카드
  ShareBar.tsx                      공유·카드 다운로드 버튼
lib/
  db.ts                             Prisma client
  openai.ts                         GPT 분석 + 폴백
  world-map.ts                      16 WORLD TYPES 데이터
prisma/schema.prisma
.claude/service-plan.md             서비스 기획서 (모든 컨셉의 원본)
```

## OpenAI 비용 가이드

- `gpt-4o-mini` 기준 1회 분석 ~$0.0005 수준
- 메인캐(1회) + 부캐(1회) + 오늘(매일 1회) = 사용자당 일 평균 3회 미만
- 100만 명 분석 시도 시 약 **$500** 안팎

## AI 페르소나 자동 시드

매일 만남 공간이 비어 보이지 않도록, 10~100명의 익명 AI 페르소나가 자동 생성됩니다.

### 동작
- `/home`, `/meet`, `POST /api/campfire/join` 접속 시 백그라운드 트리거
- 같은 서버 프로세스에서 하루 1회만 실제 실행 (인메모리 락)
- 메인캐 + 오늘의 페르소나 + 50% 공명 노트 + 70% 모닥불 입장(중 30% 속삭임 한 줄)
- `User.isAI=true` 플래그로 표시되며 익명 alias 사용 → 사용자 입장에서는 구분 불가

### 수동 호출

```bash
# localhost에서는 secret 없이 허용
curl -X POST http://localhost:3000/api/seed/daily \
  -H "content-type: application/json" \
  -d '{"count": 50}'

# 운영 환경 — SEED_SECRET 설정 후
curl -X POST https://your-domain/api/seed/daily \
  -H "content-type: application/json" \
  -H "x-seed-secret: $SEED_SECRET" \
  -d '{"count": 50}'

# 오늘 생성된 AI 사용자 수 조회
curl http://localhost:3000/api/seed/daily
```

### 비활성화
- `.env`에 `SEED_AUTO=off` 추가

## 다음 단계 아이디어

- [ ] OAuth(Google) 연동 + 실제 Spotify/GitHub 데이터 풀
- [ ] 페르소나 컬렉션 16종 도감 + 친구 초대 시 잠금 해제
- [ ] 같은 WORLD TYPE 사용자 매칭 피드
- [ ] 카카오톡 공유 SDK
- [ ] 카드 다운로드 PNG 워터마크 + UTM
- [ ] WORLD MAP에 다른 사용자 점으로 표시 (익명)
