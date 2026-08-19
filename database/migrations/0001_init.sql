-- ============================================================================
-- 마법한자탐험대 — 초기 스키마
--
-- 규칙 (docs/01-DATABASE.md)
--  · 시각은 INTEGER epoch milliseconds (UTC). 날짜 비교용만 TEXT 'YYYY-MM-DD'
--  · 불리언은 INTEGER 0/1
--  · 사용자 PK 는 TEXT(UUID) — 순차 정수로 남의 계정을 훑지 못하게
--  · 개인 식별 정보(IP, User-Agent, 이메일, 실명)를 담는 컬럼은 존재하지 않는다
-- ============================================================================

-- ── 사용자 ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             TEXT    PRIMARY KEY,
  nickname       TEXT    NOT NULL,          -- 표시용 원문
  nickname_key   TEXT    NOT NULL UNIQUE,   -- 소문자 정규화 (중복 가입 방지)
  password_hash  TEXT    NOT NULL,          -- pbkdf2$sha256$<iters>$<salt>$<hash>
  level          INTEGER NOT NULL DEFAULT 1,
  exp            INTEGER NOT NULL DEFAULT 0,
  total_exp      INTEGER NOT NULL DEFAULT 0,
  gems           INTEGER NOT NULL DEFAULT 0,
  best_combo     INTEGER NOT NULL DEFAULT 0,
  streak_days    INTEGER NOT NULL DEFAULT 0,
  last_played_on TEXT,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

-- ── 캐릭터 ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS characters (
  id         TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class      TEXT    NOT NULL CHECK (class IN ('knight','wizard')),
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
-- "활성 캐릭터는 사용자당 정확히 하나"를 DB 가 보장한다
CREATE UNIQUE INDEX IF NOT EXISTS uq_characters_active
  ON characters(user_id) WHERE is_active = 1;

-- ── 한자 마스터 ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hanjas (
  id             INTEGER PRIMARY KEY,
  character      TEXT    NOT NULL UNIQUE,
  reading        TEXT    NOT NULL,         -- 음. 예: '수'
  meaning        TEXT    NOT NULL,         -- 훈. 예: '물'
  difficulty     INTEGER NOT NULL,         -- 1..7
  grade_label    TEXT    NOT NULL,         -- '8급','7급II',...
  level_required INTEGER NOT NULL DEFAULT 1,
  area_id        INTEGER NOT NULL,         -- 1..7
  category       TEXT    NOT NULL,
  stroke_count   INTEGER NOT NULL,
  example_words  TEXT    NOT NULL,         -- JSON 배열
  description    TEXT    NOT NULL,
  sort_order     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hanjas_area ON hanjas(area_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_hanjas_difficulty ON hanjas(difficulty);

-- ── 한자 진행도 ─────────────────────────────────────────────────────────────
-- 'locked' 상태를 저장하지 않는다. 행이 없으면 아직 못 배운 한자다.
-- 가입 즉시 500행을 만드는 낭비를 피하고, 도감은 LEFT JOIN 한 번으로 끝난다.
CREATE TABLE IF NOT EXISTS user_hanja_progress (
  user_id          TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hanja_id         INTEGER NOT NULL REFERENCES hanjas(id),
  status           TEXT    NOT NULL DEFAULT 'learning'
                           CHECK (status IN ('learning','mastered')),
  mastery          INTEGER NOT NULL DEFAULT 0,
  correct_count    INTEGER NOT NULL DEFAULT 0,
  wrong_count      INTEGER NOT NULL DEFAULT 0,
  learned_at       INTEGER NOT NULL,
  last_reviewed_at INTEGER,
  PRIMARY KEY (user_id, hanja_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user_status
  ON user_hanja_progress(user_id, status);

-- ── 퀴즈 결과 ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_results (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_key   TEXT    NOT NULL,
  hanja_id      INTEGER NOT NULL REFERENCES hanjas(id),
  question_type TEXT    NOT NULL
                CHECK (question_type IN ('meaning','reading','character','word')),
  is_correct    INTEGER NOT NULL,
  combo_at      INTEGER NOT NULL DEFAULT 0,
  exp_gained    INTEGER NOT NULL DEFAULT 0,
  answer_ms     INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quiz_user_time ON quiz_results(user_id, created_at DESC);

-- ── 대결 기록 ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS battle_records (
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
CREATE INDEX IF NOT EXISTS idx_battle_user_time ON battle_records(user_id, created_at DESC);

-- ── 업적 ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id              TEXT    PRIMARY KEY,
  title           TEXT    NOT NULL,
  description     TEXT    NOT NULL,
  icon            TEXT    NOT NULL,
  condition_type  TEXT    NOT NULL
    CHECK (condition_type IN
      ('hanja_learned','combo','level','battle_win','quiz_correct','streak','area_clear')),
  condition_value INTEGER NOT NULL,
  exp_reward      INTEGER NOT NULL DEFAULT 0,
  gem_reward      INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id        TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT    NOT NULL REFERENCES achievements(id),
  unlocked_at    INTEGER NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

-- ── 세션 ────────────────────────────────────────────────────────────────────
-- 원문 토큰을 저장하지 않는다. DB 가 유출되어도 세션을 탈취할 수 없다.
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT    PRIMARY KEY,   -- SHA-256(raw token) hex
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
