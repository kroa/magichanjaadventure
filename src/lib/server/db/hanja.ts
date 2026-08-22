import { allPartChars } from '$lib/game/fusion';
import type { ExampleWord } from '../../../../database/seed/types';

export interface HanjaRow {
	id: number;
	character: string;
	reading: string;
	meaning: string;
	difficulty: number;
	grade_label: string;
	level_required: number;
	area_id: number;
	category: string;
	stroke_count: number;
	example_words: string;
	description: string;
	sort_order: number;
}

export interface Hanja {
	id: number;
	character: string;
	reading: string;
	meaning: string;
	difficulty: number;
	gradeLabel: string;
	areaId: number;
	category: string;
	strokeCount: number;
	exampleWords: ExampleWord[];
	description: string;
	sortOrder: number;
}

export interface HanjaWithProgress extends Hanja {
	learned: boolean;
	mastery: number;
	correctCount: number;
	wrongCount: number;
}

export function toHanja(row: HanjaRow): Hanja {
	let words: ExampleWord[];
	try {
		words = JSON.parse(row.example_words) as ExampleWord[];
	} catch {
		// 데이터가 깨져도 화면 전체가 죽으면 안 된다. 예시 단어만 비운다.
		words = [];
	}
	return {
		id: row.id,
		character: row.character,
		reading: row.reading,
		meaning: row.meaning,
		difficulty: row.difficulty,
		gradeLabel: row.grade_label,
		areaId: row.area_id,
		category: row.category,
		strokeCount: row.stroke_count,
		exampleWords: words,
		description: row.description,
		sortOrder: row.sort_order
	};
}

/** 지역별 도감. 진행도를 LEFT JOIN 하므로 못 배운 한자도 함께 나온다. */
export async function listAreaHanja(
	db: D1Database,
	areaId: number,
	userId: string
): Promise<HanjaWithProgress[]> {
	const { results } = await db
		.prepare(
			`SELECT h.*, p.mastery, p.correct_count, p.wrong_count, p.learned_at
			 FROM hanjas h
			 LEFT JOIN user_hanja_progress p ON p.hanja_id = h.id AND p.user_id = ?
			 WHERE h.area_id = ?
			 ORDER BY h.sort_order`
		)
		.bind(userId, areaId)
		.all<
			HanjaRow & {
				mastery: number | null;
				correct_count: number | null;
				wrong_count: number | null;
				learned_at: number | null;
			}
		>();

	return results.map((row) => ({
		...toHanja(row),
		learned: row.learned_at !== null,
		mastery: row.mastery ?? 0,
		correctCount: row.correct_count ?? 0,
		wrongCount: row.wrong_count ?? 0
	}));
}

/**
 * 아직 배우지 않은 한자 중 다음에 배울 것들.
 *
 * **지역 안에서 "합체 부품" 을 먼저 낸다.**
 *
 * 원래는 급수 순서(sort_order)를 그대로 따랐다. 그러면 새싹 마을의 3~10번째가
 * `三四五六七八九十` 여덟 자 연속인데, 이 글자들은 그림도 없고 조리법에도 안 쓰인다.
 * 아이는 첫 열 번의 발굴 동안 이 앱의 대표 장면(그림이 글자로 바뀌고, 붙이면 새 글자가 되는 것)을
 * **한 번도 못 본다.** "새싹 마을인데 어렵다" 는 말의 실체가 이것이다.
 *
 * 순서를 바꾸면 첫 합체가 12번째에서 **4번째**로 당겨지고, 앞 13자가 전부 그림을 갖는다.
 *
 * 급수 체계는 건드리지 않는다 — `sort_order` · `area_id` · 시드 배열 모두 그대로다.
 * (시드 행 순서를 바꾸면 id 가 밀려 저장된 진도가 딴 글자를 가리킨다.)
 * 도감(`listAreaHanja`)은 여전히 `sort_order` 로 보여 주므로 표준 순서도 화면에 남는다.
 */
export async function listUnlearned(
	db: D1Database,
	userId: string,
	areaId: number,
	limit = 12
): Promise<Hanja[]> {
	const parts = allPartChars();
	const holes = parts.map(() => '?').join(',');

	const sql = (op: 'IN' | 'NOT IN') =>
		`SELECT h.* FROM hanjas h
		 LEFT JOIN user_hanja_progress p ON p.hanja_id = h.id AND p.user_id = ?
		 WHERE h.area_id = ? AND p.hanja_id IS NULL AND h.character ${op} (${holes})
		 ORDER BY h.sort_order
		 LIMIT ?`;

	// 1) 조합에 쓰이는 부품부터 — 배우자마자 붙여 볼 수 있다
	const first = await db
		.prepare(sql('IN'))
		.bind(userId, areaId, ...parts, limit)
		.all<HanjaRow>();

	if (first.results.length >= limit) return first.results.map(toHanja);

	// 2) 모자라면 나머지를 원래 급수 순서 그대로 채운다
	const rest = await db
		.prepare(sql('NOT IN'))
		.bind(userId, areaId, ...parts, limit - first.results.length)
		.all<HanjaRow>();

	return [...first.results, ...rest.results].map(toHanja);
}

export async function getHanja(db: D1Database, id: number): Promise<Hanja | null> {
	const row = await db.prepare('SELECT * FROM hanjas WHERE id = ?').bind(id).first<HanjaRow>();
	return row ? toHanja(row) : null;
}

/** 지역별로 몇 자를 배웠는지 — 지역 해금 판정에 쓴다. */
export async function learnedCountByArea(
	db: D1Database,
	userId: string
): Promise<Record<number, number>> {
	const { results } = await db
		.prepare(
			`SELECT h.area_id AS area_id, COUNT(*) AS n
			 FROM user_hanja_progress p JOIN hanjas h ON h.id = p.hanja_id
			 WHERE p.user_id = ?
			 GROUP BY h.area_id`
		)
		.bind(userId)
		.all<{ area_id: number; n: number }>();

	const map: Record<number, number> = {};
	for (const row of results) map[row.area_id] = row.n;
	return map;
}

export async function totalLearned(db: D1Database, userId: string): Promise<number> {
	const row = await db
		.prepare('SELECT COUNT(*) AS n FROM user_hanja_progress WHERE user_id = ?')
		.bind(userId)
		.first<{ n: number }>();
	return row?.n ?? 0;
}

/** 한자를 처음 획득한다. 이미 있으면 false. */
export async function learnHanja(
	db: D1Database,
	userId: string,
	hanjaId: number,
	now = Date.now()
): Promise<boolean> {
	const result = await db
		.prepare(
			`INSERT INTO user_hanja_progress (user_id, hanja_id, status, mastery, learned_at, last_reviewed_at)
			 VALUES (?, ?, 'learning', 0, ?, ?)
			 ON CONFLICT(user_id, hanja_id) DO NOTHING`
		)
		.bind(userId, hanjaId, now, now)
		.run();

	return (result.meta?.changes ?? 0) > 0;
}

/**
 * 복습 대상 뽑기 — 가중 출제.
 *
 * 단순 랜덤은 이미 아는 한자만 반복시켜 학습 효율이 떨어진다.
 * 틀린 적 있는 한자와 오래 안 본 한자에 가중치를 준다.
 * (docs/04-CONTENT-PLAN.md §6)
 */
export async function pickQuizPool(
	db: D1Database,
	userId: string,
	limit: number
): Promise<Hanja[]> {
	const now = Date.now();
	const { results } = await db
		.prepare(
			`SELECT h.*, p.wrong_count, p.mastery, p.last_reviewed_at
			 FROM user_hanja_progress p JOIN hanjas h ON h.id = p.hanja_id
			 WHERE p.user_id = ?`
		)
		.bind(userId)
		.all<HanjaRow & { wrong_count: number; mastery: number; last_reviewed_at: number | null }>();

	if (results.length === 0) return [];

	const scored = results.map((row) => {
		const daysSince = row.last_reviewed_at
			? Math.min(7, (now - row.last_reviewed_at) / (24 * 60 * 60 * 1000))
			: 7;
		const weight = 1 + row.wrong_count * 3 + daysSince - row.mastery / 25;
		// 가중치를 지수 분포로 변환해 뽑으면 정렬 한 번으로 가중 무작위 추출이 된다
		return { row, key: -Math.log(Math.random() + 1e-9) / Math.max(0.1, weight) };
	});

	scored.sort((a, b) => a.key - b.key);
	return scored.slice(0, limit).map((s) => toHanja(s.row));
}

/** 오답 보기용 — 같은 지역의 다른 한자들. */
export async function pickDistractors(
	db: D1Database,
	areaId: number,
	excludeId: number,
	count: number
): Promise<Hanja[]> {
	const { results } = await db
		.prepare(
			`SELECT * FROM hanjas
			 WHERE area_id = ? AND id != ?
			 ORDER BY RANDOM() LIMIT ?`
		)
		.bind(areaId, excludeId, count)
		.all<HanjaRow>();

	if (results.length >= count) return results.map(toHanja);

	// 지역에 한자가 모자라면 전체에서 채운다
	const { results: extra } = await db
		.prepare(`SELECT * FROM hanjas WHERE id != ? ORDER BY RANDOM() LIMIT ?`)
		.bind(excludeId, count)
		.all<HanjaRow>();

	const seen = new Set(results.map((r) => r.id));
	const merged = [...results];
	for (const row of extra) {
		if (merged.length >= count) break;
		if (seen.has(row.id)) continue;
		seen.add(row.id);
		merged.push(row);
	}
	return merged.map(toHanja);
}

/**
 * 합체에 **쓰인 부품**의 숙련도를 올린다.
 *
 * 이걸 만들기 전까지 모든 아이의 `mastery` 는 영원히 0 이었다.
 * 올리는 코드가 `recordReview` 하나뿐인데 그 유일한 호출처(`/api/quiz/answer`)를
 * 어떤 화면도 부르지 않았기 때문이다. 나머지 세 곳은 전부 `mastery 0` 으로 INSERT 만 했다.
 * 그래서 `fadeStage` 가 2단계(글자만)에 **한 번도 도달하지 못했고**, 백 번 붙여 본 日 도
 * 계속 해 그림으로 보였다. 도감의 「익힘 %」와 금색 배지도 같이 죽어 있었다.
 *
 * **UPSERT 가 아니라 순수 UPDATE 다.** 대결은 아이가 안 배운 부품도 판에 깔기 때문에,
 * UPSERT 로 만들면 배운 적 없는 글자가 진도에 들어와 지역 해금 게이트를 부풀린다.
 * 행이 없으면 아무 일도 일어나지 않는 것이 맞다.
 *
 * delta 가 +20 이 아닌 이유: 세 번 만에 그림이 사라진다. 아이에게 그건 보상이 아니라 상실이다.
 * +10 이면 다섯 번을 붙여야 글자로 바뀐다.
 */
export async function bumpMastery(
	db: D1Database,
	userId: string,
	hanjaIds: number[],
	delta = 10,
	now = Date.now()
): Promise<void> {
	const ids = [...new Set(hanjaIds)].filter((id) => Number.isInteger(id));
	if (ids.length === 0) return;

	await db
		.prepare(
			`UPDATE user_hanja_progress
			 SET mastery       = MAX(0, MIN(100, mastery + ?)),
			     correct_count = correct_count + 1,
			     status        = CASE WHEN MIN(100, mastery + ?) >= 100 THEN 'mastered' ELSE status END,
			     last_reviewed_at = ?
			 WHERE user_id = ? AND hanja_id IN (${ids.map(() => '?').join(',')})`
		)
		.bind(delta, delta, now, userId, ...ids)
		.run();
}

export async function recordReview(
	db: D1Database,
	userId: string,
	hanjaId: number,
	isCorrect: boolean,
	now = Date.now()
): Promise<void> {
	// mastery: 정답 +20, 오답 -15, 0~100 클램프. 100 이면 mastered
	await db
		.prepare(
			`UPDATE user_hanja_progress
			 SET correct_count = correct_count + ?,
			     wrong_count   = wrong_count + ?,
			     mastery       = MAX(0, MIN(100, mastery + ?)),
			     status        = CASE WHEN MAX(0, MIN(100, mastery + ?)) >= 100 THEN 'mastered' ELSE 'learning' END,
			     last_reviewed_at = ?
			 WHERE user_id = ? AND hanja_id = ?`
		)
		.bind(
			isCorrect ? 1 : 0,
			isCorrect ? 0 : 1,
			isCorrect ? 20 : -15,
			isCorrect ? 20 : -15,
			now,
			userId,
			hanjaId
		)
		.run();
}
