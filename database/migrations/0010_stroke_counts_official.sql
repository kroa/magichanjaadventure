-- ─────────────────────────────────────────────────────────────────────────────
-- 총획 6자를 공식 자료에 맞춘다
--
-- 부수를 옮겨 오면서 한국어문회 마스터 파일의 총획과 대조하니 6자가 어긋나 있었다.
-- 획수는 글자 페이지·낱말 페이지가 매번 찍는 값이고, 배우기 화면에서 아이가
-- 긋는 횟수와도 이어지므로 틀린 채로 둘 수 없다.
--
--   極 12→13 · 毒 8→9 · 肅 12→13 · 憶 15→16 · 藏 17→18 · 華 12→11
--
-- 藏 은 예전에 "14→17 로 고쳤다" 고 검사에까지 적어 둔 값인데, 그 교정 자체가
-- 틀렸다. 그때는 시드 안에서 서로 모순되는 것만 볼 수 있었고 바깥 기준이 없었다.
--
-- 이 6자는 획순 좌표(99자)에 들어 있지 않으므로 통로 검사와는 무관하다.
-- 글자로 지목하므로 id 가 무엇이든 안전하다 — 진행 기록은 건드리지 않는다.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE hanjas SET stroke_count = 13 WHERE character = '極';
UPDATE hanjas SET stroke_count = 9 WHERE character = '毒';
UPDATE hanjas SET stroke_count = 13 WHERE character = '肅';
UPDATE hanjas SET stroke_count = 16 WHERE character = '憶';
UPDATE hanjas SET stroke_count = 18 WHERE character = '藏';
UPDATE hanjas SET stroke_count = 11 WHERE character = '華';
