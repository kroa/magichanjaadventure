-- ─────────────────────────────────────────────────────────────────────────────
-- 캐릭터 '한자 천재' 추가
--
-- characters.class 의 CHECK 제약에 새 값을 넣어야 한다.
-- SQLite 는 CHECK 를 ALTER 로 못 바꾸므로 0003 과 똑같이 표를 다시 만든다.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS characters_v3 (
  id         TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class      TEXT    NOT NULL
             CHECK (class IN ('knight','wizard','archer','sage','fox','genius')),
  is_active  INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

INSERT INTO characters_v3 (id, user_id, class, is_active, created_at)
  SELECT id, user_id, class, is_active, created_at FROM characters;

DROP TABLE characters;
ALTER TABLE characters_v3 RENAME TO characters;

CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
