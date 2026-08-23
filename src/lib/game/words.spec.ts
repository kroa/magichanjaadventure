import { describe, expect, it } from 'vitest';
import { HANJA_SEED } from '../../../database/seed/hanja';
import { joinWord, orderWordRound, WORDS, wordsWith } from './words';

/**
 * 낱말 풀 검증.
 *
 * `word-list.ts` 는 씨드에서 뽑아 **생성한** 파일이다. 생성물은 원본과 조용히 어긋난다 —
 * 그래서 여기서 매번 다시 계산해 대조한다.
 */

const ALL = new Set(HANJA_SEED.map((h) => h.character));

/** word-list.ts 를 만든 것과 같은 규칙 */
const SHALLOW = new Set(['男子', '洞里', '文字', '土地', '女子', '男女']);
function derive(): Map<string, string> {
	const seen = new Map<string, string>();
	for (const h of HANJA_SEED) {
		for (const w of h.exampleWords) {
			if (w.word.length !== 2) continue;
			if (!/^[一-鿿]{2}$/.test(w.word)) continue;
			if (![...w.word].every((c) => ALL.has(c))) continue;
			if (SHALLOW.has(w.word)) continue;
			if (!seen.has(w.word)) seen.set(w.word, `${w.reading}|${w.meaning}`);
		}
	}
	return seen;
}

describe('낱말 풀', () => {
	it('씨드와 어긋나지 않는다', () => {
		const fresh = derive();
		expect(WORDS.length, '생성된 목록의 개수가 다르다 — 다시 생성해야 한다').toBe(fresh.size);
		for (const w of WORDS) {
			const row = fresh.get(w.word);
			expect(row, `${w.word} 이 씨드에 없다`).toBeDefined();
			expect(`${w.reading}|${w.meaning}`, `${w.word} 의 읽기·뜻이 다르다`).toBe(row);
		}
	});

	it('두 글자가 모두 우리 1000자 안에 있다', () => {
		for (const w of WORDS) {
			expect(ALL.has(w.head), `${w.word} 의 ${w.head}`).toBe(true);
			expect(ALL.has(w.tail), `${w.word} 의 ${w.tail}`).toBe(true);
		}
	});

	it('조합보다 훨씬 많은 글자를 덮는다 — 이 화면이 존재하는 이유다', () => {
		const covered = new Set(WORDS.flatMap((w) => [w.head, w.tail]));
		// 조합표는 1000자 중 58자를 건드린다
		expect(covered.size).toBeGreaterThan(900);
	});

	it('사용자가 신고한 두 글자가 실제로 살아난다', () => {
		// 室·場 은 조합으로는 영원히 못 만든다 (至·宀·昜 이 1000자에 없다)
		expect(WORDS.some((w) => w.word.includes('室'))).toBe(true);
		expect(WORDS.some((w) => w.word.includes('場'))).toBe(true);
		expect(joinWord('敎', '室')?.reading).toBeTruthy();
	});

	it('자리를 따진다 — 뒤집으면 다른 낱말이거나 없는 낱말이다', () => {
		expect(joinWord('敎', '室')).toBeDefined();
		expect(joinWord('室', '敎')).toBeUndefined();
	});

	it('같은 낱말이 두 번 들어 있지 않다', () => {
		const keys = WORDS.map((w) => w.word);
		expect(new Set(keys).size).toBe(keys.length);
	});
});

describe('orderWordRound', () => {
	const owned = new Set(WORDS.flatMap((w) => [w.head, w.tail]));

	it('두 글자를 다 배운 낱말만 낸다', () => {
		const few = new Set(['敎', '室']);
		for (const w of orderWordRound(few, new Set(), '', 0)) {
			expect(few.has(w.head) && few.has(w.tail), `${w.word} 은 아직 못 배운 글자를 쓴다`).toBe(
				true
			);
		}
	});

	it('방금 배운 글자가 든 낱말을 앞에 낸다', () => {
		for (let r = 0; r < 5; r++) {
			const board = orderWordRound(owned, new Set(), '室', r);
			expect(board[0].word, `회차 ${r}`).toContain('室');
		}
	});

	it('회차가 바뀌면 다른 판이 나온다', () => {
		const boards = new Set<string>();
		for (let r = 0; r < 6; r++) {
			boards.add(
				orderWordRound(owned, new Set(), '', r)
					.map((w) => w.word)
					.join('')
			);
		}
		expect(boards.size).toBeGreaterThan(1);
	});

	it('같은 회차면 항상 같은 판이다', () => {
		for (let r = 0; r < 4; r++) {
			expect(orderWordRound(owned, new Set(), '室', r)).toEqual(
				orderWordRound(owned, new Set(), '室', r)
			);
		}
	});

	it('배운 글자가 모자라면 빈 판이 된다 — 화면이 이 경우를 다뤄야 한다', () => {
		expect(orderWordRound(new Set(['日']), new Set(), '', 0)).toEqual([]);
	});

	it('판은 언제나 비울 수 있다 — 낱말끼리 조각을 뺏지 않는다', () => {
		/*
		 * 낱말은 자리가 정해져 있어 조합보다 단순하다. 그래도 확인한다:
		 * 목표 낱말들의 글자를 펼친 것이 판이므로, 목표를 아무 순서로 치워도 정확히 0 이 된다.
		 */
		for (let r = 0; r < 30; r++) {
			const goals = orderWordRound(owned, new Set(), '', r);
			if (goals.length === 0) continue;
			const pieces = goals.flatMap((w) => [w.head, w.tail]);
			for (const g of [...goals].reverse()) {
				for (const c of [g.head, g.tail]) {
					const at = pieces.indexOf(c);
					expect(at, `${g.word} 의 ${c} 이 판에 없다`).toBeGreaterThanOrEqual(0);
					pieces.splice(at, 1);
				}
			}
			expect(pieces, `회차 ${r} 에서 조각이 남았다`).toEqual([]);
		}
	});
});

describe('wordsWith', () => {
	it('배운 글자로 만들 수 있는 낱말을 찾는다', () => {
		const owned = new Set(['敎', '室', '內']);
		const found = wordsWith(owned, '室').map((w) => w.word);
		expect(found).toContain('敎室');
	});

	it('아직 못 배운 짝이 든 낱말은 안 센다', () => {
		expect(wordsWith(new Set(['室']), '室')).toEqual([]);
	});
});
