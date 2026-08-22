import { allPartChars, type FusionRecipe } from './fusion';

/**
 * 보스의 봉인 — 합체 대결의 문제 생성기.
 *
 * **아이는 질 수 없다.** 이건 실수가 아니라 설계다.
 * 대결은 "아는지 시험하는 자리" 가 아니라 "배운 걸 써 보는 자리" 이고,
 * 8세에게 패배 화면은 배움이 아니라 그냥 앱을 끄는 이유다.
 * 긴장은 별(⭐)로 준다 — 못 하면 잃는 것이 아니라, 잘하면 더 얻는 것으로.
 *
 * **막다른 길을 데이터가 아니라 구조로 막는다.**
 * 부품 서랍을 "아이가 배운 것" 이 아니라 **"이번 봉인이 요구하는 부품 + 미끼"** 로 채운다.
 * 그래서 정답 부품은 아이가 몇 자를 알든 **항상 서랍에 있다.**
 * 처음 온 아이도 대결이 성립하고, 부품이 없어 영영 못 깨는 봉인이 아예 생기지 않는다.
 *
 * 상태를 저장하지 않는다. 봉인과 서랍은 씨앗 문자열에서 **매번 똑같이 유도**되므로
 * 서버가 언제든 다시 계산해 검증할 수 있다.
 * 퀴즈에서 "정답은 (hanjaId, questionType) 만으로 유도된다" 와 같은 방식이다.
 */

export const SEALS_PER_BATTLE = 3;

/** 부품 서랍 칸 수 */
export const TRAY_SIZE = 12;

/** 문자열에서 뽑아낸 결정론적 난수 발생기 (mulberry32) */
function rngFrom(seed: string): () => number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	let state = hash;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * 이 대결의 봉인을 정한다.
 *
 * `pool` 은 난이도로 걸러 둔 후보다 (부품이 아이가 갈 수 있는 지역 안에 있는 것).
 * 후보가 모자라면 있는 만큼만 낸다 — 봉인이 둘뿐인 대결도 대결이다.
 */
export function sealsFrom(
	seed: string,
	pool: readonly FusionRecipe[],
	count = SEALS_PER_BATTLE
): FusionRecipe[] {
	if (pool.length === 0) return [];
	// 순서를 못 박아야 서버가 다시 계산해도 같은 답이 나온다
	const stable = [...pool].sort((a, b) => a.result.localeCompare(b.result));
	return shuffled(stable, rngFrom(`${seed}:seals`)).slice(0, Math.min(count, stable.length));
}

/**
 * 부품 서랍을 만든다.
 *
 * **봉인이 요구하는 부품을 전부 넣는다.** 이것이 막다른 길을 없애는 핵심이다.
 * 나머지는 미끼로 채운다 — 미끼가 없으면 서랍이 곧 정답표가 되어 아무 생각 없이 눌러도 이긴다.
 *
 * 빌린 부품과 미끼를 화면에서 **구분하지 않는다.** 표식을 달면 그게 곧 정답 표시가 된다.
 */
export function trayFrom(seed: string, seals: readonly FusionRecipe[], size = TRAY_SIZE): string[] {
	const needed = [...new Set(seals.flatMap((s) => s.parts))];
	const decoyPool = allPartChars().filter((c) => !needed.includes(c));
	const rng = rngFrom(`${seed}:tray`);

	const decoys = shuffled(decoyPool, rng).slice(0, Math.max(0, size - needed.length));
	return shuffled([...needed, ...decoys], rng);
}

/**
 * 별을 센다. **전부 가점이다.**
 *
 * "힌트를 안 썼으면 별" 같은 감점형 조건을 일부러 피했다.
 * 도움을 청하는 데 값을 매기면 아이는 도움을 안 청하고 막힌 채 앉아 있는다.
 * 그래서 조건은 "한 번도 안 했다" 가 아니라 전부 "한 번은 해냈다" 쪽으로 세운다.
 */
export interface StarInput {
	brokenCount: number;
	totalSeals: number;
	/** 첫 시도에 바로 맞힌 봉인 수 */
	firstTryCount: number;
	/** 이번 판에 처음 만들어 본 한자가 있는가 */
	discoveredNew: boolean;
}

export function countStars(input: StarInput): number {
	let stars = 0;
	if (input.totalSeals > 0 && input.brokenCount >= input.totalSeals) stars += 1;
	if (input.firstTryCount >= 1) stars += 1;
	if (input.discoveredNew) stars += 1;
	return stars;
}

export const STAR_LABELS = [
	'봉인을 모두 풀었어요',
	'한 번에 맞힌 봉인이 있어요',
	'처음 만들어 본 한자가 있어요'
] as const;

/** 힌트 사다리의 꼭대기 (부품 둘 다 빛남) */
export const MAX_HINT = 2;
