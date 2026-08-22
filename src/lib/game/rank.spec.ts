import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from './exp';
import { didPromote, nextRankAt, rankOf, RANK_MAX, RANK_PREFIX, RANK_STEP, titleFor } from './rank';
import { CHARACTERS, type CharacterClass } from '$lib/types/user';

/**
 * 전직 검증.
 *
 * 계급은 저장되지 않고 레벨에서 유도된다. 그래서 지켜야 할 것이 둘이다.
 *  1. **단조 증가** — 레벨이 오르는데 계급이 내려가면 아이는 빼앗겼다고 느낀다
 *  2. **경계가 정확히 10의 배수** — 9에서 10으로 넘어가는 그 순간이 사건이다
 */

const CLASSES = Object.keys(CHARACTERS) as CharacterClass[];

describe('rankOf', () => {
	it('10레벨마다 한 단계 오른다', () => {
		expect(rankOf(1)).toBe(0);
		expect(rankOf(9)).toBe(0);
		expect(rankOf(10)).toBe(1);
		expect(rankOf(19)).toBe(1);
		expect(rankOf(20)).toBe(2);
	});

	it('레벨이 오르는 동안 계급이 절대 내려가지 않는다', () => {
		let previous = -1;
		for (let level = 1; level <= MAX_LEVEL; level++) {
			const rank = rankOf(level);
			expect(rank, `레벨 ${level} 에서 계급이 내려갔다`).toBeGreaterThanOrEqual(previous);
			previous = rank;
		}
	});

	it('꼭대기를 넘지 않는다', () => {
		expect(rankOf(MAX_LEVEL)).toBe(RANK_MAX);
		expect(rankOf(9999)).toBe(RANK_MAX);
	});

	it('이상한 값에도 0단계로 버틴다', () => {
		for (const bad of [0, -5, Number.NaN, null, undefined]) {
			expect(rankOf(bad as number)).toBe(0);
		}
	});

	it('단계 수만큼 수식어가 있다', () => {
		expect(RANK_PREFIX).toHaveLength(RANK_MAX + 1);
	});
});

describe('nextRankAt', () => {
	it('다음 전직 레벨이 10의 배수다', () => {
		expect(nextRankAt(1)).toBe(10);
		expect(nextRankAt(9)).toBe(10);
		expect(nextRankAt(10)).toBe(20);
	});

	it('꼭대기에서는 없다', () => {
		expect(nextRankAt(MAX_LEVEL)).toBeNull();
		expect(nextRankAt(RANK_MAX * RANK_STEP)).toBeNull();
	});

	it('알려 준 레벨에 도달하면 실제로 전직한다', () => {
		for (let level = 1; level < MAX_LEVEL; level++) {
			const at = nextRankAt(level);
			if (at === null) continue;
			expect(didPromote(level, at), `레벨 ${level} → ${at} 에서 전직이 안 됐다`).toBe(true);
		}
	});
});

describe('didPromote', () => {
	it('경계를 넘을 때만 참이다', () => {
		expect(didPromote(9, 10)).toBe(true);
		expect(didPromote(10, 11)).toBe(false);
		expect(didPromote(8, 9)).toBe(false);
	});

	it('한 번에 여러 레벨이 올라 경계를 건너뛰어도 잡는다', () => {
		// 업적 보상이 겹치면 한 요청에서 두 레벨이 오르기도 한다
		expect(didPromote(9, 11)).toBe(true);
		expect(didPromote(8, 21)).toBe(true);
	});
});

describe('titleFor', () => {
	it('0단계는 수식어 없이 원래 이름이다', () => {
		expect(titleFor('knight', 0)).toBe(CHARACTERS.knight.label);
	});

	it('단계가 오르면 앞에 수식어가 붙는다', () => {
		expect(titleFor('knight', 1)).toBe(`씩씩한 ${CHARACTERS.knight.label}`);
		expect(titleFor('wizard', RANK_MAX)).toBe(`전설의 ${CHARACTERS.wizard.label}`);
	});

	it('여섯 캐릭터 × 여덟 단계가 전부 서로 다른 칭호다', () => {
		const titles = new Set<string>();
		for (const cls of CLASSES) {
			for (let rank = 0; rank <= RANK_MAX; rank++) titles.add(titleFor(cls, rank));
		}
		expect(titles.size).toBe(CLASSES.length * (RANK_MAX + 1));
	});

	it('캐릭터를 아직 안 고른 아이에게도 이름이 나온다', () => {
		// 가입 직후 characterClass 는 실제로 null 이다
		expect(titleFor(null, 0)).toBeTruthy();
		expect(titleFor(undefined, 3)).toBeTruthy();
	});
});
