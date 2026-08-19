-- ============================================================================
-- 상점 — 캐릭터 확장 + 장비 아이템
--
-- characters.class 의 CHECK 제약이 ('knight','wizard') 로 묶여 있어서
-- 새 캐릭터를 넣을 수 없다. SQLite 는 CHECK 를 ALTER 로 못 바꾸므로
-- **테이블을 다시 만들고 데이터를 옮긴다.** (SQLite 공식 권장 절차)
-- ============================================================================

-- ── 1. characters 재작성 ────────────────────────────────────────────────────
CREATE TABLE characters_new (
  id         TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class      TEXT    NOT NULL CHECK (class IN ('knight','wizard','archer','sage','fox')),
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

INSERT INTO characters_new (id, user_id, class, is_active, created_at)
  SELECT id, user_id, class, is_active, created_at FROM characters;

DROP TABLE characters;
ALTER TABLE characters_new RENAME TO characters;

CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
-- "활성 캐릭터는 사용자당 정확히 하나"를 DB 가 계속 보장하도록 다시 만든다
CREATE UNIQUE INDEX IF NOT EXISTS uq_characters_active
  ON characters(user_id) WHERE is_active = 1;

-- ── 2. 보유 아이템 ──────────────────────────────────────────────────────────
-- 아이템 정의는 코드(src/lib/types/item.ts)에 둔다.
-- DB 에는 "누가 무엇을 가졌는가"만 저장한다 — 가격/능력치가 바뀌어도 마이그레이션이 필요 없다.
CREATE TABLE IF NOT EXISTS user_items (
  user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     TEXT    NOT NULL,
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(user_id);
