import { describe, expect, it } from 'vitest';
import { HANJA_BY_AREA } from './hanja';
import { allPartChars, SEAL_RECIPES } from '../../src/lib/game/fusion';
import { hasPicture } from '../../src/lib/art/pictographs';

/**
 * 배우기 순서 검증.
 *
 * 실제 순서는 `src/lib/server/db/hanja.ts` 의 `listUnlearned` 가 SQL 두 방으로 낸다.
 * 여기서는 **같은 규칙을 순수 함수로 흉내 내어 의도를 못 박는다** — D1 없이 돌리려는 것이다.
 * 규칙이 갈라지면 이 파일이 아니라 SQL 쪽이 틀린 것이니, 둘을 같이 고쳐야 한다.
 *
 * 지키려는 것은 하나다: **아이가 배우자마자 붙여 볼 수 있어야 한다.**
 */

const PARTS = new Set(allPartChars());

/** listUnlearned 의 정렬 규칙: 지역 안에서 조합 부품 먼저, 그 뒤는 급수 순서 그대로 */
function learnOrder(areaId: number): string[] {
	const rows = [...(HANJA_BY_AREA[areaId] ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
	return [
		...rows.filter((r) => PARTS.has(r.character)),
		...rows.filter((r) => !PARTS.has(r.character))
	].map((r) => r.character);
}

/** 이만큼 배운 시점에 SEAL_RECIPES 중 몇 개를 만들 수 있는가 */
function makeableAfter(order: string[], count: number): number {
	const owned = new Set(order.slice(0, count));
	return SEAL_RECIPES.filter((r) => r.parts.every((p) => owned.has(p))).length;
}

const AREAS = Object.keys(HANJA_BY_AREA)
	.map(Number)
	.sort((a, b) => a - b);

describe('배우기 순서', () => {
	it('지역의 글자를 하나도 잃거나 더하지 않는다 (순열이다)', () => {
		for (const areaId of AREAS) {
			const original = (HANJA_BY_AREA[areaId] ?? []).map((r) => r.character);
			const ordered = learnOrder(areaId);
			expect(ordered, `area ${areaId} 글자 수가 달라졌다`).toHaveLength(original.length);
			expect(new Set(ordered), `area ${areaId} 글자 집합이 달라졌다`).toEqual(new Set(original));
		}
	});

	it('같은 입력이면 항상 같은 순서다', () => {
		for (const areaId of AREAS) {
			expect(learnOrder(areaId)).toEqual(learnOrder(areaId));
		}
	});

	it('새싹 마을은 네 자만 배워도 합체가 하나 열린다', () => {
		/*
		 * 이게 이 변경의 전부다.
		 * 예전 순서(급수 순)에서는 12번째(月)가 되어야 첫 합체가 열렸다.
		 * 그 전까지 아이는 복습판이 텅 빈 채로 열한 번을 파냈다.
		 */
		const order = learnOrder(1);
		expect(makeableAfter(order, 4), `앞 4자: ${order.slice(0, 4).join('')}`).toBeGreaterThanOrEqual(
			1
		);
	});

	it('새싹 마을의 앞 13자는 전부 그림이 있다', () => {
		/*
		 * 이 앱의 대표 장면은 "그림이 글자로 바뀌는 것" 이다.
		 * 예전 순서는 3~10번째가 三四五六七八九十 여덟 자 연속이라 그림이 없었고,
		 * 아이는 첫 열 번의 발굴에서 그 장면을 한 번도 못 봤다.
		 */
		const order = learnOrder(1);
		const head = order.slice(0, 13);
		const noPicture = head.filter((c) => !hasPicture(c));
		expect(noPicture, `그림 없는 글자: ${noPicture.join(' ')}`).toEqual([]);
	});

	it('부품을 먼저 낸다 — 부품 뒤에 비부품이 오는 일은 없다', () => {
		for (const areaId of AREAS) {
			const order = learnOrder(areaId);
			const lastPart = order.findLastIndex((c) => PARTS.has(c));
			const firstOther = order.findIndex((c) => !PARTS.has(c));
			if (lastPart < 0 || firstOther < 0) continue;
			expect(lastPart, `area ${areaId} 에서 부품과 비부품이 섞였다`).toBeLessThan(firstOther);
		}
	});
});
