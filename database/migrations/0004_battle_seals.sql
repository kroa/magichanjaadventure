-- ─────────────────────────────────────────────────────────────────────────────
-- 합체 대결 — 봉인 파괴 기록
--
-- 왜 새 테이블이 필요한가:
--   /api/battle/finish 는 승리를 quiz_results 의 세션 정답 수로 검증한다.
--   합체 공격은 그 표에 아무것도 남기지 않으므로, 그대로 두면 **모든 대결이 패배로
--   기록되고 보상이 0** 이 된다. 에러도 안 나고 조용히 망가진다.
--   quiz_results.question_type 에는 CHECK 제약이 걸려 있어 'fusion' 을 끼워 넣을 수도 없다.
--
-- 왜 가변 칼럼이 하나도 없는가:
--   D1 은 Workers 바인딩에서 인터랙티브 트랜잭션이 없다. 읽고-고쳐-쓰는 칼럼을 두면
--   더블탭 한 번에 두 요청이 끼어들어 봉인이 조용히 안 깨진다.
--   그래서 **추가만 하는 로그**로 만들고, 상태는 언제나 이 로그를 세어서 얻는다.
--
-- PRIMARY KEY 가 곧 중복 정산 방어다.
--   같은 봉인을 두 번 깨도 행은 하나뿐이라 보상이 두 번 나가지 않는다.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS battle_seals (
  user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_key TEXT    NOT NULL,
  seal_index  INTEGER NOT NULL,
  -- 깨뜨린 한자. 서버가 유도한 목표와 같은지 확인한 뒤에만 들어온다
  result_char TEXT    NOT NULL,
  -- 도움 없이 첫 시도에 맞혔는가 (별 판정에 쓴다)
  first_try   INTEGER NOT NULL DEFAULT 0,
  broken_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, session_key, seal_index)
);

CREATE INDEX IF NOT EXISTS idx_battle_seals_session
  ON battle_seals(user_id, session_key);
