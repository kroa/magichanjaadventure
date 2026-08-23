import { describe, expect, it } from 'vitest';
import { AREAS, AREA_UNLOCK_RATIO, evaluateAreaUnlocks, TOTAL_HANJA } from './areas';

/**
 * 지역 데이터 검증.
 *
 * **배열 순서와 id 를 잠근다.** `evaluateAreaUnlocks` 가 `AREAS[area.id - 2]` 로
 * 직전 지역을 찾고, 시드가 지역 순서대로 한자 id 를 부여한다.
 * 순서가 흐트러지면 해금 조건이 엉뚱한 지역을 가리키고 진도가 어긋난다.
 */

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe('AREAS', () => {
	it('아홉 곳이고 id 가 1부터 차례대로다', () => {
		expect(AREAS).toHaveLength(9);
		AREAS.forEach((area, i) => {
			expect(area.id, `${i}번째 자리의 id`).toBe(i + 1);
		});
	});

	it('모든 지역이 흙 재질과 땅색을 갖는다', () => {
		for (const area of AREAS) {
			for (const [key, value] of Object.entries(area.soil)) {
				expect(value, `${area.name} soil.${key}`).toMatch(HEX);
			}
			expect(area.ground, `${area.name} ground`).toMatch(HEX);
		}
	});

	it('흙색과 땅색이 지역 대표색과 다르다 — 같으면 구분이 안 된다', () => {
		for (const area of AREAS) {
			expect(area.ground.toLowerCase(), `${area.name}: 땅색이 accent 와 같다`).not.toBe(
				area.accent.toLowerCase()
			);
		}
	});

	it('흙 재질이 지역마다 다르다 — 다 같으면 어디를 파도 똑같다', () => {
		const tops = new Set(AREAS.map((a) => a.soil.top.toLowerCase()));
		expect(tops.size, `서로 다른 흙 윗색: ${[...tops].join(' ')}`).toBeGreaterThanOrEqual(8);
	});

	it('전체 한자 수가 1000자다', () => {
		expect(TOTAL_HANJA).toBe(1000);
	});
});

describe('evaluateAreaUnlocks', () => {
	it('첫 지역은 언제나 열려 있고 관문이 없다', () => {
		const [first] = evaluateAreaUnlocks(1, {});
		expect(first.unlocked).toBe(true);
		expect(first.gate).toBeNull();
	});

	it('레벨이 모자라면 관문이 숫자로 나온다', () => {
		const states = evaluateAreaUnlocks(1, {});
		const second = states[1];
		expect(second.unlocked).toBe(false);
		expect(second.gate).toEqual({ kind: 'level', need: AREAS[1].levelRequired, have: 1 });
	});

	it('레벨은 됐는데 진도가 모자라면 진도 관문이 나온다', () => {
		// 지역 2는 레벨 3 필요. 레벨을 넉넉히 주고 진도만 0 으로 둔다
		const states = evaluateAreaUnlocks(99, {});
		const second = states[1];
		expect(second.unlocked).toBe(false);
		expect(second.gate?.kind).toBe('progress');
		if (second.gate?.kind !== 'progress') return;
		expect(second.gate.need).toBe(Math.ceil(AREAS[0].hanjaCount * AREA_UNLOCK_RATIO));
		expect(second.gate.have).toBe(0);
		expect(second.gate.from).toBe(AREAS[0].name);
	});

	it('관문 숫자와 안내 문장이 어긋나지 않는다', () => {
		/*
		 * 문장은 토스트가 쓰고 숫자는 지도가 쓴다. 둘이 갈라지면
		 * "30자 필요" 라고 말해 놓고 진행바는 다른 눈금을 그린다.
		 */
		for (const state of evaluateAreaUnlocks(4, { 1: 10 })) {
			if (state.unlocked) {
				expect(state.gate, `${state.area.name}: 열렸는데 관문이 남았다`).toBeNull();
				expect(state.lockedReason).toBeNull();
				continue;
			}
			expect(state.gate, `${state.area.name}: 잠겼는데 관문이 없다`).not.toBeNull();
			expect(state.lockedReason).toBeTruthy();
			const gate = state.gate!;
			if (gate.kind === 'boss') {
				expect(state.lockedReason).toContain(gate.boss);
			} else {
				expect(state.lockedReason).toContain(String(gate.need));
			}
		}
	});

	it('다 모으고 레벨도 높은데 보스를 안 이겼으면 아직 잠겨 있다', () => {
		/*
		 * **대결이 있어야 할 이유.**
		 * 예전에는 레벨과 한자 수만 봤다. 그런데 레벨은 배우기만 해도 오르므로
		 * 대결을 한 번도 안 하고 아홉 섬을 다 지날 수 있었다.
		 */
		const learned = Object.fromEntries(AREAS.map((a) => [a.id, a.hanjaCount]));
		const states = evaluateAreaUnlocks(80, learned, new Set());
		expect(states[0].unlocked, '첫 섬은 언제나 열려 있다').toBe(true);
		expect(states[1].unlocked).toBe(false);
		expect(states[1].gate?.kind).toBe('boss');
	});

	it('보스까지 다 이기면 전부 열린다', () => {
		const learned = Object.fromEntries(AREAS.map((a) => [a.id, a.hanjaCount]));
		const wins = new Set(AREAS.map((a) => a.id));
		for (const state of evaluateAreaUnlocks(80, learned, wins)) {
			expect(state.unlocked, `${state.area.name} 이 안 열렸다`).toBe(true);
			expect(state.gate).toBeNull();
		}
	});

	it('보스 관문은 레벨·진도를 다 채운 뒤에만 나온다 — 한 번에 하나씩만 알려 준다', () => {
		const learned = Object.fromEntries(AREAS.map((a) => [a.id, a.hanjaCount]));
		// 레벨이 모자라면 보스가 아니라 레벨을 먼저 말해야 한다
		const low = evaluateAreaUnlocks(1, learned, new Set());
		expect(low[1].gate?.kind).toBe('level');
	});
});

describe('보스', () => {
	it('아홉 지역의 보스 id 가 서로 다르다', () => {
		const ids = AREAS.map((a) => a.boss.id);
		expect(new Set(ids).size, `중복: ${ids.join(' ')}`).toBe(9);
	});

	it('MonsterSprite 가 아홉 보스를 모두 그린다', async () => {
		/*
		 * 예전에는 `kind?: string` 이라 스킨이 없는 지역(구름 나루·한자 하늘섬)이
		 * 조용히 1지역 도토리 도적으로 떨어졌다. 마지막 두 보스가 첫 보스와
		 * **똑같이 생긴 채로** 출시돼 있었고 아무도 몰랐다.
		 *
		 * 지금은 `Record<BossId, Skin>` 이라 타입이 막지만, 스킨 표가 다른 파일로
		 * 옮겨질 수도 있으니 소스에 이름이 실제로 있는지 한 번 더 본다.
		 */
		const src = await import('fs').then((fs) =>
			fs.readFileSync('src/lib/components/art/MonsterSprite.svelte', 'utf8')
		);
		for (const area of AREAS) {
			expect(src, `${area.name}의 보스 ${area.boss.id} 스킨이 없다`).toContain(
				`${area.boss.id}: {`
			);
		}
	});
});
