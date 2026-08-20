import { SEAL_RECIPES, fuse, type FusionRecipe } from '$lib/game/fusion';
import { sealsFrom, trayFrom, SEALS_PER_BATTLE } from '$lib/game/seals';
import { HANJA_SEED } from '../../../../database/seed/hanja';
import { toHanja, type Hanja, type HanjaRow } from './hanja';

/**
 * 합체 대결 — 서버 쪽.
 *
 * **봉인과 서랍은 저장하지 않고 매번 다시 계산한다.**
 * 씨앗(userId:sessionKey)만 있으면 같은 답이 나오므로, 공격 요청이 올 때마다
 * 서버가 "이번 판 2번 봉인은 明이었나?" 를 스스로 확인할 수 있다.
 * 세션 상태 테이블이 없으니 D1 의 읽고-고쳐-쓰기 경합도 원천적으로 없다.
 */

/** 한자 → 지역. 난이도 판정에 쓴다 (씨드는 빌드 시점 상수라 조회가 필요 없다). */
const AREA_OF = new Map(HANJA_SEED.map((h) => [h.character, h.areaId]));

/**
 * 이 조합의 난이도 = **부품 중 가장 늦게 배우는 것의 지역.**
 *
 * 결과 글자의 지역으로 매기면 안 된다. 日+寺=時 은 결과가 7급II(2지역)이지만
 * 부품 寺 가 4급(9지역)이라, 2지역 아이에게 내면 부품을 본 적도 없는 문제가 된다.
 * 실제로 時·校·聞 세 개가 그런 역전 관계다.
 */
export function tierOf(recipe: FusionRecipe): number {
	return Math.max(...recipe.parts.map((p) => AREA_OF.get(p) ?? 99));
}

/** 씨앗: 같은 아이의 같은 대결이면 언제나 같은 봉인이 나온다 */
function seedOf(userId: string, sessionKey: string): string {
	return `${userId}:${sessionKey}`;
}

/**
 * 이 지역에서 낼 수 있는 봉인 후보.
 *
 * 후보가 너무 적으면 지역을 한 칸씩 넓힌다 — 봉인 3개를 못 채우는 것보다 낫다.
 */
export function poolForArea(areaId: number): FusionRecipe[] {
	for (let limit = areaId; limit <= 9; limit++) {
		const pool = SEAL_RECIPES.filter((r) => tierOf(r) <= limit);
		if (pool.length >= SEALS_PER_BATTLE) return pool;
	}
	return SEAL_RECIPES;
}

export interface BattleSeal {
	index: number;
	character: string;
	reading: string;
	meaning: string;
	story: string;
	/** 이미 깬 봉인인가 */
	broken: boolean;
}

export interface BattlePlan {
	seals: BattleSeal[];
	/** 부품 서랍. 봉인이 요구하는 부품이 **반드시** 전부 들어 있다 */
	tray: { character: string; reading: string; meaning: string }[];
}

/** 한자 여러 자를 한 번에 조회한다 */
async function lookup(db: D1Database, chars: string[]): Promise<Map<string, Hanja>> {
	if (chars.length === 0) return new Map();
	const holes = chars.map(() => '?').join(',');
	const { results } = await db
		.prepare(`SELECT * FROM hanjas WHERE character IN (${holes})`)
		.bind(...chars)
		.all<HanjaRow>();
	return new Map(results.map((row) => [row.character, toHanja(row)]));
}

/** 서버가 이번 판의 봉인을 유도한다 (화면도 이 결과를 그대로 받는다) */
export function derive(userId: string, sessionKey: string, areaId: number): FusionRecipe[] {
	return sealsFrom(seedOf(userId, sessionKey), poolForArea(areaId));
}

/** 이번 판에서 이미 깬 봉인 번호 */
export async function brokenIndexes(
	db: D1Database,
	userId: string,
	sessionKey: string
): Promise<Set<number>> {
	const { results } = await db
		.prepare('SELECT seal_index FROM battle_seals WHERE user_id = ? AND session_key = ?')
		.bind(userId, sessionKey.slice(0, 64))
		.all<{ seal_index: number }>();
	return new Set(results.map((r) => r.seal_index));
}

/** 화면에 내려줄 봉인·서랍을 만든다 */
export async function planFor(
	db: D1Database,
	userId: string,
	sessionKey: string,
	areaId: number
): Promise<BattlePlan> {
	const recipes = derive(userId, sessionKey, areaId);
	const broken = await brokenIndexes(db, userId, sessionKey);
	const trayChars = trayFrom(seedOf(userId, sessionKey), recipes);

	const info = await lookup(db, [...new Set([...recipes.map((r) => r.result), ...trayChars])]);

	return {
		seals: recipes.map((recipe, index) => {
			const hanja = info.get(recipe.result);
			return {
				index,
				character: recipe.result,
				reading: hanja?.reading ?? '',
				meaning: hanja?.meaning ?? '',
				story: recipe.story,
				broken: broken.has(index)
			};
		}),
		tray: trayChars.map((character) => {
			const hanja = info.get(character);
			return {
				character,
				reading: hanja?.reading ?? '',
				meaning: hanja?.meaning ?? ''
			};
		})
	};
}

export type AttackOutcome =
	| { ok: false; reason: 'no-recipe' | 'not-target' | 'already-broken' | 'unknown-seal' }
	| {
			ok: true;
			character: string;
			reading: string;
			meaning: string;
			story: string;
			/** 이 한자를 처음 얻었는가 */
			isNew: boolean;
	  };

/**
 * 봉인을 두드린다.
 *
 * 성공하든 아니든 **아이에게서 빼앗는 것은 없다.** 실패는 그냥 아무 일도 안 일어나는 것이다.
 * 목표가 아닌 조합이라도 유효하면 한자는 진짜로 얻는다 — 탐색이 헛수고가 되면 안 된다.
 */
export async function attack(
	db: D1Database,
	userId: string,
	sessionKey: string,
	areaId: number,
	sealIndex: number,
	parts: string[],
	firstTry: boolean
): Promise<AttackOutcome> {
	const recipe = fuse(parts);
	if (!recipe) return { ok: false, reason: 'no-recipe' };

	const recipes = derive(userId, sessionKey, areaId);
	const target = recipes[sealIndex];
	if (!target) return { ok: false, reason: 'unknown-seal' };

	const row = await db
		.prepare('SELECT * FROM hanjas WHERE character = ?')
		.bind(recipe.result)
		.first<HanjaRow>();
	if (!row) return { ok: false, reason: 'no-recipe' };
	const hanja = toHanja(row);

	// 만든 한자는 목표가 아니어도 진짜로 얻는다
	const now = Date.now();
	const inserted = await db
		.prepare(
			`INSERT INTO user_hanja_progress (user_id, hanja_id, status, mastery, learned_at, last_reviewed_at)
			 VALUES (?, ?, 'learning', 0, ?, ?)
			 ON CONFLICT(user_id, hanja_id) DO NOTHING`
		)
		.bind(userId, hanja.id, now, now)
		.run();
	const isNew = (inserted.meta?.changes ?? 0) > 0;

	if (recipe.result !== target.result) {
		return { ok: false, reason: 'not-target' };
	}

	// 봉인 파괴 기록. PRIMARY KEY 가 중복 정산을 막는다
	const broke = await db
		.prepare(
			`INSERT INTO battle_seals (user_id, session_key, seal_index, result_char, first_try, broken_at)
			 VALUES (?, ?, ?, ?, ?, ?)
			 ON CONFLICT(user_id, session_key, seal_index) DO NOTHING`
		)
		.bind(userId, sessionKey.slice(0, 64), sealIndex, recipe.result, firstTry ? 1 : 0, now)
		.run();

	if ((broke.meta?.changes ?? 0) === 0) return { ok: false, reason: 'already-broken' };

	return {
		ok: true,
		character: hanja.character,
		reading: hanja.reading,
		meaning: hanja.meaning,
		story: recipe.story,
		isNew
	};
}

/** 이번 판의 성적 — finish 가 보상을 계산할 근거다 */
export async function tallyFor(
	db: D1Database,
	userId: string,
	sessionKey: string
): Promise<{ broken: number; firstTry: number }> {
	const row = await db
		.prepare(
			`SELECT COUNT(*) AS broken, SUM(first_try) AS first_try
			 FROM battle_seals WHERE user_id = ? AND session_key = ?`
		)
		.bind(userId, sessionKey.slice(0, 64))
		.first<{ broken: number | null; first_try: number | null }>();
	return { broken: row?.broken ?? 0, firstTry: row?.first_try ?? 0 };
}
