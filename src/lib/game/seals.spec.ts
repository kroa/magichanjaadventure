import { describe, expect, it } from 'vitest';
import { SEAL_RECIPES, hasVariant } from './fusion';
import { countStars, sealsFrom, trayFrom, SEALS_PER_BATTLE, TRAY_SIZE } from './seals';

/**
 * 봉인 생성기 검증.
 *
 * 두 가지가 절대 무너지면 안 된다.
 *  1. **결정론** — 서버가 다시 계산해 검증하므로, 어긋나면 아이가 맞혔는데 거절당한다
 *  2. **정답 부품이 서랍에 있다** — 이게 깨지면 아이는 절대 못 깨는 봉인 앞에 앉는다
 */

describe('sealsFrom', () => {
	it('같은 씨앗이면 같은 봉인이 나온다', () => {
		const a = sealsFrom('user-1:session-abc', SEAL_RECIPES).map((r) => r.result);
		const b = sealsFrom('user-1:session-abc', SEAL_RECIPES).map((r) => r.result);
		expect(a).toEqual(b);
		expect(a).toHaveLength(SEALS_PER_BATTLE);
	});

	it('후보 순서가 달라도 결과가 같다', () => {
		// 서버가 후보를 어떤 순서로 모으든 같은 봉인이 나와야 한다
		const a = sealsFrom('seed', SEAL_RECIPES).map((r) => r.result);
		const b = sealsFrom('seed', [...SEAL_RECIPES].reverse()).map((r) => r.result);
		expect(a).toEqual(b);
	});

	it('씨앗이 다르면 대체로 다른 봉인이 나온다', () => {
		const seeds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
		const sets = new Set(
			seeds.map((s) =>
				sealsFrom(s, SEAL_RECIPES)
					.map((r) => r.result)
					.join('')
			)
		);
		expect(sets.size).toBeGreaterThan(1);
	});

	it('같은 봉인이 두 번 나오지 않는다', () => {
		const seals = sealsFrom('seed', SEAL_RECIPES);
		expect(new Set(seals.map((s) => s.result)).size).toBe(seals.length);
	});

	it('후보가 적으면 있는 만큼만 낸다', () => {
		expect(sealsFrom('seed', SEAL_RECIPES.slice(0, 2))).toHaveLength(2);
		expect(sealsFrom('seed', [])).toEqual([]);
	});

	it('모양이 바뀌는 조합은 봉인이 되지 않는다', () => {
		// 淸 을 내고 "부품을 찾아봐" 라고 하면 아이는 淸 안에서 水 를 못 찾는다
		for (const seed of ['a', 'b', 'c', 'd', 'e']) {
			for (const seal of sealsFrom(seed, SEAL_RECIPES)) {
				expect(hasVariant(seal), `${seal.result} 가 봉인으로 나왔다`).toBe(false);
			}
		}
	});
});

describe('trayFrom', () => {
	it('봉인이 요구하는 부품이 전부 서랍에 있다', () => {
		/*
		 * 이 테스트가 막다른 길을 막는다.
		 * 하나라도 빠지면 아이는 절대 못 깨는 봉인 앞에 앉게 된다.
		 */
		for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
			const seals = sealsFrom(seed, SEAL_RECIPES);
			const tray = trayFrom(seed, seals);
			for (const seal of seals) {
				for (const part of seal.parts) {
					expect(tray, `${seed}: ${seal.result} 의 부품 ${part} 이 서랍에 없다`).toContain(part);
				}
			}
		}
	});

	it('같은 씨앗이면 같은 서랍이다', () => {
		const seals = sealsFrom('seed', SEAL_RECIPES);
		expect(trayFrom('seed', seals)).toEqual(trayFrom('seed', seals));
	});

	it('미끼가 섞여 있다 — 서랍이 곧 정답표가 되면 안 된다', () => {
		const seals = sealsFrom('seed', SEAL_RECIPES);
		const tray = trayFrom('seed', seals);
		const needed = new Set(seals.flatMap((s) => s.parts));
		const decoys = tray.filter((c) => !needed.has(c));
		expect(decoys.length).toBeGreaterThan(0);
	});

	it('서랍에 같은 부품이 두 번 들어가지 않는다', () => {
		const seals = sealsFrom('seed', SEAL_RECIPES);
		const tray = trayFrom('seed', seals);
		expect(new Set(tray).size).toBe(tray.length);
	});

	it('칸 수를 지킨다', () => {
		const seals = sealsFrom('seed', SEAL_RECIPES);
		expect(trayFrom('seed', seals)).toHaveLength(TRAY_SIZE);
	});
});

describe('countStars', () => {
	const base = { brokenCount: 3, totalSeals: 3, firstTryCount: 2, discoveredNew: true };

	it('전부 해내면 별 셋', () => {
		expect(countStars(base)).toBe(3);
	});

	it('봉인을 다 못 풀면 완주 별이 없다', () => {
		expect(countStars({ ...base, brokenCount: 2 })).toBe(2);
	});

	it('도움을 많이 써도 별을 빼앗지 않는다', () => {
		/*
		 * 도움에 값을 매기면 아이는 도움을 안 청하고 막힌 채 앉아 있는다.
		 * 별 조건은 "한 번도 안 썼다" 가 아니라 "한 번은 스스로 해냈다" 이다.
		 */
		const alwaysHinted = { ...base, firstTryCount: 0 };
		expect(countStars(alwaysHinted)).toBe(2);
		expect(countStars(alwaysHinted)).toBeGreaterThan(0);
	});

	it('봉인이 없으면 완주 별도 없다', () => {
		expect(
			countStars({ brokenCount: 0, totalSeals: 0, firstTryCount: 0, discoveredNew: false })
		).toBe(0);
	});
});
