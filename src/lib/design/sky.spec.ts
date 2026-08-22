import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
	contrastRatio,
	NIGHT_STOPS,
	ON_SKY_OUTLINE,
	ON_SKY_TEXT,
	outlinedContrastOnSky,
	SKY_STOPS,
	worstContrastOnSky
} from './sky';

/**
 * 하늘 위 글자가 읽히는가.
 *
 * 이 검사가 생긴 이유: 로그인·가입·캐릭터 선택의 제목이 `text-magic-700`(#5231bc)이었는데,
 * 그 위를 덮는 하늘의 첫 정지점이 #2a2360 이라 **실측 대비가 1.6:1** 이었다.
 * 저학년에게는 사실상 안 보이는 글자였고, 아무도 그걸 잡지 못했다 —
 * 코드베이스에 대비 검사 함수가 있긴 했는데 **어디서도 호출되지 않았다.**
 *
 * 브라우저 없이 도는 순수 계산이라, 하늘색을 바꾸는 순간 여기서 먼저 걸린다.
 */

const AA_LARGE = 3; // 큰 글자(제목) 하한
const AA_BODY = 4.5; // 본문 하한

describe('하늘 위 글자 대비', () => {
	it('외곽선까지 세면 낮 하늘 전 구간에서 읽힌다', () => {
		const worst = outlinedContrastOnSky(SKY_STOPS);
		expect(
			worst.ratio,
			`가장 나쁜 구간 ${worst.against} 에서 ${worst.ratio.toFixed(2)}:1`
		).toBeGreaterThanOrEqual(AA_BODY);
	});

	it('밤 하늘에서도 마찬가지다', () => {
		const worst = outlinedContrastOnSky(NIGHT_STOPS);
		expect(worst.ratio, `가장 나쁜 구간 ${worst.against}`).toBeGreaterThanOrEqual(AA_BODY);
	});

	it('외곽선이 없으면 노을 구간에서 흰 글자만으로는 부족하다', () => {
		/*
		 * 이 검사가 `.on-sky` 에서 text-shadow 를 빼면 안 되는 이유를 못 박는다.
		 * 흰 채우기 하나로는 하늘 아래쪽(#ffd9a8)에서 1.33:1 밖에 안 나온다.
		 */
		const fillOnly = worstContrastOnSky(ON_SKY_TEXT, SKY_STOPS);
		expect(fillOnly.ratio).toBeLessThan(AA_LARGE);
	});

	it('예전에 쓰던 보라 제목색은 실제로 못 읽는 수준이었다', () => {
		// 회귀 방지용 기록. 이 값이 좋아졌다면 하늘이 바뀐 것이니 위 두 검사를 다시 봐야 한다
		const old = worstContrastOnSky('#5231bc', SKY_STOPS);
		expect(old.ratio).toBeLessThan(AA_LARGE);
	});

	it('계산기가 맞다 — 흑백은 21:1, 같은 색은 1:1', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
		expect(contrastRatio('#7c5cff', '#7c5cff')).toBeCloseTo(1, 5);
	});
});

describe('하늘 상수가 실제 화면과 일치한다', () => {
	it('SkyBackground 가 같은 정지점을 쓴다', () => {
		/*
		 * 값을 두 곳에 두면 검사가 자기 자신을 채점하게 된다.
		 * 컴포넌트의 CSS 를 직접 읽어 색이 갈라지지 않았는지 본다.
		 */
		const css = readFileSync('src/lib/components/layout/SkyBackground.svelte', 'utf8');
		for (const stop of SKY_STOPS) {
			expect(css.toLowerCase(), `낮 하늘에 ${stop} 이 없다`).toContain(stop.toLowerCase());
		}
		for (const stop of NIGHT_STOPS) {
			expect(css.toLowerCase(), `밤 하늘에 ${stop} 이 없다`).toContain(stop.toLowerCase());
		}
	});

	it('.on-sky 유틸이 상수와 같은 글자색·외곽선을 쓴다', () => {
		const css = readFileSync('src/app.css', 'utf8');
		const block = css.slice(css.indexOf('.on-sky'), css.indexOf('.on-sky') + 200);
		expect(block).toContain('#fff');
		expect(block, '외곽선을 빼면 노을 구간에서 안 읽힌다').toContain('--shadow-text-on-sky');
		expect(ON_SKY_TEXT.toLowerCase()).toBe('#ffffff');
		expect(css.toLowerCase()).toContain(ON_SKY_OUTLINE.toLowerCase());
	});
});
