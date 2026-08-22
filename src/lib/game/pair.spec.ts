import { describe, expect, it } from 'vitest';
import { findJoinablePair, findWorkshopHint, SEAL_RECIPES } from './fusion';
import { sealsFrom } from './seals';
import { remainingFor } from '$lib/server/db/fusion';

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

/**
 * 공방의 도움 버튼.
 *
 * 서랍은 **줄지 않는 재고**라 판과 규칙이 다르다.
 * 판의 함수를 그대로 쓰면 木+木 을 영영 못 짚고, 이미 만든 조합만 계속 빛낸다.
 */
describe('findWorkshopHint', () => {
	it('같은 부품 두 개짜리 조합을 짚는다 (서랍에 木 타일이 하나뿐이어도)', () => {
		expect(findWorkshopHint([{ character: '木' }], [])).toEqual(['木', '木']);
	});

	it('이미 발견한 조합은 짚지 않는다', () => {
		expect(findWorkshopHint([{ character: '日' }, { character: '月' }], ['明'])).toBeNull();
	});

	it('발견한 것을 건너뛰고 다음 조합을 짚는다', () => {
		const hint = findWorkshopHint(
			[{ character: '日' }, { character: '月' }, { character: '生' }],
			['明']
		);
		expect(hint).not.toBeNull();
		expect(new Set(hint!)).toEqual(new Set(['日', '生']));
	});

	it('칸에 놓아 둔 부품이 있으면 그 부품이 든 조합을 먼저 짚는다', () => {
		const parts = [{ character: '日' }, { character: '月' }, { character: '木' }];
		const hint = findWorkshopHint(parts, [], '木');
		expect(hint, '木 을 놓아 뒀는데 딴 조합을 짚었다').toContain('木');
	});

	it('부품이 모자라면 null', () => {
		expect(findWorkshopHint([{ character: '日' }], [])).toBeNull();
		expect(findWorkshopHint([], [])).toBeNull();
	});

	it('remainingFor 와 규칙이 어긋나지 않는다', () => {
		/*
		 * 이 둘이 갈라지면 `?` 버튼은 보이는데 아무것도 안 빛나는 **죽은 버튼**이 된다.
		 * (버튼을 remaining 으로 켜고 힌트를 이 함수로 찾기 때문이다.)
		 */
		const cases: [string[], string[]][] = [
			[['木'], []],
			[['日', '月'], ['明']],
			[['日', '月', '生'], ['明']],
			[['日'], []],
			[['人', '木'], []],
			[
				['日', '月', '木', '生', '一', '大'],
				['明', '林']
			]
		];
		for (const [owned, discovered] of cases) {
			const parts = owned.map((character) => ({ character }));
			const remaining = remainingFor(owned, discovered);
			const hint = findWorkshopHint(parts, discovered);
			expect(
				hint === null,
				`owned=${owned.join('')} discovered=${discovered.join('')} → remaining ${remaining} 인데 힌트는 ${hint}`
			).toBe(remaining === 0);
		}
	});
});
