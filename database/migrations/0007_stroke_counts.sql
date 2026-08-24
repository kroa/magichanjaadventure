-- ─────────────────────────────────────────────────────────────────────────────
-- 획수 바로잡기 7자
--
-- 배우기 화면이 획수를 **인쇄만** 할 때는 틀려도 티가 안 났다.
-- 획을 실제로 세는 화면이 생기면 아이가 긋는 횟수와 어긋난다.
--
-- 0002_seed_content.sql 은 이미 적용된 마이그레이션이라 고쳐도 다시 돌지 않는다.
-- 그래서 여기서 값만 바로잡는다. 새로 만드는 DB 는 0002 뒤에 이게 이어져 같은 결과가 된다.
--
--   丁 5→2 · 蠶 10→24 · 藏 14→17   (명백한 오류)
--   運 12→13 · 遠 13→14 · 選 15→16 (辶 을 3획으로 셌다 — 近·道·速·週 는 4획으로 센다)
--   朗 10→11                        (같은 시드의 良 7 + 月 4)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE hanjas SET stroke_count =  2 WHERE character = '丁';
UPDATE hanjas SET stroke_count = 24 WHERE character = '蠶';
UPDATE hanjas SET stroke_count = 17 WHERE character = '藏';
UPDATE hanjas SET stroke_count = 13 WHERE character = '運';
UPDATE hanjas SET stroke_count = 14 WHERE character = '遠';
UPDATE hanjas SET stroke_count = 16 WHERE character = '選';
UPDATE hanjas SET stroke_count = 11 WHERE character = '朗';
