import { toHanja, type Hanja, type HanjaRow } from './hanja';
import { FUSION_RECIPES, allPartChars, allResultChars, fuse } from '$lib/game/fusion';

/**
 * 합체 — 서버 쪽.
 *
 * **판정은 반드시 여기서 한다.** 화면은 즉시 반응을 그리려고 같은 함수를 한 번 더 돌릴 뿐이고,
 * 실제로 한자를 얻었는지는 서버가 정한다. 그렇지 않으면 요청을 흉내 내는 것만으로
 * 아무 한자나 가질 수 있다 (상점의 보석 검증과 같은 이유다).
 *
 * 발견 기록을 따로 저장하지 않는다. **합체로 얻은 한자는 그냥 배운 한자다.**
 * `user_hanja_progress` 한 곳만 보면 도감·진도·합체가 전부 일관되게 맞아떨어진다.
 */

/** 부품으로도 쓰이고 결과로도 쓰이는 한자를 한 번에 조회한다. */
async function charsToHanja(db: D1Database, chars: string[]): Promise<Map<string, Hanja>> {
	if (chars.length === 0) return new Map();
	const holes = chars.map(() => '?').join(',');
	const { results } = await db
		.prepare(`SELECT * FROM hanjas WHERE character IN (${holes})`)
		.bind(...chars)
		.all<HanjaRow>();
	return new Map(results.map((row) => [row.character, toHanja(row)]));
}

export interface WorkshopPart {
	character: string;
	reading: string;
	meaning: string;
	hanjaId: number;
}

export interface WorkshopState {
	/** 아이가 이미 배워서 재료로 쓸 수 있는 부품 */
	parts: WorkshopPart[];
	/** 아직 못 배워서 잠겨 있는 부품 (몇 개 남았는지만 보여 준다) */
	lockedPartCount: number;
	/** 이미 만들어 낸 한자 */
	discovered: string[];
}

/**
 * 공방 상태를 읽는다.
 *
 * 아이가 **배운 한자만** 재료가 된다. 그래야 "모을수록 만들 수 있는 게 늘어난다" 는
 * 되먹임이 생기고, 배우기 화면과 공방이 서로를 밀어 준다.
 */
export async function loadWorkshop(db: D1Database, userId: string): Promise<WorkshopState> {
	const partChars = allPartChars();
	const resultChars = allResultChars();

	const { results } = await db
		.prepare(
			`SELECT h.character AS character
			 FROM user_hanja_progress p JOIN hanjas h ON h.id = p.hanja_id
			 WHERE p.user_id = ?`
		)
		.bind(userId)
		.all<{ character: string }>();

	const learned = new Set(results.map((r) => r.character));
	const ownedPartChars = partChars.filter((c) => learned.has(c));
	const byChar = await charsToHanja(db, ownedPartChars);

	return {
		parts: ownedPartChars
			.map((c) => byChar.get(c))
			.filter((h): h is Hanja => !!h)
			.map((h) => ({
				character: h.character,
				reading: h.reading,
				meaning: h.meaning,
				hanjaId: h.id
			})),
		lockedPartCount: partChars.length - ownedPartChars.length,
		discovered: resultChars.filter((c) => learned.has(c))
	};
}

export type FusionOutcome =
	| { ok: false; reason: 'no-recipe' | 'missing-parts' }
	| { ok: true; result: Hanja; story: string; alreadyKnown: boolean };

/**
 * 합체를 시도한다.
 *
 * 실패해도 **벌을 주지 않는다.** 아무 일도 일어나지 않을 뿐이다.
 * 아이가 마음 놓고 아무거나 붙여 볼 수 있어야 발견이 일어난다.
 */
export async function tryFuse(
	db: D1Database,
	userId: string,
	parts: string[]
): Promise<FusionOutcome> {
	const recipe = fuse(parts);
	if (!recipe) return { ok: false, reason: 'no-recipe' };

	// 배우지 않은 부품으로는 합칠 수 없다 — 요청을 직접 만들어도 마찬가지다
	const needed = [...new Set(recipe.parts)];
	const holes = needed.map(() => '?').join(',');
	const owned = await db
		.prepare(
			`SELECT COUNT(DISTINCT h.character) AS n
			 FROM user_hanja_progress p JOIN hanjas h ON h.id = p.hanja_id
			 WHERE p.user_id = ? AND h.character IN (${holes})`
		)
		.bind(userId, ...needed)
		.first<{ n: number }>();

	if ((owned?.n ?? 0) < needed.length) return { ok: false, reason: 'missing-parts' };

	const row = await db
		.prepare('SELECT * FROM hanjas WHERE character = ?')
		.bind(recipe.result)
		.first<HanjaRow>();
	if (!row) return { ok: false, reason: 'no-recipe' };

	const hanja = toHanja(row);
	const now = Date.now();
	const inserted = await db
		.prepare(
			`INSERT INTO user_hanja_progress (user_id, hanja_id, status, mastery, learned_at, last_reviewed_at)
			 VALUES (?, ?, 'learning', 0, ?, ?)
			 ON CONFLICT(user_id, hanja_id) DO NOTHING`
		)
		.bind(userId, hanja.id, now, now)
		.run();

	return {
		ok: true,
		result: hanja,
		story: recipe.story,
		alreadyKnown: (inserted.meta?.changes ?? 0) === 0
	};
}

/** 아이가 가진 부품으로 아직 만들 수 있는 것이 남았는지 (힌트 버튼을 켤지 판단). */
export function remainingFor(parts: string[], discovered: string[]): number {
	const owned = new Set(parts);
	const done = new Set(discovered);
	return FUSION_RECIPES.filter((r) => !done.has(r.result) && r.parts.every((p) => owned.has(p)))
		.length;
}
