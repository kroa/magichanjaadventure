import { describe, expect, it } from 'vitest';
import {
	applyExp,
	comboBonus,
	expForAnswer,
	expToNextLevel,
	isSpecialCombo,
	levelProgress,
	MAX_LEVEL
} from './exp';

describe('expToNextLevel', () => {
	it('레벨 1 은 100 EXP 로 올라간다 (첫 레벨업을 빠르게)', () => {
		expect(expToNextLevel(1)).toBe(100);
	});

	it('레벨이 오를수록 필요 EXP 가 단조 증가한다', () => {
		for (let level = 1; level < MAX_LEVEL - 1; level++) {
			expect(expToNextLevel(level + 1)).toBeGreaterThan(expToNextLevel(level));
		}
	});

	it('최대 레벨에서는 더 올라갈 곳이 없다', () => {
		expect(expToNextLevel(MAX_LEVEL)).toBe(Infinity);
	});
});

describe('comboBonus', () => {
	it.each([
		[0, 0],
		[1, 0],
		[2, 0],
		[3, 5],
		[4, 5],
		[5, 10],
		[9, 10],
		[10, 20],
		[50, 20]
	])('콤보 %i → 보너스 %i', (combo, expected) => {
		expect(comboBonus(combo)).toBe(expected);
	});

	it('구간 보너스는 누적되지 않는다 (10콤보가 5+10+20 이 아니다)', () => {
		expect(comboBonus(10)).toBe(20);
	});

	it('10콤보 이상은 특별 연출을 발동한다', () => {
		expect(isSpecialCombo(9)).toBe(false);
		expect(isSpecialCombo(10)).toBe(true);
	});
});

describe('expForAnswer', () => {
	it('오답은 0 EXP 이며 EXP 를 깎지 않는다', () => {
		const result = expForAnswer({ isCorrect: false, combo: 7, answerMs: 500, isNewHanja: true });
		expect(result.total).toBe(0);
	});

	it('기본 정답은 10 EXP', () => {
		expect(expForAnswer({ isCorrect: true, combo: 1 }).total).toBe(10);
	});

	it('3초 이내 정답에 속도 보너스가 붙는다', () => {
		expect(expForAnswer({ isCorrect: true, combo: 1, answerMs: 2999 }).speed).toBe(2);
		expect(expForAnswer({ isCorrect: true, combo: 1, answerMs: 3001 }).speed).toBe(0);
	});

	it('경계값 3000ms 는 빠른 정답으로 인정한다', () => {
		expect(expForAnswer({ isCorrect: true, combo: 1, answerMs: 3000 }).speed).toBe(2);
	});

	it('새 한자 획득 + 콤보 + 속도가 모두 합산된다', () => {
		const result = expForAnswer({
			isCorrect: true,
			combo: 10,
			answerMs: 1000,
			isNewHanja: true
		});
		expect(result).toEqual({ base: 10, combo: 20, speed: 2, discovery: 20, total: 52 });
	});
});

describe('applyExp', () => {
	it('레벨업하지 않으면 EXP 만 쌓인다', () => {
		expect(applyExp({ level: 1, exp: 10 }, 30)).toMatchObject({
			level: 1,
			exp: 40,
			levelsGained: 0
		});
	});

	it('필요 EXP 를 정확히 채우면 레벨업한다', () => {
		expect(applyExp({ level: 1, exp: 0 }, 100)).toMatchObject({
			level: 2,
			exp: 0,
			levelsGained: 1
		});
	});

	it('남은 EXP 는 다음 레벨로 이월된다', () => {
		expect(applyExp({ level: 1, exp: 90 }, 25)).toMatchObject({
			level: 2,
			exp: 15,
			levelsGained: 1
		});
	});

	it('한 번에 여러 레벨이 오를 수 있다', () => {
		// Lv1→2: 100, Lv2→3: 140  → 합 240
		const result = applyExp({ level: 1, exp: 0 }, 250);
		expect(result.level).toBe(3);
		expect(result.levelsGained).toBe(2);
		expect(result.exp).toBe(10);
	});

	it('최대 레벨을 넘지 않고 EXP 는 0 으로 고정된다', () => {
		const result = applyExp({ level: MAX_LEVEL, exp: 0 }, 999_999);
		expect(result.level).toBe(MAX_LEVEL);
		expect(result.exp).toBe(0);
		expect(result.levelsGained).toBe(0);
	});

	it('음수 EXP 는 무시한다 (EXP 는 절대 줄지 않는다)', () => {
		expect(applyExp({ level: 3, exp: 50 }, -100)).toMatchObject({ level: 3, exp: 50 });
	});
});

describe('levelProgress', () => {
	it('0 EXP 는 0, 절반은 0.5', () => {
		expect(levelProgress({ level: 1, exp: 0 })).toBe(0);
		expect(levelProgress({ level: 1, exp: 50 })).toBe(0.5);
	});

	it('항상 0~1 범위로 클램프된다', () => {
		expect(levelProgress({ level: 1, exp: 99_999 })).toBe(1);
		expect(levelProgress({ level: MAX_LEVEL, exp: 0 })).toBe(1);
	});
});
