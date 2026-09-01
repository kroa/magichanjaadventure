import type { FusionRecipe } from './fusion';

/**
 * 보스의 봉인 — 합체 대결의 문제 생성기.
 *
 * **아이는 질 수 없다.** 이건 실수가 아니라 설계다.
 * 대결은 "아는지 시험하는 자리" 가 아니라 "배운 걸 써 보는 자리" 이고,
 * 8세에게 패배 화면은 배움이 아니라 그냥 앱을 끄는 이유다.
 * 긴장은 별(⭐)로 준다 — 못 하면 잃는 것이 아니라, 잘하면 더 얻는 것으로.
 *
 * **막다른 길을 데이터가 아니라 구조로 막는다.**
 * 판에 흩어 놓는 조각을 "아이가 배운 것" 이 아니라 **"이번 봉인이 요구하는 부품"** 으로 채운다.
 * 그래서 정답 부품은 아이가 몇 자를 알든 항상 판 위에 있다.
 * 처음 온 아이도 대결이 성립하고, 부품이 없어 영영 못 깨는 봉인이 아예 생기지 않는다.
 * (조각을 고르는 것은 서버 쪽 `planFor` 다 — 여기서는 봉인만 정한다.)
 *
 * 상태를 저장하지 않는다. 봉인은 씨앗 문자열에서 **매번 똑같이 유도**되므로
 * 서버가 언제든 다시 계산해 검증할 수 있다.
 */

import { rngFrom, shuffled } from './rng';

export const SEALS_PER_BATTLE = 3;

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
