import { describe, expect, it } from 'vitest';
import { AREAS } from './areas';
import { KEEP_OUT, NODES, nodeFor, trailPath } from './worldmap';

/**
 * 지도 좌표 검증.
 *
 * 좌표를 화면 파일에서 빼낸 이유가 여기 있다 —
 * 예전에는 `SPOTS[i] ?? SPOTS[last]` 로 흘려서 지역이 하나 늘면 두 섬이 완전히 포개졌고,
 * 왼쪽 위 내 카드와 한자 왕성이 4.6px 차이로 겹침 검사를 아슬아슬하게 통과하고 있었다.
 * 둘 다 눈으로는 안 보이고 CI 도 못 잡던 문제라 데이터로 못 박는다.
 */

describe('NODES', () => {
	it('모든 지역에 자리가 하나씩 있다', () => {
		expect(NODES).toHaveLength(AREAS.length);
		for (const area of AREAS) {
			expect(nodeFor(area.id), `${area.name} 의 자리가 없다`).toBeDefined();
		}
	});

	it('같은 자리에 두 섬이 서지 않는다', () => {
		const keys = NODES.map((n) => `${n.x},${n.y}`);
		expect(new Set(keys).size, `중복 좌표: ${keys.join(' / ')}`).toBe(NODES.length);
	});

	it('전부 지도 안에 있다', () => {
		for (const n of NODES) {
			expect(n.x, `area ${n.areaId} x`).toBeGreaterThanOrEqual(8);
			expect(n.x, `area ${n.areaId} x`).toBeLessThanOrEqual(92);
			expect(n.y, `area ${n.areaId} y`).toBeGreaterThanOrEqual(8);
			expect(n.y, `area ${n.areaId} y`).toBeLessThanOrEqual(92);
		}
	});

	it('왼쪽 위 내 카드 자리를 비워 둔다', () => {
		for (const n of NODES) {
			const inside = n.x < KEEP_OUT.x && n.y < KEEP_OUT.y;
			expect(inside, `area ${n.areaId} (${n.x},${n.y}) 이 내 카드와 겹친다`).toBe(false);
		}
	});

	it('이웃한 섬끼리 충분히 떨어져 있다', () => {
		/*
		 * 섬 상자는 지도 짧은 변의 22% 다. 가로 30%p / 세로 24%p 간격이면
		 * 어느 뷰포트에서도 실제 틈이 남는다. 이 여유가 무너지면
		 * 레이아웃 검사기가 "요소 겹침" 으로 잡기 전에 아이 손가락이 먼저 못 짚는다.
		 */
		for (let i = 0; i < NODES.length; i++) {
			for (let j = i + 1; j < NODES.length; j++) {
				const a = NODES[i];
				const b = NODES[j];
				const dx = Math.abs(a.x - b.x);
				const dy = Math.abs(a.y - b.y);
				expect(
					dx >= 24 || dy >= 20,
					`area ${a.areaId} 과 ${b.areaId} 이 너무 가깝다 (dx ${dx}, dy ${dy})`
				).toBe(true);
			}
		}
	});

	it('아래에서 위로 올라간다 — 1지역이 가장 아래, 마지막 지역이 가장 위', () => {
		const first = nodeFor(1)!;
		const last = nodeFor(AREAS.length)!;
		expect(first.y).toBeGreaterThan(last.y);
		for (const n of NODES) {
			expect(n.y, `area ${n.areaId} 이 1지역보다 아래에 있다`).toBeLessThanOrEqual(first.y);
		}
	});
});

describe('trailPath', () => {
	it('첫 섬에서 시작해 모든 구간을 잇는다', () => {
		const d = trailPath();
		expect(d.startsWith(`M ${NODES[0].x} ${NODES[0].y}`)).toBe(true);
		// 노드 하나당 곡선 한 구간
		expect(d.match(/C /g) ?? []).toHaveLength(NODES.length - 1);
	});

	it('숫자만 나온다 — NaN 이 섞이면 길이 통째로 사라진다', () => {
		expect(trailPath()).not.toMatch(/NaN|undefined/);
	});

	it('섬이 하나뿐이면 길이 없다', () => {
		expect(trailPath([NODES[0]])).toBe('');
		expect(trailPath([])).toBe('');
	});

	it('같은 입력이면 같은 길이다', () => {
		expect(trailPath()).toBe(trailPath());
	});
});
