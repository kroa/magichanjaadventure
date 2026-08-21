import { describe, expect, it } from 'vitest';
import { findJoinablePair, SEAL_RECIPES } from './fusion';
import { sealsFrom } from './seals';

/**
 * 도움 버튼이 짚어 주는 "붙는 짝".
 *
 * 대결의 조각은 봉인들의 재료를 그대로 펼친 것이므로,
 * **판이 비기 전에는 붙는 짝이 반드시 하나는 있어야 한다.**
 * 없으면 아이는 도움을 눌러도 아무것도 못 보고 그대로 막힌다.
 */
describe('findJoinablePair', () => {
	it('한 조합의 재료가 판에 있으면 그 짝을 찾는다', () => {
		const pair = findJoinablePair([{ character: '日' }, { character: '山' }, { character: '月' }]);
		expect(pair).not.toBeNull();
		expect(new Set(pair!.map((p) => p.character))).toEqual(new Set(['日', '月']));
	});

	it('붙는 것이 없으면 null', () => {
		expect(findJoinablePair([{ character: '山' }, { character: '川' }])).toBeNull();
		expect(findJoinablePair([])).toBeNull();
	});

	it('대결에 깔리는 조각에는 언제나 붙는 짝이 있다', () => {
		for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
			const seals = sealsFrom(seed, SEAL_RECIPES);
			const pieces = seals.flatMap((r) => r.parts).map((character) => ({ character }));
			expect(findJoinablePair(pieces), `${seed}: 붙는 짝이 없다`).not.toBeNull();
		}
	});
});
