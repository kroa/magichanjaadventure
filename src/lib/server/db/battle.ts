import { SEAL_RECIPES, fuse, type FusionRecipe } from '$lib/game/fusion';
import { sealsFrom, SEALS_PER_BATTLE } from '$lib/game/seals';
import { HANJA_SEED } from '../../../../database/seed/hanja';
import { bumpMastery, toHanja, type Hanja, type HanjaRow } from './hanja';

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

export interface BoardPiece {
	id: number;
	character: string;
	mastery: number;
}

export interface BattlePlan {
	seals: BattleSeal[];
	/**
	 * 판에 흩어 놓을 조각.
	 *
	 * **이번 봉인들이 요구하는 조각이 정확히 그만큼만 있다.** 미끼도, 남는 것도 없다.
	 * 그래서 목표를 인쇄해 보여 줄 필요가 없다 — 붙는 것끼리 붙이면 판이 비고, 그게 승리다.
	 * 예전처럼 "정답 + 미끼 12칸" 을 늘어놓으면 그림으로 바꿔도 결국 객관식이다.
	 */
	pieces: BoardPiece[];
}

/**
 * 이번 판에 낼 봉인 수.
 *
 * 처음에는 하나, 익숙해지면 셋. 아이가 몇 개를 만들어 봤는지로 정한다.
 */
export function sealLimitFor(discovered: number): number {
	if (discovered <= 0) return 1;
	if (discovered < 3) return 2;
	return SEALS_PER_BATTLE;
}

/** 이 아이가 각 한자를 얼마나 익혔는지 (없으면 0 = 처음 보는 것) */
async function masteryOf(
	db: D1Database,
	userId: string,
	chars: string[]
): Promise<Map<string, number>> {
	if (chars.length === 0) return new Map();
	const holes = chars.map(() => '?').join(',');
	const { results } = await db
		.prepare(
			`SELECT h.character AS character, p.mastery AS mastery
			 FROM user_hanja_progress p JOIN hanjas h ON h.id = p.hanja_id
			 WHERE p.user_id = ? AND h.character IN (${holes})`
		)
		.bind(userId, ...chars)
		.all<{ character: string; mastery: number }>();
	return new Map(results.map((r) => [r.character, r.mastery ?? 0]));
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

/**
 * 서버가 이번 판의 봉인을 유도한다 (화면도 이 결과를 그대로 받는다).
 *
 * **쉬운 것을 앞에 둔다.** 처음 오는 아이는 봉인 하나만 받으므로(sealLimitFor),
 * 앞에서부터 자르면 자연히 가장 그림 같은 조합을 만난다.
 * 나무+나무=수풀은 여섯 살도 알아보지만, 문+해=사이(間)는 그림을 다 알아도 뜻이 안 따라온다.
 *
 * 순서를 이렇게 고정하는 또 하나의 이유: 공격 요청을 받은 서버가 **같은 방식으로 다시 유도**
 * 해야 답이 어긋나지 않는다. 아이의 진도에 따라 풀이 달라지면 판 도중에 정답이 바뀐다.
 */
export function derive(userId: string, sessionKey: string, areaId: number): FusionRecipe[] {
	const pool = poolForArea(areaId);
	const seed = seedOf(userId, sessionKey);
	/*
	 * **쉬운 레인만 한 지역 앞을 본다.**
	 *
	 * 새싹 마을의 beginner 후보는 明·林 둘뿐이라 첫 대결이 늘 「明 林 + 추상어 하나」였다.
	 * 그 하나는 항상 星·本·天·間 중 하나인데, 間 은 바로 위 주석이 지목한 그 조합이고
	 * 本(밑동)·天 도 여덟 살에게는 그림에서 뜻으로 가는 길이 없다.
	 *
	 * `tierOf` 게이트를 한 칸 여는 것이 여기서 안전한 이유:
	 * 판에 깔리는 조각은 `planFor` 가 아이의 보유 여부와 **무관하게** 조합의 부품을 그대로 펼치고,
	 * 모든 부품에는 그림이 있다(`pictographs.spec.ts` 가 강제한다).
	 * 즉 "부품을 본 적도 없는 문제" 걱정은 추상어가 섞이는 rest 레인에서 유효하지,
	 * 그림 두 장으로 결과가 짐작되는 beginner 레인에는 해당하지 않는다.
	 * 실제 효과: 새싹 마을 봉인 세 개가 전부 beginner 가 되고 好(女+子)가 들어온다.
	 */
	const easy = sealsFrom(
		`${seed}:easy`,
		SEAL_RECIPES.filter((r) => r.beginner && tierOf(r) <= areaId + 1),
		SEALS_PER_BATTLE
	);
	const rest = sealsFrom(
		`${seed}:rest`,
		pool.filter((r) => !r.beginner),
		SEALS_PER_BATTLE
	);
	return [...easy, ...rest].slice(0, SEALS_PER_BATTLE);
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
	areaId: number,
	sealLimit = SEALS_PER_BATTLE
): Promise<BattlePlan> {
	/*
	 * **처음 오는 아이에게는 봉인 하나만 낸다.**
	 * 조각 여섯 개를 처음부터 깔아 놓으면 짝이 15가지라, 무엇을 하는 화면인지도 모르는 채
	 * 헤매게 된다. DragonBox 1단계가 손가락 하나면 끝나는 것과 같은 이유다.
	 *
	 * 봉인 자체는 언제나 3개를 유도하고 앞에서부터 잘라 쓴다.
	 * 그래야 공격 요청을 받은 서버가 같은 방식으로 다시 유도해도 답이 어긋나지 않는다.
	 */
	const recipes = derive(userId, sessionKey, areaId).slice(0, Math.max(1, sealLimit));
	const broken = await brokenIndexes(db, userId, sessionKey);
	/*
	 * 조각은 봉인들의 재료를 **그대로 펼친 것**이다 (木+木=林 처럼 같은 글자가 둘이면 조각도 둘).
	 * 서랍+미끼 구조를 버린 이유는 위 BattlePlan 주석에 적어 두었다.
	 */
	const trayChars = recipes.flatMap((r) => r.parts);

	const info = await lookup(db, [...new Set([...recipes.map((r) => r.result), ...trayChars])]);
	const mastery = await masteryOf(db, userId, trayChars);

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
		pieces: trayChars.map((character, id) => ({
			id,
			character,
			mastery: mastery.get(character) ?? 0
		}))
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
	parts: string[],
	firstTry: boolean
): Promise<AttackOutcome> {
	const recipe = fuse(parts);
	if (!recipe) return { ok: false, reason: 'no-recipe' };

	/*
	 * **어느 봉인인지는 서버가 찾는다.** 화면은 조각 두 개만 보낸다.
	 * 목표를 화면에 내려주지 않으니 클라이언트가 봉인 번호를 알 이유도 없다.
	 */
	const recipes = derive(userId, sessionKey, areaId);
	const sealIndex = recipes.findIndex((r) => r.result === recipe.result);

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

	/*
	 * 쓴 부품의 숙련도를 올린다 — 대결에서도 그림이 글자로 자란다.
	 *
	 * `bumpMastery` 는 UPSERT 가 **아니다.** 대결 판에는 아이가 아직 안 배운 부품도 깔리는데,
	 * 여기서 행을 새로 만들면 배운 적 없는 글자가 진도에 들어가 지역 해금이 부풀려진다.
	 * 배운 부품만 자라고 나머지는 조용히 지나가는 것이 맞다.
	 */
	const usedParts = [...new Set(recipe.parts)];
	const { results: partRows } = await db
		.prepare(`SELECT id FROM hanjas WHERE character IN (${usedParts.map(() => '?').join(',')})`)
		.bind(...usedParts)
		.all<{ id: number }>();
	await bumpMastery(
		db,
		userId,
		partRows.map((r) => r.id),
		10,
		now
	);

	// 조합표에는 있지만 이번 봉인이 아니다 — 한자는 얻었으니 헛수고는 아니다
	if (sealIndex < 0) return { ok: false, reason: 'not-target' };

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
