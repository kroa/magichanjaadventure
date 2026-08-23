import { WORD_ROWS } from './word-list';

/**
 * 낱말 놀이 — **배운 글자가 실제로 쓰이는 자리를 보여 준다.**
 *
 * 합체(조합표)는 아이가 배운 글자의 5%만 건드린다. 나머지 95%는 아무리 파내도
 * 놀이에 한 번도 안 나온다 — 사용자가 場 과 室 로 두 번 신고한 문제가 그것이다.
 * 室 은 조합으로는 영원히 구제할 수 없다. 至·宀 이 우리 1000자에 없기 때문이다.
 *
 * 그런데 **敎室** 은 된다. 敎 는 室 바로 앞에 배우는 글자다.
 * 낱말 축은 1000자 중 955자를 덮는다 — 조합의 50자와 비교가 안 된다.
 *
 * 합체와 다른 점이 하나 있다: **자리가 있다.**
 * 敎室 은 敎 가 앞, 室 이 뒤다. 그래서 판정은 "붙는가" 가 아니라 "제자리에 놓았는가" 다.
 * 순서가 틀렸다고 혼내지는 않는다 — 아직 안 채운 칸일 뿐이다.
 */

export interface Word {
	/** 두 글자 낱말 */
	word: string;
	/** 앞 글자 */
	head: string;
	/** 뒤 글자 */
	tail: string;
	reading: string;
	meaning: string;
}

export const WORDS: readonly Word[] = WORD_ROWS.map((row) => {
	const [word, reading, meaning] = row.split('|');
	return { word, head: word[0], tail: word[1], reading, meaning };
});

const BY_WORD = new Map(WORDS.map((w) => [w.word, w]));

export function wordOf(word: string): Word | undefined {
	return BY_WORD.get(word);
}

/** 두 글자를 이 순서로 놓으면 낱말이 되는가 */
export function joinWord(head: string, tail: string): Word | undefined {
	return BY_WORD.get(head + tail);
}

/** 한 판에 낼 낱말 수 */
export const WORD_ROUND_SIZE = 3;

/**
 * 이 판에 낼 낱말을 고른다.
 *
 * **두 글자를 모두 배운 낱말만 낸다.** 그래야 뜻 모르는 글자가 판에 안 올라오고,
 * 아이가 "내가 아는 글자 둘이 이런 말이 되는구나" 를 겪는다.
 *
 * `load` 와 제출 검증이 **둘 다** 이 함수를 부른다 — 서버가 같은 방식으로 다시
 * 유도할 수 있어야 "이 판의 목표가 무엇이었나" 를 나중에도 안다 (복습·대결과 같은 구조).
 */
export function orderWordRound(
	owned: ReadonlySet<string>,
	discovered: ReadonlySet<string>,
	focus: string,
	round = 0,
	size = WORD_ROUND_SIZE
): Word[] {
	const makeable = WORDS.filter((w) => owned.has(w.head) && owned.has(w.tail));

	// 방금 배운 글자가 든 낱말을 앞에 둔다 — 이 화면이 존재하는 이유가 그것이다
	const related = focus ? makeable.filter((w) => w.word.includes(focus)) : [];
	const rest = makeable.filter((w) => !related.includes(w));

	// 이미 만들어 본 것을 먼저 (복습이 목적이다)
	const sorted = [
		...rest.filter((w) => discovered.has(w.word)),
		...rest.filter((w) => !discovered.has(w.word))
	];

	// 회전 — 없으면 아이가 몇 번을 열어도 같은 판을 받는다 (복습에서 겪은 그 문제다)
	const turn = sorted.length > 0 ? ((round % sorted.length) + sorted.length) % sorted.length : 0;
	const rotated = [...sorted.slice(turn), ...sorted.slice(0, turn)];

	return [...related, ...rotated].slice(0, size);
}

/** 이 글자로 만들 수 있는, 아이가 이미 배운 낱말 */
export function wordsWith(owned: ReadonlySet<string>, character: string): Word[] {
	return WORDS.filter((w) => w.word.includes(character) && owned.has(w.head) && owned.has(w.tail));
}

/**
 * 이 글자와 짝이 되어 낱말을 만들 수 있는 글자들.
 *
 * 배우기 화면이 "다음에 어디로 보낼까" 를 정할 때 쓴다. 아이가 배운 글자 전체를
 * 다 읽어 올 필요 없이, **후보만** 조회하면 되도록 범위를 좁혀 준다.
 */
export function partnersOf(character: string): string[] {
	const out = new Set<string>();
	for (const w of WORDS) {
		if (w.head === character) out.add(w.tail);
		else if (w.tail === character) out.add(w.head);
	}
	return [...out];
}
