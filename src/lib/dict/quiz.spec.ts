import { describe, expect, it } from 'vitest';
import { charactersOfGrade, GRADES } from './index';
import { QUESTIONS_PER_ROUND, roundFor } from './quiz';

/**
 * 퀴즈가 **풀 수 있는 문제를 내는가.**
 *
 * 보기에 정답이 없거나, 같은 답이 두 개 있거나, 다른 급수 글자가 섞이면
 * 푸는 사람은 자기가 틀린 줄 안다.
 */
describe('급수 퀴즈', () => {
	it('모든 급수에서 판이 만들어진다', () => {
		for (const g of GRADES) {
			const q = roundFor(g.label, '1');
			expect(q.length, `${g.label} 퀴즈가 비었다`).toBe(Math.min(QUESTIONS_PER_ROUND, g.count));
		}
	});

	it('정답이 보기 안에 정확히 하나 있다', () => {
		for (const g of GRADES) {
			for (const q of roundFor(g.label, '7')) {
				expect(q.answer, `${q.character} 의 정답 자리가 이상하다`).toBeGreaterThanOrEqual(0);
				expect(q.answer).toBeLessThan(q.choices.length);
				// 같은 보기가 두 번 나오면 정답이 둘이 된다
				expect(new Set(q.choices).size, `${q.character} 의 보기가 겹친다`).toBe(q.choices.length);
			}
		}
	});

	it('보기를 같은 급수 안에서만 고른다 — 8급 문제에 4급 보기가 섞이면 안 된다', () => {
		for (const g of GRADES) {
			const inGrade = new Set(charactersOfGrade(g.label).map((e) => `${e.meaning} ${e.reading}`));
			for (const q of roundFor(g.label, '3')) {
				for (const c of q.choices) {
					expect(inGrade.has(c), `${g.label} 보기에 ${c} 가 섞였다`).toBe(true);
				}
			}
		}
	});

	it('같은 씨앗이면 같은 문제가 나온다 — 서버와 브라우저가 같은 화면을 봐야 한다', () => {
		expect(roundFor('8급', '1')).toEqual(roundFor('8급', '1'));
	});

	it('씨앗이 바뀌면 문제가 바뀐다', () => {
		const a = roundFor('8급', '1').map((q) => q.character);
		const b = roundFor('8급', '2').map((q) => q.character);
		expect(a).not.toEqual(b);
	});

	it('한 판 안에서 같은 글자를 두 번 묻지 않는다', () => {
		const chars = roundFor('8급', '5').map((q) => q.character);
		expect(new Set(chars).size).toBe(chars.length);
	});
});
