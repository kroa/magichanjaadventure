/**
 * 획순 따라쓰기 — 판정.
 *
 * **핵심 판단: 순서는 판정이 아니라 화면이 강제한다.**
 *
 * 활성 획은 언제나 하나뿐이다. 그래서 "이 붓질이 몇 번째 획인가" 를 기하학으로 가려낼
 * 필요가 전혀 없다. 그걸 하려 들면 통로 폭 역설에 걸린다 — 획 사이 최소 거리는 몇 px 인데
 * 아이 손가락 기준 탭 하한은 48px 이라, 통로를 손가락에 맞추는 순간 옆 획과 구별이 안 된다.
 *
 * 우리는 **"활성 획을 따라 지나갔는가"** 만 묻는다. 분류를 안 하므로 통로를 넉넉히 열 수 있다.
 */

/** 획 하나 = 중심선을 이루는 점들. 좌표는 0..100 (글자 상자 기준) */
export type Stroke = readonly (readonly [number, number])[];

/**
 * 통로 반폭 (0..100 단위).
 *
 * 18 × (208px × 0.62 / 100) ≈ 23px → 폭 46px.
 * 아이 손가락 기준 탭 하한 48px 에 맞춘 값이다. 이보다 좁히면 손이 자꾸 빗나간다.
 */
export const CORRIDOR_R = 18;

/**
 * 중심선 표본 중 이만큼이 손가락 궤적에 덮이면 통과.
 *
 * 통로가 원반이라 손가락 끝에서 반지름만큼 **앞뒤로 공짜 덮임**이 생긴다.
 * 그래서 0.55 로 두면 획의 44%만 그어도 통과했다 — 반만 긋고 넘어가면 배우는 게 없다.
 * 0.75 면 실제로 절반 넘게 그어야 하고, 끝에서 조금 못 미쳐도 여전히 봐준다.
 */
export const COVERED = 0.75;

/** 획 길이와 무관하게 표본 수를 고정한다 — 결정론과 성능 둘 다를 위해서다 */
export const SAMPLES = 20;

/** 이보다 짧은 획(점획 丶)은 탭 한 번으로 통과시키고 방향을 묻지 않는다 */
export const TAP_LEN = 12;

/**
 * 글자를 통로 좌표계에 맞추는 두 값 — **재서 정했고, 검사가 지킨다.**
 *
 * 획순 좌표는 0..100 상자에서 대략 12..88 을 쓴다. 그런데 글자를 그냥 가운데 놓으면
 * 잉크가 그 자리에 오지 않는다:
 *  - 크기: 예전 값 0.62 에서 잉크는 22..78 만 채웠다. 통로가 글자보다 36% 컸다.
 *    Noto Sans KR 을 렌더해 재 보니 **0.84** 에서 12..88 을 채운다.
 *  - 자리: `line-height:1` 줄 상자 안에서 베이스라인이 폰트 메트릭대로 정해지므로
 *    잉크가 **4.3단위 아래**로 내려간다(십·대·목의 잉크 중심이 54.3 이었다).
 *
 * 흙에 덮여 있을 때는 어긋나도 안 보였지만, 시범이 글자 위에 획을 그으면 곧바로 드러난다.
 * 두 값이 흔들리면 통로가 글자를 벗어나므로 `tests/e2e/strokes.e2e.ts` 가 실제 픽셀로 지킨다.
 */
export const GLYPH_EM = 0.84;
/** 글자를 위로 올리는 양 (상자 대비 %) */
export const GLYPH_SHIFT = -4.3;

function dist(ax: number, ay: number, bx: number, by: number): number {
	return Math.hypot(ax - bx, ay - by);
}

/** 꺾인 선의 전체 길이 */
export function strokeLength(stroke: Stroke): number {
	let total = 0;
	for (let i = 1; i < stroke.length; i++) {
		total += dist(stroke[i - 1][0], stroke[i - 1][1], stroke[i][0], stroke[i][1]);
	}
	return total;
}

/** 중심선을 같은 간격의 점 n 개로 다시 찍는다 */
export function resample(stroke: Stroke, n = SAMPLES): [number, number][] {
	if (stroke.length === 0) return [];
	if (stroke.length === 1) return [[stroke[0][0], stroke[0][1]]];

	const total = strokeLength(stroke);
	if (total === 0) return [[stroke[0][0], stroke[0][1]]];

	const out: [number, number][] = [];
	const step = total / (n - 1);
	let segment = 0;
	let walked = 0;

	for (let i = 0; i < n; i++) {
		const target = Math.min(total, step * i);
		while (segment < stroke.length - 2) {
			const len = dist(
				stroke[segment][0],
				stroke[segment][1],
				stroke[segment + 1][0],
				stroke[segment + 1][1]
			);
			if (walked + len >= target) break;
			walked += len;
			segment += 1;
		}
		const a = stroke[segment];
		const b = stroke[segment + 1] ?? a;
		const len = dist(a[0], a[1], b[0], b[1]) || 1;
		const t = Math.min(1, Math.max(0, (target - walked) / len));
		out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
	}
	return out;
}

export interface StrokeMatch {
	/** 중심선 표본 중 손가락이 지나간 비율 */
	covered: number;
	/** 시작에서 끝 방향으로 그었는가 (표본이 하나면 언제나 true) */
	forward: boolean;
	passed: boolean;
}

/**
 * 손가락 궤적이 이 획을 따라갔는지 본다.
 *
 * 시작점은 **판정하지 않는다.** 획 시작점끼리 너무 가까워서 신호가 안 된다 —
 * 대신 화면이 시작점에 점을 띄워 안내만 한다.
 * 방향은 본다. 거꾸로 그으면 통과가 아니다. 다만 점획은 방향이 없으므로 건너뛴다.
 */
export function matchStroke(
	path: readonly (readonly [number, number])[],
	stroke: Stroke,
	radius = CORRIDOR_R
): StrokeMatch {
	const samples = resample(stroke);
	if (samples.length === 0 || path.length === 0) {
		return { covered: 0, forward: false, passed: false };
	}

	// 각 표본이 궤적의 몇 번째 점에서 처음 덮였는지
	const hitAt: number[] = [];
	samples.forEach((s, i) => {
		for (let p = 0; p < path.length; p++) {
			if (dist(s[0], s[1], path[p][0], path[p][1]) <= radius) {
				hitAt[i] = p;
				return;
			}
		}
	});

	const hitIndexes = samples.map((_, i) => i).filter((i) => hitAt[i] !== undefined);
	const covered = hitIndexes.length / samples.length;

	// 점획은 방향이 없다 — 닿기만 하면 된다
	if (strokeLength(stroke) < TAP_LEN) {
		return { covered, forward: true, passed: covered > 0 };
	}

	const first = hitIndexes[0];
	const last = hitIndexes[hitIndexes.length - 1];
	const forward = hitIndexes.length > 1 ? hitAt[first] <= hitAt[last] : true;

	return { covered, forward, passed: covered >= COVERED && forward };
}
