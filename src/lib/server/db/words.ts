import { orderWordRound, joinWord, type Word } from '$lib/game/words';

/**
 * 낱말 놀이 — 서버 쪽.
 *
 * **판정은 반드시 여기서 한다.** 화면은 즉시 반응을 그리려고 같은 함수를 한 번 더 돌릴 뿐이다.
 * 낱말은 `hanjas` 에 행이 없어서 진도 표에 못 넣는다 — 그래서 `user_words` 에 따로 센다.
 */

export interface WordState {
	/** 두 글자를 모두 배운 낱말 중 이 판에 낼 것 */
	goals: Word[];
	/** 이미 만들어 본 낱말 */
	discovered: string[];
	/** 지금 만들 수 있는 낱말이 전부 몇 개인가 (진행 표시용) */
	makeable: number;
}

async function ownedChars(db: D1Database, userId: string): Promise<Set<string>> {
	const { results } = await db
		.prepare(
			`SELECT h.character AS character
			 FROM user_hanja_progress p JOIN hanjas h ON h.id = p.hanja_id
			 WHERE p.user_id = ?`
		)
		.bind(userId)
		.all<{ character: string }>();
	return new Set(results.map((r) => r.character));
}

async function madeWords(db: D1Database, userId: string): Promise<Set<string>> {
	const { results } = await db
		.prepare('SELECT word FROM user_words WHERE user_id = ?')
		.bind(userId)
		.all<{ word: string }>();
	return new Set(results.map((r) => r.word));
}

export async function loadWordRound(
	db: D1Database,
	userId: string,
	focus: string,
	round: number
): Promise<WordState & { owned: Set<string> }> {
	const [owned, discovered] = await Promise.all([ownedChars(db, userId), madeWords(db, userId)]);
	const goals = orderWordRound(owned, discovered, focus, round);

	// 진행 표시용 — 지금 만들 수 있는 낱말 전체 수
	const { WORDS } = await import('$lib/game/words');
	const makeable = WORDS.filter((w) => owned.has(w.head) && owned.has(w.tail)).length;

	return { goals, discovered: [...discovered], makeable, owned };
}

export type WordOutcome =
	| { ok: false; reason: 'no-word' | 'not-owned' | 'not-target'; word?: string }
	| { ok: true; word: Word; alreadyKnown: boolean };

/**
 * 낱말 하나를 만들어 본다.
 *
 * **이 판의 목표인지까지 확인한다.** 복습이 그걸 안 해서 아이가 갇히는 판이 있었다 —
 * 목표가 아닌 것으로 조각을 써 버리면 남은 것끼리 안 맞는다.
 * 목표가 아니어도 낱말 자체는 기록해 준다. 탐색이 헛수고가 되면 안 된다.
 */
export async function tryWord(
	db: D1Database,
	userId: string,
	head: string,
	tail: string,
	focus: string,
	round: number
): Promise<WordOutcome> {
	const word = joinWord(head, tail);
	if (!word) return { ok: false, reason: 'no-word' };

	const [owned, discovered] = await Promise.all([ownedChars(db, userId), madeWords(db, userId)]);
	// 안 배운 글자로는 만들 수 없다 — 요청을 직접 만들어도 마찬가지다
	if (!owned.has(word.head) || !owned.has(word.tail)) return { ok: false, reason: 'not-owned' };

	// 목표는 **기록하기 전에** 유도한다. 기록하면 discovered 가 바뀌어 순서가 달라진다
	const goals = orderWordRound(owned, discovered, focus, round);
	const isTarget = goals.some((g) => g.word === word.word);

	const now = Date.now();
	const inserted = await db
		.prepare(
			`INSERT INTO user_words (user_id, word, made_count, first_at, last_at)
			 VALUES (?, ?, 1, ?, ?)
			 ON CONFLICT(user_id, word)
			 DO UPDATE SET made_count = made_count + 1, last_at = excluded.last_at`
		)
		.bind(userId, word.word, now, now)
		.run();

	// 처음 만든 것인가 — UPSERT 라 changes 로는 못 가른다. 미리 읽어 둔 집합으로 판단한다
	const alreadyKnown = discovered.has(word.word);
	void inserted;

	if (!isTarget) return { ok: false, reason: 'not-target', word: word.word };
	return { ok: true, word, alreadyKnown };
}
