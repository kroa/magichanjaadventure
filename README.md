# 마법한자탐험대

> 초등학생이 판타지 RPG를 플레이하면, 그 플레이 자체가 한자 학습이 되는 웹 게임.

한자는 "게임의 소재"가 아니라 게임의 메커니즘 그 자체다.
한자를 배우면 마법을 배우고, 퀴즈를 풀면 몬스터와 싸우고, 도감을 채우면 마법서가 완성된다.

---

## 빠른 시작

```bash
npm install
cp .env.example .dev.vars      # 로컬 시크릿/변수 (git 에 올라가지 않음)
npm run db:migrate             # 로컬 D1 준비 (PHASE 5 이후)
npm run dev
```

## 명령

| 명령                   | 설명                                                |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | 개발 서버 (로컬 D1/R2 바인딩 포함)                  |
| `npm run check`        | Cloudflare 타입 생성 검증 + TypeScript 검사         |
| `npm run lint`         | Prettier + ESLint                                   |
| `npm run format`       | 자동 포맷                                           |
| `npm run test:unit`    | Vitest — 순수 로직 / 데이터 무결성                  |
| `npm run test:e2e`     | Playwright — desktop · tablet · mobile              |
| `npm run test`         | 단위 + E2E                                          |
| `npm run build`        | 프로덕션 빌드 (Cloudflare Worker)                   |
| `npm run preview`      | 빌드 결과를 실제 workerd 런타임으로 실행            |
| **`npm run verify`**   | **시크릿스캔 → 타입 → lint → 단위 → 빌드** (게이트) |
| `npm run scan:secrets` | 시크릿 / 개인정보 패턴 검사                         |
| `npm run db:migrate`   | 로컬 D1 마이그레이션 적용                           |
| `npm run db:reset`     | 로컬 D1 초기화 (로컬 전용, 원격 거부)               |
| `npm run db:query`     | 로컬 D1 에 SQL 실행                                 |
| `npm run build:pages`  | Cloudflare Pages 용 빌드만 (배포 안 함)             |
| `npm run deploy:pages` | Cloudflare Pages 로 빌드 + 배포                     |

`npm run verify` 통과 = 커밋 가능 상태.

### 배포 타깃이 둘인 이유

- **Workers** (`wrangler.jsonc`) — 로컬 개발과 Playwright E2E 가 쓰는 기준 환경
- **Pages** (`wrangler.pages.jsonc`) — 실제 배포

두 설정의 **바인딩(D1 / R2 / vars)은 항상 같아야 한다.** 한쪽만 고치면 그 타깃에서 조용히 사라진다.

### 디자인 확인

`/styleguide` 에서 토큰 · 컴포넌트 · 캐릭터를 한 화면에서 볼 수 있다.
E2E 를 돌리면 주요 화면 스크린샷이 `screenshots/<viewport>/` 에 모인다.

## 기술 스택

SvelteKit 2 (Svelte 5 runes) · TypeScript · Tailwind CSS 4 · GSAP · PixiJS 8
Cloudflare Workers · D1 · R2 · Playwright · Vitest

## 문서

| 문서                                              | 내용                                      |
| ------------------------------------------------- | ----------------------------------------- |
| [00-ARCHITECTURE.md](docs/00-ARCHITECTURE.md)     | 아키텍처 결정, 스택 버전, 인증, 성능 예산 |
| [01-DATABASE.md](docs/01-DATABASE.md)             | D1 스키마, 게임 수치 규칙                 |
| [02-DESIGN-SYSTEM.md](docs/02-DESIGN-SYSTEM.md)   | 색·타이포·모션 토큰, 캐릭터 아트 규칙     |
| [03-TEST-STRATEGY.md](docs/03-TEST-STRATEGY.md)   | 테스트 harness, 레이아웃 자동 검수        |
| [04-CONTENT-PLAN.md](docs/04-CONTENT-PLAN.md)     | 한자 500자 선정 근거, 지역·몬스터·업적    |
| [05-PHASE-PLAN.md](docs/05-PHASE-PLAN.md)         | PHASE 0~21 개발 계획                      |
| [06-ASSETS-LICENSE.md](docs/06-ASSETS-LICENSE.md) | 에셋 라이선스 대장                        |

## 개인정보 원칙

- 수집 정보는 **닉네임과 비밀번호뿐**이다. 이메일·전화·실명·생년월일을 받지 않는다.
- IP, User-Agent 등 식별 가능한 값을 저장하지 않는다.
- 테스트는 전부 가짜 데이터(`test_*`)를 쓴다.
- 시크릿은 `.dev.vars` / `wrangler secret` 으로만 다루며 저장소에 넣지 않는다.
