# 마법한자탐험대 — 아키텍처 결정 기록 (PHASE 0)

> 이 문서는 "왜 이렇게 만들었는가"를 기록한다. 구현 세부는 코드가 정답이다.

---

## 1. 제품 정의

**한 줄 정의**

> 초등학생이 판타지 RPG를 플레이하면, 그 플레이 자체가 한자 학습이 되는 웹 게임.

**핵심 원칙**

- 한자는 "게임의 소재"가 아니라 **게임의 메커니즘 그 자체**다.
  - 한자를 배운다 = 마법을 배운다
  - 퀴즈를 푼다 = 몬스터와 싸운다
  - 도감을 채운다 = 마법서를 완성한다
  - EXP / 레벨 = 탐험대원 등급
- 아이가 첫 화면에서 받아야 하는 인상은 "공부 사이트"가 아니라 **"게임"**이다.

**타깃**: 초등 1~~6학년(7~~13세). 주 사용 기기: 태블릿 / 모바일 / 데스크톱.

---

## 2. 기술 스택 (PHASE 0 시점 npm 레지스트리 실측으로 확정)

| 영역        | 선택                               | 버전         | 비고                                                                                                                                         |
| ----------- | ---------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | SvelteKit                          | 2.70.x       | Svelte 5 runes 사용                                                                                                                          |
| UI          | Svelte                             | 5.56.x       | `$state / $derived / $effect / $props`                                                                                                       |
| Language    | TypeScript                         | **6.0.x**    | ⚠️ TS 7.x가 최신이지만 `@sveltejs/kit` peer는 `^5.3.3 \|\| ^6.0.0`, `typescript-eslint`는 `<6.1.0`. **TS 7은 아직 못 쓴다.** 안전 상한 = 6.0 |
| Bundler     | Vite                               | 8.x          |                                                                                                                                              |
| Styling     | Tailwind CSS                       | 4.3.x        | `@tailwindcss/vite`, CSS-first `@theme` 토큰                                                                                                 |
| Animation   | GSAP                               | 3.15.x       | 타임라인 연출(레벨업 / 보상 / 카드)                                                                                                          |
| Game Render | PixiJS                             | 8.19.x       | **`/battle` 라우트에서만 동적 import**                                                                                                       |
| DB          | Cloudflare D1                      | —            | SQLite 호환                                                                                                                                  |
| Storage     | Cloudflare R2                      | —            | 이미지 / 사운드 (PHASE 15)                                                                                                                   |
| Runtime     | Cloudflare Workers + Static Assets | wrangler 4.x | `@sveltejs/adapter-cloudflare` 7.x                                                                                                           |
| E2E         | Playwright                         | 1.62.x       | Desktop / Tablet / Mobile                                                                                                                    |
| Unit        | Vitest                             | 4.x          | 순수 로직(EXP, 퀴즈 생성, 해시, 데이터 검증)                                                                                                 |
| Lint        | ESLint 10 + Prettier 3             |              |                                                                                                                                              |

**명시적 비채택**: React, Spring Boot, 별도 Node/Express 서버, 외부 상태관리 라이브러리(Svelte 5 runes로 충분), ORM(D1 raw SQL + 얇은 repository 레이어가 더 가볍고 명확하다).

### 2.1 배포 타깃: Workers(주) + Pages(추가)

`@sveltejs/adapter-cloudflare`는 Pages와 Workers 양쪽을 지원한다. 이 프로젝트는 **둘 다** 쓴다.

| 타깃                        | 설정 파일              | 쓰는 곳                                              |
| --------------------------- | ---------------------- | ---------------------------------------------------- |
| **Workers + Static Assets** | `wrangler.jsonc`       | 로컬 개발(`npm run dev`), 프리뷰, **Playwright E2E** |
| **Pages**                   | `wrangler.pages.jsonc` | `npm run deploy:pages` 로 배포                       |

Workers 를 개발·테스트의 기준으로 삼는 이유:

- Cloudflare 가 현재 권장하는 방향이며 Pages Functions 는 사실상 유지보수 모드다.
- 로컬에서 `getPlatformProxy` 로 **운영과 동일한 바인딩**을 그대로 쓸 수 있어,
  개발·테스트·운영의 코드 경로가 갈라지지 않는다.

빌드 타깃은 `CF_TARGET=pages` 환경변수로 전환한다(`vite.config.ts` 참조).
Pages 는 `_worker.js` 가 자체 완결이어야 하고 `_routes.json` / `404.html` 이 추가로 필요해서
출력 형태가 다르다. `scripts/deploy-pages.mjs` 가 빌드와 배포에 **같은 설정 파일**을 쓰도록 강제한다.

> ⚠️ **두 설정 파일의 바인딩(D1 / R2 / vars)은 항상 같아야 한다.**
> 한쪽만 고치면 그 타깃에서 바인딩이 조용히 사라진다. 바인딩을 바꿀 때는 두 파일을 함께 고친다.

---

## 3. 런타임 아키텍처

```
                      ┌──────────────────────────────┐
   Browser            │  Cloudflare Worker (edge)    │
 ┌──────────┐         │  ┌────────────────────────┐  │
 │ Svelte 5 │ ──────► │  │ SvelteKit SSR + API    │  │
 │  runes   │  fetch  │  │  hooks.server.ts       │  │
 │  GSAP    │ ◄────── │  │   └ 세션 검증 / 보안헤더│  │
 │  PixiJS  │         │  └───┬──────────┬─────────┘  │
 └──────────┘         │      │          │            │
      ▲               │  platform.env   │            │
      │               │      │          │            │
 Static Assets ◄──────┼──────┘          │            │
 (Worker Assets)      │                 │            │
                      └────────┬────────┴────────────┘
                               │                │
                        ┌──────▼─────┐   ┌──────▼──────┐
                        │  D1 (SQL)  │   │  R2 (asset) │
                        └────────────┘   └─────────────┘
```

### 3.1 요청 경계 규칙 (반드시 지킨다)

1. 브라우저는 **DB에 직접 접근할 수 없다.** 모든 데이터는 `+page.server.ts` / `+server.ts`를 통과한다.
2. 게임 보상(EXP, 레벨, 도감 해금, 업적)은 **전부 서버에서 계산**한다.
   클라이언트가 보낸 `exp` 값을 신뢰하지 않는다. 클라이언트는 "어떤 문제에 무엇을 골랐는지"만 보낸다.
   → 초등학생 대상이라도 점수 조작이 가능하면 수집·성장의 재미가 붕괴한다. server-authoritative를 지킨다.
3. 서버 응답에는 **"무슨 일이 일어났는가"**만 담는다 (`levelUp: true`, `newHanja: [...]`, `expGained: 15`).
   **어떻게 보여줄지(연출)는 클라이언트가 결정**한다. 서버는 연출을 모른다.

---

## 4. 폴더 구조

```
c:\magichanjaadventure
├─ docs/                     # 아키텍처 / 디자인 / 테스트 결정 기록
├─ database/
│  ├─ migrations/            # 0001_init.sql ...  (wrangler d1 migrations)
│  └─ seed/                  # 한자 500자, 업적, NPC 시드
├─ scripts/                  # db 리셋·시드·검증, 시크릿 스캔, 에셋 업로드 (ESM .mjs)
├─ src/
│  ├─ app.css                # Tailwind v4 @theme 디자인 토큰 (단일 진실 공급원)
│  ├─ app.html
│  ├─ app.d.ts               # App.Platform / App.Locals 타입
│  ├─ hooks.server.ts        # 세션 인증, 보안 헤더
│  ├─ lib/
│  │  ├─ components/
│  │  │  ├─ common/          # Button, Card, Panel, ProgressBar, Badge, Modal, Toast
│  │  │  ├─ character/       # KnightSprite, WizardSprite, CharacterCard
│  │  │  ├─ hanja/           # HanjaCard, HanjaReveal, StrokeInfo, ExampleWords
│  │  │  ├─ quiz/            # QuizStage, AnswerButton, ComboMeter, HpBar
│  │  │  ├─ battle/          # BattleCanvas(Pixi lazy), BattleHud
│  │  │  ├─ collection/      # CollectionGrid, CollectionSlot, AreaTabs
│  │  │  ├─ effects/         # Sparkle, Particles, LevelUpOverlay, RewardPopup
│  │  │  └─ art/             # ★ 원본 인라인 SVG 아트 (캐릭터 / 몬스터 / 배경 / 아이콘)
│  │  ├─ stores/             # Svelte 5 runes 전역 상태 (*.svelte.ts)
│  │  ├─ game/               # 순수 게임 로직 (exp, combo, 퀴즈 생성) — 단위 테스트 대상
│  │  ├─ sound/              # 사운드 매니저 (MVP: 구조 + 무음 fallback)
│  │  ├─ utils/  types/
│  │  └─ server/             # ★ 서버 전용. 클라이언트 import 시 SvelteKit이 빌드 에러
│  │     ├─ db/              # D1 repository
│  │     ├─ auth/            # PBKDF2 해시, 세션 발급/검증
│  │     └─ game/            # 보상 확정 (서버 권위)
│  └─ routes/
│     ├─ +layout.svelte      # 전역 배경(하늘/구름/별), 폰트, 사운드 프로바이더
│     ├─ +page.svelte        # 메인 = "모험 지도"
│     ├─ login/  register/
│     ├─ character/          # 캐릭터 선택 (최초 1회)
│     ├─ learn/  quiz/  collection/  battle/
│     ├─ profile/  settings/
│     └─ api/                # +server.ts 엔드포인트
├─ static/                   # 폰트, 파비콘, og 이미지
├─ tests/
│  ├─ e2e/                   # Playwright 시나리오 (사용자 행동 단위)
│  ├─ visual/                # 레이아웃 자동 검수 + 스크린샷 수집
│  ├─ helpers/               # 로그인 헬퍼, 레이아웃 린터
│  └─ fixtures/              # 가짜 테스트 데이터
├─ wrangler.jsonc            # D1 / R2 / assets 바인딩
├─ playwright.config.ts
└─ package.json
```

### 4.1 `lib/game` 과 `lib/server/game` 을 나눈 이유

- `lib/game` — **순수 함수**. 레벨 곡선, 콤보 배수, 오답 보기(distractor) 생성 규칙.
  클라이언트가 "+10 EXP" 같은 즉시 피드백을 그리는 데 쓰고, **서버도 같은 함수를 import** 한다.
- `lib/server/game` — 위 순수 함수를 DB 트랜잭션과 함께 실행해 실제 값을 확정한다.

같은 규칙을 두 번 구현하지 않으므로 "화면에 뜬 숫자 ≠ 저장된 숫자" 버그가 구조적으로 차단된다.

---

## 5. 인증 설계

**수집 정보: 닉네임 + 비밀번호. 그 외 전부 수집하지 않는다.**
이메일·전화·실명·생년월일 없음 → 아동 개인정보 리스크를 설계 단계에서 제거한다.

| 항목          | 결정                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------- |
| 비밀번호 해시 | Web Crypto `PBKDF2-SHA256`, 100,000 iterations, 16-byte random salt                           |
| 저장 포맷     | `pbkdf2$sha256$<iters>$<saltB64>$<hashB64>` (알고리즘 교체 가능하도록 접두사 포함)            |
| 세션 토큰     | `crypto.getRandomValues(32 bytes)` → base64url                                                |
| 세션 저장     | 토큰 원문을 저장하지 않고 **SHA-256 해시**를 `sessions.id`로 저장 (DB 유출 시 세션 탈취 방지) |
| 쿠키          | `HttpOnly; SameSite=Lax; Secure(prod); Path=/; Max-Age=30d`                                   |
| 갱신          | 만료 7일 이내 접근 시 슬라이딩 연장                                                           |
| 로그아웃      | 서버에서 세션 행 삭제 + 쿠키 즉시 만료                                                        |

> **bcrypt / argon2를 쓰지 않는 이유**: Workers 런타임에서 WASM 번들 비용이 크다.
> SubtleCrypto PBKDF2는 네이티브 구현이라 훨씬 빠르고 추가 의존성이 0이다.
>
> ⚠️ **운영 메모**: Workers 무료 플랜의 요청당 CPU 제한(10ms)에서 100k iteration이 빠듯할 수 있다.
> `PBKDF2_ITERATIONS` 상수 하나만 바꾸면 조정되도록 구현하고, 배포 후 실측하여 결정한다(PHASE 20).
> 로그인·가입은 저빈도 요청이라 실사용에 문제가 될 가능성은 낮다.

**보안 헤더** (`hooks.server.ts`): `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`,
`X-Frame-Options: DENY`, 기본 CSP. 로그인/가입 API에는 닉네임 기준 간이 rate limit.

---

## 6. 시크릿 / 개인정보 정책 (강제 규칙)

- `.env`, `.dev.vars`는 **반드시 .gitignore**. `.env.example`만 커밋한다.
- 소스·로그·스크린샷·보고서에 실제 계정·키·토큰을 넣지 않는다.
- 테스트 계정은 전부 가짜: `test_knight`, `test_wizard`, `demo_user` / `TestPassword123!`
- DB에 저장하는 개인 식별 정보: **없음**. `ip`, `user_agent`도 저장하지 않는다.
- `npm run scan:secrets`로 키/토큰/이메일/전화번호 정규식 검사를 상시 수행한다.

---

## 7. 에셋 & 라이선스 전략 (중요 결정)

**모든 캐릭터·몬스터·배경·아이콘을 "직접 작성한 인라인 SVG Svelte 컴포넌트"로 만든다.**

1. **라이선스 리스크 0** — 외부 리소스의 상업적 사용/저작자 표시 조건을 추적할 필요가 없다.
2. **용량** — 캐릭터 1종 2~6KB. 스프라이트 이미지보다 압도적으로 가볍다.
3. **애니메이션** — SVG 내부 파트(눈·모자·망토·검)에 개별적으로 CSS/GSAP를 걸 수 있다.
   "눈 깜빡임", "모자 흔들림", "칼 휘두르기"는 단일 PNG로는 불가능하다.
4. **반응형** — 어떤 해상도에서도 선명하다.
5. **테마** — CSS 변수로 색만 바꿔 몬스터 변종을 즉시 파생한다.

폰트는 OFL 라이선스만 사용한다 (`Jua` = 제목/게임 UI, `Noto Sans KR` = 본문 및 한자 글리프).
근거는 `docs/ASSETS-LICENSE.md`에 기록한다.

사운드는 MVP에서 파일을 넣지 않고 **매니저 구조 + 무음 fallback**만 구현한다.
추후 CC0 출처를 확인한 뒤 추가한다.

---

## 8. 성능 예산

| 항목                     | 목표                                                    |
| ------------------------ | ------------------------------------------------------- |
| 메인 화면 초기 JS (gzip) | < 120KB                                                 |
| PixiJS                   | `/battle` 진입 시에만 `await import('pixi.js')`         |
| GSAP                     | 연출 컴포넌트에서만 동적 import (메인 번들 제외)        |
| 한자 500자 데이터        | 클라이언트 전량 전송 금지. 서버에서 필요한 범위만 전달  |
| 이미지                   | 인라인 SVG 우선. 래스터가 필요하면 WebP/AVIF            |
| 애니메이션               | `transform` / `opacity`만 사용 (레이아웃 리플로우 금지) |
| `prefers-reduced-motion` | 전 연출을 즉시 완료 상태로 대체                         |

---

## 9. 접근성 (초등학생 기준)

- 터치 타깃 **최소 48×48px** (WCAG 44px보다 높게 잡는다 — 아이 손가락 기준)
- 본문 대비 4.5:1, 큰 텍스트 3:1 이상
- 정답/오답을 **색으로만** 알리지 않는다 (아이콘 + 텍스트 + 모션 병행)
- 모든 인터랙티브 요소 키보드 접근 + 가시적 focus ring
- 한자 본체에 읽기 정보를 `aria-label`로 제공
- `prefers-reduced-motion: reduce` 존중

---

## 10. 열린 항목 (추후 판단)

- Workers 무료 플랜 CPU 제한과 PBKDF2 iteration 실측 → PHASE 20
- R2 공개 버킷 vs Worker 프록시 → PHASE 15에서 비용/캐시 기준으로 결정
- 획순(필순) 애니메이션 데이터 500자 전량 확보는 MVP 범위 밖.
  MVP는 `stroke_count` + 정적 안내로 처리하고, 확장 시 라이선스가 명확한 데이터셋만 검토한다.
