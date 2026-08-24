import { describe, expect, it } from 'vitest';
import { derive, poolForArea, sealLimitOf, tierOf } from './battle';
import { HANJA_SEED } from '../../../../database/seed/hanja';

/** 글자 → 지역. battle.ts 의 AREA_OF 와 같은 표다 */
const AREA_OF_TEST = new Map(HANJA_SEED.map((h) => [h.character, h.areaId]));
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

describe('보스가 이 마을을 묻는가', () => {
	const SEEDS = Array.from({ length: 60 }, (_, i) => [`u${i}`, `k${i}`] as const);

	it('지역 2~9 의 봉인에 이 마을 글자가 최소 하나 들어간다', () => {
		/*
		 * 사용자 질문: "보스 대결은 이번 마을에서 배운 걸로 하는 게 맞나?"
		 *
		 * 예전에는 `[...easy, ...rest].slice(0,3)` 이었는데 easy 후보(明·林·好)가
		 * 늘 3개 이상이라 **rest 레인이 100% 버려졌다.** 그래서 지역 1~5 보스가
		 * 전부 똑같았고, 9지역 최종 보스마저 8급 글자만 물었다.
		 *
		 * "이 마을 글자로만" 은 데이터가 허용하지 않는다(일곱 마을에서 후보 0개).
		 * "하나 이상" 이 최대치다.
		 */
		for (let area = 2; area <= 9; area++) {
			for (const [u, k] of SEEDS) {
				const seals = derive(u, k, area);
				const hasAnchor = seals.some((r) =>
					r.parts.some((p) => (AREA_OF_TEST.get(p) ?? 99) === area)
				);
				expect(
					hasAnchor,
					`area ${area} (${u}:${k}) 봉인 ${seals.map((s) => s.result).join('')} 에 이 마을 글자가 없다`
				).toBe(true);
			}
		}
	});

	it('지역마다 서로 다른 판이 여러 가지 나온다', () => {
		// 지역 1 은 후보가 셋뿐이라 예외다 (위 테스트가 그 이유를 적어 두었다)
		for (let area = 2; area <= 9; area++) {
			const boards = new Set(
				SEEDS.map(([u, k]) =>
					derive(u, k, area)
						.map((r) => r.result)
						.join('')
				)
			);
			expect(boards.size, `area ${area} 는 판이 ${boards.size}가지뿐이다`).toBeGreaterThan(1);
		}
	});

	it('18종 봉인이 골고루 쓰인다 — 영영 안 나오는 조합이 없다', () => {
		const seen = new Set<string>();
		for (let area = 1; area <= 9; area++) {
			for (const [u, k] of SEEDS) {
				for (const r of derive(u, k, area)) seen.add(r.result);
			}
		}
		const never = SEAL_RECIPES.filter((r) => !seen.has(r.result)).map((r) => r.result);
		expect(never, `어느 지역에서도 안 나오는 봉인: ${never.join(' ')}`).toEqual([]);
	});
});

describe('아이가 갇히는 판이 없다', () => {
	const SEEDS = Array.from({ length: 40 }, (_, i) => [`s${i}`, `t${i}`] as const);

	it('화면에 안 깔린 봉인을 판 위 조각으로 만들 수 없다', () => {
		/*
		 * **이것이 막히지 않으면 게임이 통째로 멈춘다.**
		 *
		 * `planFor` 는 `sealLimit` 개만 깔지만 `derive` 는 늘 3개를 낸다.
		 * 화면에 없는 3번째 봉인을 판 위 조각으로 만들 수 있으면 그 조각 둘이 사라지고,
		 * 남은 것끼리는 안 붙어 판이 영영 안 빈다 — `finish()` 가 아예 안 불린다.
		 * 이번 회차에 보스 승리가 지역 해금 조건이 되었으므로 그 순간 지도가 잠긴다.
		 */
		for (let area = 1; area <= 9; area++) {
			for (const [u, k] of SEEDS) {
				const seals = derive(u, k, area);
				for (let limit = 1; limit <= seals.length; limit++) {
					const onBoard: string[] = seals.slice(0, limit).flatMap((r) => r.parts);
					for (const hidden of seals.slice(limit)) {
						const bag = [...onBoard];
						const makeable = hidden.parts.every((p) => {
							const at = bag.indexOf(p);
							if (at < 0) return false;
							bag.splice(at, 1);
							return true;
						});
						expect(
							makeable,
							`area ${area} (${u}:${k}) limit ${limit}: 화면 밖 봉인 ${hidden.result} 을 만들 수 있다 — 아이가 갇힌다`
						).toBe(false);
					}
				}
			}
		}
	});

	it('화면에 깔린 봉인을 다 만들면 판이 정확히 빈다', () => {
		for (let area = 1; area <= 9; area++) {
			for (const [u, k] of SEEDS) {
				const seals = derive(u, k, area);
				for (let limit = 1; limit <= seals.length; limit++) {
					const shown = seals.slice(0, limit);
					const pieces = shown.flatMap((r) => r.parts);
					for (const r of shown) {
						for (const p of r.parts) {
							const at = pieces.indexOf(p);
							expect(at, `area ${area}: ${r.result} 의 ${p} 이 판에 없다`).toBeGreaterThanOrEqual(
								0
							);
							pieces.splice(at, 1);
						}
					}
					expect(pieces, `area ${area} limit ${limit}: 조각이 남았다`).toEqual([]);
				}
			}
		}
	});
});

describe('sealLimitOf', () => {
	it('세션 키에서 봉인 수를 읽는다', () => {
		expect(sealLimitOf('1-abc')).toBe(1);
		expect(sealLimitOf('2-abc')).toBe(2);
		expect(sealLimitOf('3-abc')).toBe(3);
	});

	it('이상한 키에는 안전한 최대값을 준다', () => {
		/*
		 * 낡은 세션 키(uuid 만)를 든 탭이 배포 뒤에도 살아 있을 수 있다.
		 * 그때 1 로 떨어지면 판을 다 비워도 승리가 안 된다 — 크게 잡는 쪽이 안전하다.
		 */
		for (const bad of ['', 'abc-def', '0-x', '9-x', '-1-x']) {
			expect(sealLimitOf(bad), bad).toBe(SEALS_PER_BATTLE);
		}
	});
});
