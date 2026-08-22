/**
 * 모험 지도의 좌표.
 *
 * 화면 파일에서 빼낸 이유가 둘이다.
 *  1. 예전 `SPOTS` 는 배열 순서로 섬을 찾고 `SPOTS[i] ?? SPOTS[last]` 로 흘려서,
 *     지역이 하나만 늘어도 두 섬이 완전히 포개졌다.
 *  2. 좌표에 걸린 불변식(내 카드와 안 겹칠 것)을 **테스트로 못 박을 수 없었다.**
 */

export interface MapNode {
	areaId: number;
	/** 지도 상자 대비 백분율 */
	x: number;
	y: number;
	/** 위로 갈수록 큰 값. 겹칠 때 누가 앞인지를 정한다 */
	depth: number;
}

/**
 * 아래에서 위로 **좁아지는 등반로** (3 → 3 → 2 → 1).
 *
 * 3×3 격자가 아니다. 위로 갈수록 길이 좁아져 마지막 섬이 정상에 혼자 선다 —
 * 지도를 처음 봤을 때 "저 위가 끝이구나" 가 한눈에 읽혀야 한다.
 */
export const NODES: MapNode[] = [
	{ areaId: 1, x: 16, y: 88, depth: 0 },
	{ areaId: 2, x: 46, y: 88, depth: 0 },
	{ areaId: 3, x: 78, y: 88, depth: 0 },
	{ areaId: 4, x: 82, y: 64, depth: 1 },
	{ areaId: 5, x: 52, y: 64, depth: 1 },
	{ areaId: 6, x: 20, y: 64, depth: 1 },
	{ areaId: 7, x: 24, y: 40, depth: 2 },
	{ areaId: 8, x: 56, y: 40, depth: 2 },
	{ areaId: 9, x: 76, y: 15, depth: 3 }
];

/**
 * 왼쪽 위 "내 카드" 가 차지하는 구역. 어떤 섬도 여기 들어오면 안 된다.
 *
 * 예전에는 한자 왕성이 4.6px 차이로 겹침 검사를 통과하고 있었다.
 * 그것도 그 섬이 레벨 28 을 요구해 **모든 테스트 사용자에게 잠겨 있고**,
 * 잠긴 섬이 82% 로 줄어드는 덕분이었다 — CI 가 영원히 못 볼 시한폭탄이었다.
 */
export const KEEP_OUT = { x: 30, y: 26 } as const;

export function nodeFor(areaId: number): MapNode | undefined {
	return NODES.find((n) => n.areaId === areaId);
}

/**
 * 섬 중심을 잇는 **부드러운 길**.
 *
 * Catmull-Rom 을 3차 베지에로 옮긴다. 손으로 그린 path 를 두지 않는 이유는
 * 노드를 하나 옮길 때마다 길을 다시 그려야 하기 때문이다.
 */
export function trailPath(nodes: readonly MapNode[] = NODES): string {
	if (nodes.length < 2) return '';

	const pts = nodes.map((n) => ({ x: n.x, y: n.y }));
	const at = (i: number) => pts[Math.min(pts.length - 1, Math.max(0, i))];

	let d = `M ${pts[0].x} ${pts[0].y}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = at(i - 1);
		const p1 = at(i);
		const p2 = at(i + 1);
		const p3 = at(i + 2);
		// 표준 Catmull-Rom(장력 1/6) → 베지에 제어점
		const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
		const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
		d += ` C ${round(c1.x)} ${round(c1.y)}, ${round(c2.x)} ${round(c2.y)}, ${round(p2.x)} ${round(p2.y)}`;
	}
	return d;
}

function round(n: number): number {
	return Math.round(n * 100) / 100;
}
