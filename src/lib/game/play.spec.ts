import { describe, expect, it } from 'vitest';
import { classifyFocus, orderQuizRecipes, pickNextPlay } from './play';
import { SEAL_RECIPES } from './fusion';

/**
 * 배우기 다음 행선지 검증.
 *
 * 지키려는 것 하나: **화면이 지키지 못할 약속을 하지 않는다.**
 * "방금 배운 걸로 복습" 이라고 써 놓고 상관없는 판을 내주던 것이 이 코드가 생긴 이유다.
 */

describe('pickNextPlay', () => {
	it('같은 글자 두 개짜리 조합도 잡는다 (木+木=林)', () => {
		const play = pickNextPlay(new Set(['木']), '木');
		expect(play.kind).toBe('ready');
		if (play.kind !== 'ready') return;
		expect(play.doubled).toBe(true);
		expect(play.partner).toBe('木');
		expect(play.result).toBe('林');
	});

	it('짝을 이미 갖고 있으면 그 짝을 짚어 준다 (日+月=明)', () => {
		const play = pickNextPlay(new Set(['日', '月']), '月');
		expect(play.kind).toBe('ready');
		if (play.kind !== 'ready') return;
		expect(play.partner).toBe('日');
		expect(play.result).toBe('明');
		expect(play.href).toBe('/quiz?focus=%E6%9C%88');
	});

	it('변형 부수 조합은 ready 로 치지 않는다 (人+木=休 는 판에 안 깔린다)', () => {
		/*
		 * 休 는 人 이 亻 로 변하는 조합이라 SEAL_RECIPES 에서 빠져 있다.
		 * 이걸 ready 로 치면 "日 와 붙여 보세요" 같은 말을 해 놓고
		 * 정작 복습판에는 그 조각이 없는, 더 나쁜 거짓말이 된다.
		 */
		const play = pickNextPlay(new Set(['人', '木']), '人');
		expect(play.kind).not.toBe('ready');
	});

	it('조리법에 없는 글자를 배우면 공방으로 보낸다', () => {
		expect(pickNextPlay(new Set(['場']), '場').kind).toBe('workshop');
	});

	it('관련은 없지만 복습할 거리가 있으면 focus 없이 복습으로 보낸다', () => {
		const play = pickNextPlay(new Set(['日', '月', '場']), '場');
		expect(play.kind).toBe('review');
		// focus 를 안 붙이는 것이 핵심이다 — 붙이면 복습 화면이 또 거짓 안내를 한다
		expect(play.href).toBe('/quiz');
	});

	it('어떤 입력에도 갈 곳을 준다', () => {
		for (const [owned, learned] of [
			[[], ''],
			[['一'], '一'],
			[['場'], '場'],
			[['日'], '日']
		] as [string[], string][]) {
			const play = pickNextPlay(new Set(owned), learned);
			expect(play, `${learned} 에서 갈 곳이 없다`).toBeTruthy();
			expect(play.href).toBeTruthy();
		}
	});

	it('ready 로 판정했으면 그 조합은 정말 SEAL_RECIPES 안에 있다', () => {
		const play = pickNextPlay(new Set(['日', '生']), '生');
		expect(play.kind).toBe('ready');
		if (play.kind !== 'ready') return;
		expect(SEAL_RECIPES.some((r) => r.result === play.result)).toBe(true);
	});
});

describe('classifyFocus', () => {
	it('focus 가 없으면 none — 지도·네비로 들어온 정상 경로다', () => {
		expect(classifyFocus('', 0)).toBe('none');
	});

	it('관련 조합이 있으면 ready', () => {
		expect(classifyFocus('日', 2)).toBe('ready');
	});

	it('판에는 없어도 공방에서 되는 글자는 workshop-only', () => {
		// 人 은 亻 로 변하는 조합(休·信·位)에만 쓰여 SEAL_RECIPES 에서 빠져 있다
		expect(classifyFocus('人', 0)).toBe('workshop-only');
	});

	it('어느 조리법에도 없는 글자는 not-a-part', () => {
		expect(classifyFocus('場', 0)).toBe('not-a-part');
	});
});

/** 모든 부품을 다 배운 아이 */
const ALL = new Set(SEAL_RECIPES.flatMap((r) => r.parts));

describe('orderQuizRecipes', () => {
	it('회차가 바뀌면 다른 판이 나온다', () => {
		/*
		 * 이게 없으면 아이가 몇 번을 다시 열어도 **똑같은 여섯 조각**을 받는다.
		 * 조합에 안 쓰이는 950자에서는 언제나 같은 판이었고, 사용자가 본
		 * 日月日生木木 이 우연이 아니라 그 950자의 고정 화면이었다.
		 */
		const boards = new Set<string>();
		for (let r = 0; r < 8; r++) {
			boards.add(
				orderQuizRecipes(ALL, new Set(), '', r)
					.map((x) => x.result)
					.join('')
			);
		}
		expect(boards.size, `나온 판: ${[...boards].join(' / ')}`).toBeGreaterThan(1);
	});

	it('같은 회차면 항상 같은 판이다 — 서버가 다시 유도해 검증하기 때문이다', () => {
		for (let r = 0; r < 5; r++) {
			expect(orderQuizRecipes(ALL, new Set(), '室', r)).toEqual(
				orderQuizRecipes(ALL, new Set(), '室', r)
			);
		}
	});

	it('회차가 돌아도 관련 조합은 계속 앞에 남는다', () => {
		// 안 그러면 "방금 배운 글자로 만들 수 있어요" 안내가 회차마다 거짓이 된다
		for (let r = 0; r < 6; r++) {
			const board = orderQuizRecipes(ALL, new Set(), '日', r);
			expect(board[0].parts.includes('日') || board[0].result === '日').toBe(true);
		}
	});

	it('부품이 모자라면 낼 수 있는 것만 낸다', () => {
		expect(orderQuizRecipes(new Set(['日']), new Set(), '', 0)).toEqual([]);
		expect(orderQuizRecipes(new Set(['日', '月']), new Set(), '', 0)).toHaveLength(1);
	});

	it('회차가 커도 판이 비지 않는다', () => {
		for (const r of [0, 1, 7, 99, 1000]) {
			expect(orderQuizRecipes(ALL, new Set(), '', r).length, `회차 ${r}`).toBeGreaterThan(0);
		}
	});
});

describe('복습 판은 언제나 비울 수 있다', () => {
	it('목표만 인정하면 어떤 판도 막다른 길이 없다', () => {
		/*
		 * 판의 조각은 **목표 조합들의 부품을 그대로 펼친 것**이다.
		 * 목표가 아닌 조합을 서버가 거절하면, 합체가 성사될 때마다 정확히 한 조합의
		 * 부품이 통째로 빠진다. 그래서 남는 것은 언제나 "남은 목표들의 부품" 이고
		 * 귀납으로 판은 0 으로 간다.
		 *
		 * 거절 규칙이 없으면 목표가 아닌 조합이 조각을 먹어 치워 남은 것이 서로 안 붙는다.
		 * 실제로 3조합 판의 46% 에 그런 막다른 길이 있다.
		 */
		let checked = 0;
		for (let r = 0; r < 40; r++) {
			const goals = orderQuizRecipes(ALL, new Set(), '', r);
			if (goals.length === 0) continue;
			checked += 1;

			// 목표를 아무 순서로나 치워도 항상 끝까지 간다
			let left = [...goals];
			const pieces = goals.flatMap((g) => g.parts);
			while (left.length > 0) {
				const next = left[left.length - 1];
				for (const part of next.parts) {
					const at = pieces.indexOf(part);
					expect(at, `${next.result} 의 부품 ${part} 이 판에 없다`).toBeGreaterThanOrEqual(0);
					pieces.splice(at, 1);
				}
				left = left.slice(0, -1);
			}
			expect(pieces, `회차 ${r} 에서 조각이 남았다`).toEqual([]);
		}
		expect(checked).toBeGreaterThan(0);
	});
});
