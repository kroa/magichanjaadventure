import { describe, expect, it } from 'vitest';
import { derive, poolForArea, tierOf } from './battle';
import { SEAL_RECIPES } from '$lib/game/fusion';
import { SEALS_PER_BATTLE } from '$lib/game/seals';

/**
 * 대결 봉인 유도 검증.
 *
 * 이 파일의 함수들은 D1 을 안 쓰는 순수 함수다 — 씨드 상수만 읽는다.
 * 그래서 DB 없이 여기서 다 검증할 수 있다.
 *
 * 무너지면 안 되는 두 가지:
 *  1. **결정론** — `attack` 이 봉인을 다시 유도해 검증한다. 어긋나면 아이가 맞혀도 거절당한다
 *  2. **첫 지역은 그림으로 짐작되는 조합만** — 여덟 살에게 間(사이)·本(밑동)은 그림에서 뜻이 안 나온다
 */

const SEEDS = ['u1:k1', 'u2:k2', 'u3:k3', 'u4:k4', 'u5:k5', 'u6:k6'];

describe('derive', () => {
	it('같은 씨앗이면 언제나 같은 봉인이다', () => {
		for (const seed of SEEDS) {
			const [user, key] = seed.split(':');
			for (const area of [1, 3, 5, 9]) {
				expect(derive(user, key, area).map((r) => r.result)).toEqual(
					derive(user, key, area).map((r) => r.result)
				);
			}
		}
	});

	it('새싹 마을 봉인은 전부 초심자용이다', () => {
		/*
		 * 예전에는 후보가 明·林 둘뿐이라 세 번째 자리에 항상 추상어가 들어왔다.
		 * "레벨 1인데 저학년이 하기엔 어렵다" 는 지적을 두 번 받은 자리가 여기다.
		 */
		for (const seed of SEEDS) {
			const [user, key] = seed.split(':');
			const seals = derive(user, key, 1);
			const hard = seals.filter((r) => !r.beginner);
			expect(
				hard.map((r) => r.result),
				`${seed}: 새싹 마을에 어려운 봉인이 들어왔다`
			).toEqual([]);
		}
	});

	it('유도된 봉인은 전부 판에 깔 수 있는 조합이다', () => {
		// 변형 부수 조합(人→亻)은 조각을 그대로 붙일 수 없어 SEAL_RECIPES 에서 빠져 있다
		const allowed = new Set(SEAL_RECIPES.map((r) => r.result));
		for (const seed of SEEDS) {
			const [user, key] = seed.split(':');
			for (let area = 1; area <= 9; area++) {
				for (const seal of derive(user, key, area)) {
					expect(allowed.has(seal.result), `${seed} area ${area}: ${seal.result}`).toBe(true);
				}
			}
		}
	});

	it('어느 지역에서도 봉인 세 개를 채운다', () => {
		for (const seed of SEEDS) {
			const [user, key] = seed.split(':');
			for (let area = 1; area <= 9; area++) {
				expect(derive(user, key, area), `area ${area} 봉인이 모자란다`).toHaveLength(
					SEALS_PER_BATTLE
				);
			}
		}
	});

	it('같은 봉인이 한 판에 두 번 나오지 않는다', () => {
		for (const seed of SEEDS) {
			const [user, key] = seed.split(':');
			for (let area = 1; area <= 9; area++) {
				const results = derive(user, key, area).map((r) => r.result);
				expect(new Set(results).size, `${seed} area ${area}: ${results.join(' ')}`).toBe(
					results.length
				);
			}
		}
	});
});

describe('poolForArea / tierOf', () => {
	it('모든 지역에서 후보가 봉인 수 이상이다', () => {
		for (let area = 1; area <= 9; area++) {
			expect(poolForArea(area).length, `area ${area}`).toBeGreaterThanOrEqual(SEALS_PER_BATTLE);
		}
	});

	it('모든 조합의 부품이 씨드 안에 있다', () => {
		// tierOf 는 씨드에 없는 부품에 99 를 준다. 99 가 나오면 조합표에 오타가 있다는 뜻이다.
		for (const recipe of SEAL_RECIPES) {
			expect(tierOf(recipe), `${recipe.parts.join('+')} = ${recipe.result}`).toBeLessThanOrEqual(9);
		}
	});
});
