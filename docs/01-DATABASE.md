# D1 스키마 설계 (PHASE 0)

D1은 SQLite 호환이다. 아래 규칙을 전 테이블에 적용한다.

- 시각은 전부 **`INTEGER` epoch milliseconds (UTC)**. 문자열 날짜 파싱 버그를 원천 차단한다.
  단, "오늘 접속했는가" 같은 날짜 비교는 `TEXT 'YYYY-MM-DD'`를 따로 둔다.
- 불리언은 `INTEGER 0/1`.
- 사용자 PK는 `TEXT` (UUID v4). 순차 정수 ID로 다른 사용자를 훑는 것을 막는다.
- 콘텐츠(한자) PK는 `INTEGER`. 시드가 결정론적이어야 하므로 ID를 고정한다.
- **개인 식별 정보(IP, User-Agent, 이메일, 실명)를 저장하는 컬럼은 존재하지 않는다.**

---

## 1. users

```sql
CREATE TABLE users (
  id             TEXT    PRIMARY KEY,
  nickname       TEXT    NOT NULL,          -- 표시용 원문
  nickname_key   TEXT    NOT NULL UNIQUE,   -- 소문자 정규화 (중복 가입 방지)
  password_hash  TEXT    NOT NULL,          -- pbkdf2$sha256$<iters>$<salt>$<hash>
  level          INTEGER NOT NULL DEFAULT 1,
  exp            INTEGER NOT NULL DEFAULT 0,  -- 현재 레벨 내 EXP
  total_exp      INTEGER NOT NULL DEFAULT 0,  -- 통산 누적 (업적용)
  gems           INTEGER NOT NULL DEFAULT 0,  -- 보상 재화
  best_combo     INTEGER NOT NULL DEFAULT 0,
  streak_days    INTEGER NOT NULL DEFAULT 0,
  last_played_on TEXT,                        -- 'YYYY-MM-DD'
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
```

`nickname`과 `nickname_key`를 분리하는 이유: 아이가 `별빛기사`와 `별빛기사`(대소문자·전각 차이)를 각각 만드는 혼란을 막으면서, 화면에는 본인이 입력한 그대로 보여주기 위해서다.

---

## 2. characters

```sql
CREATE TABLE characters (
  id         TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class      TEXT    NOT NULL CHECK (class IN ('knight','wizard')),
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_characters_user ON characters(user_id);
CREATE UNIQUE INDEX uq_characters_active ON characters(user_id) WHERE is_active = 1;
```

MVP에서는 사용자당 캐릭터 1개지만, 부분 유니크 인덱스를 써서 **"활성 캐릭터는 항상 정확히 하나"**를 DB가 보장하게 한다. 나중에 캐릭터를 추가해도 스키마를 바꿀 필요가 없다.

---

## 3. hanjas (콘텐츠 마스터)

```sql
CREATE TABLE hanjas (
  id             INTEGER PRIMARY KEY,
  "character"    TEXT    NOT NULL UNIQUE,  -- 예: '水'
  reading        TEXT    NOT NULL,         -- 음. 예: '수'
  meaning        TEXT    NOT NULL,         -- 훈. 예: '물'
  difficulty     INTEGER NOT NULL,         -- 1..7
  grade_label    TEXT    NOT NULL,         -- '8급','7급II','7급','6급II','6급','5급II','5급'
  level_required INTEGER NOT NULL DEFAULT 1,
  area_id        INTEGER NOT NULL,         -- 1..7 (지역 = 난이도 티어)
  category       TEXT    NOT NULL,         -- 자연/숫자/사람/방향/시간/학교/동작/색 ...
  stroke_count   INTEGER NOT NULL,
  example_words  TEXT    NOT NULL,         -- JSON 배열
  description    TEXT    NOT NULL,         -- 아이 눈높이 한 줄 설명
  sort_order     INTEGER NOT NULL
);
CREATE INDEX idx_hanjas_area ON hanjas(area_id, sort_order);
CREATE INDEX idx_hanjas_difficulty ON hanjas(difficulty);
```

`example_words` JSON 형식:

```json
[{ "word": "水泳", "reading": "수영", "meaning": "헤엄치기" }]
```

> D1에는 JSON1 확장이 있지만, 예시 단어는 **읽기 전용**이고 항상 통째로 쓰이므로 JSON 문자열로 저장하는 편이 조인보다 훨씬 싸다.

---

## 4. user_hanja_progress

```sql
CREATE TABLE user_hanja_progress (
  user_id          TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hanja_id         INTEGER NOT NULL REFERENCES hanjas(id),
  status           TEXT    NOT NULL DEFAULT 'learning'
                           CHECK (status IN ('learning','mastered')),
  mastery          INTEGER NOT NULL DEFAULT 0,   -- 0..100
  correct_count    INTEGER NOT NULL DEFAULT 0,
  wrong_count      INTEGER NOT NULL DEFAULT 0,
  learned_at       INTEGER NOT NULL,
  last_reviewed_at INTEGER,
  PRIMARY KEY (user_id, hanja_id)
);
CREATE INDEX idx_progress_user_status ON user_hanja_progress(user_id, status);
```

**`locked` 상태를 저장하지 않는다.** 행이 없으면 아직 못 배운 한자다.
가입 즉시 500행을 만드는 낭비를 피하고, 도감의 "실루엣" 판정은 LEFT JOIN 한 번으로 끝난다.

`mastery` 규칙: 정답 +20, 오답 −15, 0~100로 클램프. 100 도달 시 `status='mastered'`.

---

## 5. quiz_results

```sql
CREATE TABLE quiz_results (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_key   TEXT    NOT NULL,   -- 한 판(세션) 묶음 키
  hanja_id      INTEGER NOT NULL REFERENCES hanjas(id),
  question_type TEXT    NOT NULL
                CHECK (question_type IN ('meaning','reading','character','word')),
  is_correct    INTEGER NOT NULL,
  combo_at      INTEGER NOT NULL DEFAULT 0,
  exp_gained    INTEGER NOT NULL DEFAULT 0,
  answer_ms     INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_quiz_user_time ON quiz_results(user_id, created_at DESC);
```

문제 유형 4종:

| type        | 문제                  | 보기        |
| ----------- | --------------------- | ----------- |
| `meaning`   | 水 의 뜻은?           | 물 / 불 ... |
| `reading`   | 水 는 어떻게 읽을까?  | 수 / 화 ... |
| `character` | '물'을 뜻하는 한자는? | 水 / 木 ... |
| `word`      | 水泳 의 뜻은?         | 헤엄치기... |

---

## 6. battle_records

```sql
CREATE TABLE battle_records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  npc_id         TEXT    NOT NULL,
  area_id        INTEGER NOT NULL,
  result         TEXT    NOT NULL CHECK (result IN ('win','lose')),
  player_hp_left INTEGER NOT NULL,
  enemy_hp_left  INTEGER NOT NULL,
  correct_count  INTEGER NOT NULL,
  wrong_count    INTEGER NOT NULL,
  max_combo      INTEGER NOT NULL,
  exp_gained     INTEGER NOT NULL,
  duration_ms    INTEGER NOT NULL,
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_battle_user_time ON battle_records(user_id, created_at DESC);
```

---

## 7. achievements / user_achievements

```sql
CREATE TABLE achievements (
  id             TEXT    PRIMARY KEY,   -- 'collect_50'
  title          TEXT    NOT NULL,
  description    TEXT    NOT NULL,
  icon           TEXT    NOT NULL,      -- 아트 컴포넌트 키
  condition_type TEXT    NOT NULL
    CHECK (condition_type IN
      ('hanja_learned','combo','level','battle_win','quiz_correct','streak','area_clear')),
  condition_value INTEGER NOT NULL,
  exp_reward      INTEGER NOT NULL DEFAULT 0,
  gem_reward      INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL
);

CREATE TABLE user_achievements (
  user_id        TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT    NOT NULL REFERENCES achievements(id),
  unlocked_at    INTEGER NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);
```

업적 판정은 **`condition_type` + `condition_value` 데이터 주도**로 처리한다.
새 업적을 추가할 때 코드를 고치지 않고 시드 행만 넣는다.

---

## 8. sessions

```sql
CREATE TABLE sessions (
  id         TEXT    PRIMARY KEY,   -- SHA-256(raw token) hex. 원문 토큰은 저장하지 않는다.
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
```

- **원문 토큰을 저장하지 않는다.** DB가 유출되어도 세션을 탈취할 수 없다.
- 만료 행 정리는 로그인 시 확률적(1/20)으로 `DELETE FROM sessions WHERE expires_at < ?`를 실행한다.
  Cron Trigger 없이 무료로 유지된다.

---

## 9. 게임 수치 규칙 (`src/lib/game/`에서 구현, 서버·클라이언트 공유)

### 레벨 곡선

```
expToNextLevel(level) = 60 + level * 40
  Lv1→2 : 100 EXP
  Lv2→3 : 140
  Lv5→6 : 260
  Lv10→11: 460
```

초반 레벨업이 빨라 아이가 3~4문제만 맞혀도 성장 피드백을 받는다. 뒤로 갈수록 완만해진다.

### EXP 획득

| 행동                  | EXP               |
| --------------------- | ----------------- |
| 퀴즈 정답             | +10               |
| 3콤보 이상            | +5                |
| 5콤보 이상            | +10               |
| 10콤보 이상           | +20 (+ 특별 연출) |
| 3초 이내 정답         | +2                |
| **새 한자 최초 획득** | +20               |
| 대결 승리             | +50               |
| 업적 달성             | 업적별            |

콤보 보너스는 **누적이 아니라 최고 구간 하나만** 적용한다(10콤보라고 +5+10+20 주지 않는다). 계산이 단순해야 아이가 규칙을 이해한다.

### 지역 해금

지역은 `level_required`와 **직전 지역 한자 습득률 60%** 를 둘 다 만족해야 열린다.
레벨만으로 열면 쉬운 한자를 건너뛰고, 습득률만으로 열면 진도가 막힌다.

---

## 10. 마이그레이션 운영

```
database/migrations/0001_init.sql        스키마 전체
database/migrations/0002_seed_content.sql 한자/업적/NPC (콘텐츠도 마이그레이션으로)
```

- `wrangler d1 migrations apply` 사용. 로컬은 `--local`, 운영은 `--remote`.
- 콘텐츠 시드를 마이그레이션에 넣는 이유: 500자 데이터는 **스키마만큼이나 앱 동작의 전제**이며,
  로컬·CI·운영이 자동으로 같은 상태가 된다.
- **운영 DB에 대한 파괴적 작업(`DROP`, 전체 `DELETE`)은 마이그레이션에 넣지 않는다.**
  필요하면 별도 스크립트로 명시적 확인을 거친다.
