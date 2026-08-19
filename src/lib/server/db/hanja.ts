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

/** 아직 배우지 않은 한자 중 다음에 배울 것들. */
export async function listUnlearned(
	db: D1Database,
	userId: string,
	areaId: number,
	limit = 12
): Promise<Hanja[]> {
	const { results } = await db
		.prepare(
			`SELECT h.* FROM hanjas h
			 LEFT JOIN user_hanja_progress p ON p.hanja_id = h.id AND p.user_id = ?
			 WHERE h.area_id = ? AND p.hanja_id IS NULL
			 ORDER BY h.sort_order
			 LIMIT ?`
		)
		.bind(userId, areaId, limit)
		.all<HanjaRow>();
	return results.map(toHanja);
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
