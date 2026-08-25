import { describe, expect, it } from 'vitest';
import { HANJA_SEED } from '../../../database/seed/hanja';
import { CORRIDOR_R, matchStroke, resample, SAMPLES, strokeLength } from './stroke';
import { STROKES, strokesOf } from './stroke-data';

/**
 * 획순 데이터와 판정 검증.
 *
 * 좌표의 **모양**이 맞는지는 기계가 못 본다 — 그건 눈으로 봐야 한다(/styleguide/strokes).
 * 여기서는 기계가 볼 수 있는 것만 못 박는다: 획수가 시드와 맞는가, 좌표가 상자 안인가,
 * 판정이 관대한 쪽으로 틀리지 않는가.
 */

const STROKE_COUNT = new Map(HANJA_SEED.map((h) => [h.character, h.strokeCount]));

describe('획순 데이터', () => {
	it('획수가 시드와 정확히 같다', () => {
		/*
		 * 어긋나면 아이가 긋는 횟수와 화면이 인쇄하는 획수가 달라진다.
		 * 실제로 시드에 획수 오류가 7자 있었고(丁 蠶 藏 運 遠 選 朗) 이 검사를 만들며 찾았다.
		 */
		for (const [ch, strokes] of Object.entries(STROKES)) {
			expect(STROKE_COUNT.has(ch), `${ch} 이 시드에 없다`).toBe(true);
			expect(strokes.length, `${ch} 의 획수`).toBe(STROKE_COUNT.get(ch));
		}
	});

	it('모든 좌표가 글자 상자 안에 있다', () => {
		for (const [ch, strokes] of Object.entries(STROKES)) {
			strokes.forEach((stroke, i) => {
				for (const [x, y] of stroke) {
					expect(x, `${ch} ${i + 1}획 x`).toBeGreaterThanOrEqual(0);
					expect(x, `${ch} ${i + 1}획 x`).toBeLessThanOrEqual(100);
					expect(y, `${ch} ${i + 1}획 y`).toBeGreaterThanOrEqual(0);
					expect(y, `${ch} ${i + 1}획 y`).toBeLessThanOrEqual(100);
				}
			});
		}
	});

	it('길이가 0 인 획이 없다 — 그으래도 통과가 안 되는 획은 함정이다', () => {
		for (const [ch, strokes] of Object.entries(STROKES)) {
			strokes.forEach((stroke, i) => {
				expect(stroke.length, `${ch} ${i + 1}획: 점이 모자라다`).toBeGreaterThanOrEqual(2);
				expect(strokeLength(stroke), `${ch} ${i + 1}획: 길이가 0`).toBeGreaterThan(0);
			});
		}
	});

	it('첫 획이 대체로 위쪽이나 왼쪽에서 시작한다', () => {
		/*
		 * 필순 원칙(위→아래, 왼→오른)의 아주 느슨한 확인이다.
		 * 좌표를 뒤집어 넣는 실수를 잡는 용도이지 자형 검증이 아니다.
		 */
		for (const [ch, strokes] of Object.entries(STROKES)) {
			const [x, y] = strokes[0][0];
			expect(x < 70 || y < 70, `${ch} 의 첫 획이 오른쪽 아래에서 시작한다 (${x},${y})`).toBe(true);
		}
	});

	/**
	 * 획순은 **앞 마을부터 빈틈없이** 덮어야 한다.
	 *
	 * 한 마을 안에서 어떤 글자는 획을 긋고 어떤 글자는 흙을 파면, 아이는 게임이 아니라
	 * 화면 사용법을 배우게 된다. 처음에 15자만 있었을 때 실제로 그랬다 —
	 * 아이가 이미 배운 자리를 지나가 버려서 획순 화면을 한 번도 못 만났다.
	 *
	 * 뒤 마을로 넓힐 때는 그 마을을 통째로 덮고 여기 숫자를 올린다.
	 */
	const COVERED_AREAS = [1, 2];
	/** 통째로 덮지 못한 글자와 그 이유 (stroke-data.ts 머리말에 사유가 적혀 있다) */
	const EXCEPTIONS = new Set(['萬']);

	it('덮은 마을은 통째로 덮고, 그 바깥 글자는 넣지 않는다', () => {
		const inCovered = new Set(
			HANJA_SEED.filter((h) => COVERED_AREAS.includes(h.areaId)).map((h) => h.character)
		);
		for (const ch of Object.keys(STROKES)) {
			expect(inCovered.has(ch), `${ch} 은 획순을 덮기로 한 마을 글자가 아니다`).toBe(true);
		}
		const missing = [...inCovered].filter((ch) => !STROKES[ch] && !EXCEPTIONS.has(ch));
		expect(missing, `획순이 빠진 글자가 있다: ${missing.join(' ')}`).toEqual([]);
	});

	it('strokesOf 는 없는 글자에 null 을 준다 — 그 글자는 흙을 판다', () => {
		expect(strokesOf('一')).not.toBeNull();
		expect(strokesOf('龍')).toBeNull();
	});
});

describe('resample', () => {
	it('언제나 같은 개수의 표본을 낸다', () => {
		expect(
			resample([
				[0, 0],
				[100, 0]
			])
		).toHaveLength(SAMPLES);
		expect(
			resample([
				[0, 0],
				[50, 50],
				[100, 0]
			])
		).toHaveLength(SAMPLES);
	});

	it('양 끝을 포함한다', () => {
		const s = resample([
			[10, 20],
			[90, 20]
		]);
		expect(s[0][0]).toBeCloseTo(10, 1);
		expect(s[s.length - 1][0]).toBeCloseTo(90, 1);
	});

	it('같은 간격으로 찍는다', () => {
		const s = resample([
			[0, 0],
			[100, 0]
		]);
		const gaps = s.slice(1).map((p, i) => p[0] - s[i][0]);
		for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 1);
	});
});

describe('matchStroke', () => {
	const line: [number, number][] = [
		[10, 50],
		[90, 50]
	];

	/** 직선을 따라가는 손가락 궤적 */
	function trace(from: number, to: number, y = 50): [number, number][] {
		const out: [number, number][] = [];
		const step = from < to ? 4 : -4;
		for (let x = from; step > 0 ? x <= to : x >= to; x += step) out.push([x, y]);
		return out;
	}

	it('그대로 따라 그으면 통과한다', () => {
		expect(matchStroke(trace(10, 90), line).passed).toBe(true);
	});

	it('거꾸로 그으면 통과가 아니다', () => {
		const m = matchStroke(trace(90, 10), line);
		expect(m.covered).toBeGreaterThan(0.9);
		expect(m.forward).toBe(false);
		expect(m.passed).toBe(false);
	});

	it('절반만 그으면 통과가 아니다', () => {
		expect(matchStroke(trace(10, 45), line).passed).toBe(false);
	});

	it('손이 조금 흔들려도 통과한다 — 저학년의 손은 정확하지 않다', () => {
		const wobbly = trace(10, 90).map(([x], i) => [x, 50 + (i % 3) * 6 - 6] as [number, number]);
		expect(matchStroke(wobbly, line).passed).toBe(true);
	});

	it('통로 밖을 문지르면 통과가 아니다', () => {
		expect(matchStroke(trace(10, 90, 50 + CORRIDOR_R * 2), line).passed).toBe(false);
	});

	it('아무 데도 안 닿으면 0 이다', () => {
		expect(matchStroke([[5, 5]], line).covered).toBe(0);
	});

	it('점획은 닿기만 하면 되고 방향을 묻지 않는다', () => {
		const dot: [number, number][] = [
			[50, 50],
			[52, 52]
		];
		expect(matchStroke([[51, 51]], dot).passed).toBe(true);
	});

	it('실제 글자의 각 획을 그 획대로 그으면 전부 통과한다', () => {
		for (const [ch, strokes] of Object.entries(STROKES)) {
			strokes.forEach((stroke, i) => {
				// 중심선을 촘촘히 따라가는 완벽한 손가락
				const path = resample(stroke, 40);
				const m = matchStroke(path, stroke);
				expect(m.passed, `${ch} ${i + 1}획을 그대로 그었는데 통과가 아니다`).toBe(true);
			});
		}
	});
});
