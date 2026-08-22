/**
 * 하늘 배경의 색 정지점.
 *
 * `SkyBackground.svelte` 와 대비 검사가 **같은 배열을 읽는다.**
 * 값을 따로 두면 검사가 자기 자신을 채점하게 되어, 하늘을 바꿔도 아무 말을 안 한다.
 *
 * 이 하늘은 `position: fixed; z-index: -1` 로 body 배경을 완전히 덮으므로,
 * 그 위에 직접 얹히는 글자는 전부 이 색들과 겨룬다.
 */

/** 낮(기본) 하늘 — 위에서 아래로 */
export const SKY_STOPS = [
	'#2a2360',
	'#463a8f',
	'#7a5fae',
	'#c98fb0',
	'#f5b98a',
	'#ffd9a8'
] as const;

/** 보스전의 더 깊은 밤 */
export const NIGHT_STOPS = ['#140f36', '#241a55', '#3d2c72', '#6b4a86'] as const;

/** 하늘 위에 직접 얹는 글자색 (`.on-sky` 유틸과 같아야 한다) */
export const ON_SKY_TEXT = '#ffffff';

/**
 * 그 글자의 사방 외곽선 색.
 *
 * 하늘이 위는 남색이고 아래는 노을빛이라 **한 가지 색으로는 전 구간을 못 덮는다.**
 * 흰 채우기는 어두운 구간에서, 진한 외곽선은 밝은 구간에서 글자를 살린다.
 * 그래서 판정 기준도 "둘 중 하나가 충분한가" 여야 한다.
 */
export const ON_SKY_OUTLINE = '#2b1a66';

function channel(v: number): number {
	const c = v / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
	const h = hex.replace('#', '');
	const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
	const r = parseInt(full.slice(0, 2), 16);
	const g = parseInt(full.slice(2, 4), 16);
	const b = parseInt(full.slice(4, 6), 16);
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 대비비 (1 ~ 21) */
export function contrastRatio(a: string, b: string): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	const [hi, lo] = la > lb ? [la, lb] : [lb, la];
	return (hi + 0.05) / (lo + 0.05);
}

/** 이 글자색이 하늘의 모든 구간에서 갖는 **최악** 대비 */
export function worstContrastOnSky(
	text: string,
	stops: readonly string[] = SKY_STOPS
): { ratio: number; against: string } {
	let worst = { ratio: Number.POSITIVE_INFINITY, against: stops[0] };
	for (const stop of stops) {
		const ratio = contrastRatio(text, stop);
		if (ratio < worst.ratio) worst = { ratio, against: stop };
	}
	return worst;
}

/**
 * 채우기와 외곽선 중 **더 잘 보이는 쪽**의 대비.
 *
 * 외곽선이 있는 글자를 채우기 색만으로 재면 노을 구간에서 1.33:1 이 나오는데,
 * 실제 화면에서는 진한 외곽선 덕에 읽힌다. 반대로 남색 구간에서는 외곽선이 묻히고
 * 흰 채우기가 일한다. 두 색 중 나은 쪽으로 재는 것이 실제와 맞다.
 */
export function outlinedContrastOnSky(
	stops: readonly string[] = SKY_STOPS,
	text: string = ON_SKY_TEXT,
	outline: string = ON_SKY_OUTLINE
): { ratio: number; against: string } {
	let worst = { ratio: Number.POSITIVE_INFINITY, against: stops[0] };
	for (const stop of stops) {
		const ratio = Math.max(contrastRatio(text, stop), contrastRatio(outline, stop));
		if (ratio < worst.ratio) worst = { ratio, against: stop };
	}
	return worst;
}
