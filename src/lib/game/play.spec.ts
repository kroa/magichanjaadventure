import { describe, expect, it } from 'vitest';
import { classifyFocus, pickNextPlay } from './play';
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
