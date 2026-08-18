# 테스트 전략 / Harness 설계 (PHASE 0)

> 목표: **AI가 스스로 실행하고 관찰하고 고칠 수 있는 개발 환경**을 만든다.
> "코드상 문제 없어 보임"으로 끝내지 않는다. 항상 실제 브라우저에서 확인한다.

---

## 1. 명령 체계

| 명령                   | 하는 일                                                      | 소요 |
| ---------------------- | ------------------------------------------------------------ | ---- |
| `npm run dev`          | Vite dev (로컬 D1/R2 바인딩 프록시 포함)                     | —    |
| `npm run check`        | `wrangler types` + `svelte-check` (TS 타입 검사)             | ~15s |
| `npm run lint`         | `prettier --check` + `eslint`                                | ~15s |
| `npm run format`       | 자동 포맷                                                    | ~5s  |
| `npm run test:unit`    | Vitest — 순수 로직 + 데이터 무결성                           | ~5s  |
| `npm run test:e2e`     | Playwright — 3 viewport                                      | ~60s |
| `npm run build`        | 프로덕션 빌드 (Worker 번들)                                  | ~15s |
| `npm run verify`       | **scan:secrets → check → lint → test:unit → build** (게이트) | ~60s |
| `npm run clean`        | 빌드 산출물 정리 (`check` 가 자동 실행)                      | ~1s  |
| `npm run db:migrate`   | 로컬 D1 마이그레이션 적용                                    | ~3s  |
| `npm run db:reset`     | 로컬 D1 초기화 후 재적용 (⚠️ 로컬 전용)                      | ~5s  |
| `npm run scan:secrets` | 시크릿/개인정보 패턴 스캔                                    | ~2s  |

`npm run verify`가 **커밋 가능 상태의 정의**다. 빨간 상태로 다음 기능에 넘어가지 않는다.

---

## 2. 테스트 피라미드

```
        ┌───────────────────────────┐
        │  E2E (Playwright)         │  사용자 시나리오 · 3 viewport
        │  느리지만 진실            │
        ├───────────────────────────┤
        │  Visual / Layout 검수     │  자동 레이아웃 린트 + 스크린샷
        ├───────────────────────────┤
        │  Unit (Vitest)            │  EXP·콤보·퀴즈생성·해시·데이터검증
        │  빠르고 촘촘              │
        └───────────────────────────┘
```

**단위 테스트를 붙이는 곳** (`src/lib/game/`, `src/lib/server/auth/`)

- 레벨 곡선 / EXP 계산 / 콤보 보너스 — 경계값 중심
- 퀴즈 문항 생성 — 정답이 보기에 정확히 1개, 오답 중복 없음, 보기 개수 4개
- PBKDF2 해시 — 같은 비밀번호가 매번 다른 해시, 검증은 통과, 잘못된 비번은 실패
- **한자 500자 데이터 무결성** — 개수 500, 한자 중복 없음, 필수 필드 공백 없음,
  `stroke_count` 1–30, `example_words` JSON 파싱 가능, `area_id` 1–7

마지막 항목이 특히 중요하다. 콘텐츠 데이터의 오류는 **아이에게 잘못된 지식을 가르치는 버그**다.
일반 버그보다 심각하게 취급한다.

**단위 테스트를 붙이지 않는 곳**: Svelte 컴포넌트 렌더링 세부. E2E가 더 정확하고 저렴하다.

---

## 3. E2E 원칙

### 사용자 행동 단위로 쓴다

```
❌ "createSession() 함수가 호출된다"
✅ "아이가 가입하고 → 마법사를 고르고 → 水를 배우고 → 퀴즈를 맞히면 → EXP가 오르고 → 도감에 水가 컬러로 보인다"
```

### 셀렉터 정책

- 1순위: **역할 기반** — `getByRole('button', { name: '한자 배우기' })`
- 2순위: `getByLabel` / `getByText`
- 3순위: `data-testid` — 위 둘로 안정적으로 못 잡을 때만 (예: 캔버스, 파티클 컨테이너)
- **CSS 클래스 셀렉터 금지.** Tailwind 클래스는 디자인 개선 때마다 바뀐다.

### 애니메이션과의 공존 (가장 흔한 E2E 실패 원인)

이 프로젝트는 연출이 많아 "요소는 있는데 아직 움직이는 중"인 순간이 많다.

1. 연출이 끝나면 컨테이너에 `data-anim-state="done"`을 붙이고, 테스트는 이것을 기다린다.
2. `PUBLIC_E2E=1`이면 GSAP `timeScale`을 올려 연출을 압축한다(**건너뛰지 않는다** — 연출 후 최종 상태를 검증해야 하므로).
3. 임의의 `waitForTimeout`을 쓰지 않는다.

### 테스트 데이터

- 계정은 전부 가짜: `test_knight`, `test_wizard`, `demo_user` / `TestPassword123!`
- 각 테스트는 **자기 사용자를 직접 만든다**(worker index로 접미사를 붙여 병렬 충돌 방지).
- `globalSetup`에서 로컬 D1 마이그레이션을 적용하고 `test_%` 계정을 정리한다.
- **운영 DB를 대상으로 테스트를 실행하지 않는다.** 스크립트에 `--local` 가드를 건다.

---

## 4. Viewport 매트릭스

| 프로젝트  | 크기     | 기기 프로파일      | 대상                 |
| --------- | -------- | ------------------ | -------------------- |
| `desktop` | 1280×800 | Chromium           | 전체 시나리오        |
| `tablet`  | 1024×768 | Chromium 터치      | 주요 화면 레이아웃   |
| `mobile`  | 390×844  | iPhone 13 프로파일 | 전체 시나리오 (핵심) |

주요 화면은 **최소 desktop + mobile**을 통과해야 한다.
아이의 실사용 1순위 기기는 태블릿/모바일이므로 모바일 실패는 데스크톱 실패와 동급으로 취급한다.

---

## 5. 시각 검수 자동화 (이 프로젝트의 핵심 harness)

픽셀 단위 스크린샷 비교(`toHaveScreenshot`)는 **쓰지 않는다.**
파티클과 랜덤 idle 모션 때문에 상시 실패하여 신호가 아니라 소음이 된다.

대신 **레이아웃 규칙을 코드로 검사**한다. `tests/helpers/layout.ts`:

| 검사            | 판정 기준                                            |
| --------------- | ---------------------------------------------------- |
| 가로 오버플로   | `document.scrollWidth <= window.innerWidth + 1`      |
| 텍스트 잘림     | 요소의 `scrollWidth/Height > clientWidth/Height + 2` |
| 터치 타깃 크기  | 모든 button/a/input의 bounding box ≥ 48×48 (모바일)  |
| 요소 겹침       | 주요 인터랙티브 요소들의 bounding box 교차 없음      |
| 화면 밖 이탈    | 모든 가시 요소가 viewport 안에 있음                  |
| 이미지/SVG 잘림 | 캐릭터 컨테이너가 부모 밖으로 나가지 않음            |
| 대비            | 주요 텍스트 4.5:1 이상                               |

이 검사는 **주장(assertion)**이므로 실패하면 빌드가 멈춘다. 사람이 스크린샷을 볼 필요가 없다.

그와 별개로, 주요 화면 스크린샷을 `test-results/screens/<viewport>/<screen>.png`로 **수집**한다.
이건 실패시키지 않고 사람(그리고 나)이 디자인을 눈으로 확인하는 용도다.

필수 수집 화면: 로그인 · 회원가입 · 메인 · 캐릭터 선택 · 한자 학습 · 퀴즈 · 퀴즈 정답 연출 ·
도감 · 레벨업 · 대결 · 보상 · 프로필

---

## 6. 로컬 D1과 테스트 환경

```
wrangler.jsonc → d1_databases: [{ binding: "DB", ... }]
          ↓
   vite dev  : adapter-cloudflare의 platform proxy가 로컬 D1을 주입
   wrangler dev : 실제 workerd 런타임 + 동일한 로컬 D1
          ↓
   .wrangler/state/v3/d1  (git 무시됨)
```

Playwright `webServer`는 **`npm run build && npm run preview`(=`wrangler dev`)**를 사용한다.
`vite dev`보다 느리지만 **실제 workerd 런타임에서 검증**하므로
"로컬에서 되는데 배포하면 안 되는" 문제를 CI 전에 잡는다.

`npm run db:reset`에는 `--local` 플래그를 하드코딩하고,
`--remote`가 인자로 들어오면 스크립트가 **거부**한다. 운영 데이터 삭제 사고를 원천 차단한다.

### 알아둘 것: `worker-configuration.d.ts` 는 커밋하지 않는다

`wrangler types` 의 출력은 **빌드 산출물 존재 여부에 따라 달라진다**
(`.svelte-kit/cloudflare/_worker.js` 가 있을 때만 `Cloudflare.GlobalProps.mainModule` 블록이 붙는다).
따라서 이 파일을 커밋해두고 `wrangler types --check` 로 고정하면
"빌드 전/후"에 따라 CI가 무작위로 실패한다. 커밋하지 않고 항상 재생성한다.

### 알아둘 것: `check` 는 먼저 빌드 산출물을 지운다

`svelte-check` 는 `--tsconfig` 사용 시 tsconfig 의 `exclude` 와 무관하게 워크스페이스를 훑고,
`--ignore` 는 `--no-tsconfig` 와만 함께 쓸 수 있다.
그래서 빌드 후에 `check` 를 돌리면 번들 JS 까지 검사해 **483개의 가짜 오류**가 난다.
`scripts/clean.mjs` 가 타입 검사 직전에 산출물을 지우는 이유다.

---

## 7. 시크릿 스캔

`npm run scan:secrets` — 추적 대상 파일에서 다음 패턴을 검사한다.

- Cloudflare API 토큰 / account id 형태
- `sk-`, `ghp_`, `AKIA` 등 알려진 키 접두사
- 이메일 / 전화번호 / 주민번호 형태
- `.env` 파일이 커밋 대상에 포함되었는지
- 하드코딩된 `password = "..."` 중 테스트 픽스처가 아닌 것

CI와 PHASE 완료 게이트에서 실행한다.

---

## 8. CI (GitHub Actions)

```
push / PR
  ├─ npm ci
  ├─ npm run scan:secrets
  ├─ npm run check
  ├─ npm run lint
  ├─ npm run test:unit
  ├─ npm run build
  └─ npm run test:e2e   (screens 아티팩트 업로드)
```

시크릿 스캔을 **가장 앞에** 둔다. 나머지가 아무리 통과해도 시크릿이 새면 실패여야 한다.

---

## 9. 기능 완료(Definition of Done)

하나의 기능은 아래를 **전부** 만족해야 완료다.

1. 기능 구현
2. `npm run check` PASS (TypeScript 오류 0)
3. `npm run lint` PASS
4. `npm run test:unit` PASS
5. `npm run build` PASS
6. 관련 Playwright E2E PASS (desktop + mobile)
7. 레이아웃 자동 검수 PASS
8. 주요 화면 스크린샷 확인
9. `npm run scan:secrets` PASS
