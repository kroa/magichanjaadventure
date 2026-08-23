-- ─────────────────────────────────────────────────────────────────────────────
-- 낱말 놀이 — 만들어 본 낱말 기록
--
-- 왜 새 표가 필요한가:
-- 합체와 대결은 결과가 **한자 한 글자**라 `user_hanja_progress` 에 그대로 들어간다.
-- 그런데 낱말(敎室)은 `hanjas` 에 행이 없다. 진도 표에 억지로 넣을 수도 없고,
-- 넣으면 도감 개수와 지역 해금 판정이 통째로 부풀려진다.
--
-- 그래서 낱말만 따로 센다. 어느 낱말을 처음 만들었는지가 유일한 관심사라
-- 표가 아주 작다.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_words (
  user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 두 글자 낱말 그 자체가 열쇠다. 별도 id 를 둘 이유가 없다
  word        TEXT    NOT NULL,
  made_count  INTEGER NOT NULL DEFAULT 1,
  first_at    INTEGER NOT NULL,
  last_at     INTEGER NOT NULL,
  -- 같은 낱말을 두 번 세지 않는다 (합체의 ON CONFLICT DO NOTHING 과 같은 방어)
  PRIMARY KEY (user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_user_words_user ON user_words(user_id);
