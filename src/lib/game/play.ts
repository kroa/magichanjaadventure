import { SEAL_RECIPES, FUSION_RECIPES, type FusionRecipe } from './fusion';

/**
 * 한 글자를 배운 **다음에 무엇을 하러 갈지** 를 고른다.
 *
 * 배우기 화면의 금색 버튼은 "방금 배운 걸로 복습" 이라고 쓰여 있었지만,
 * 실제로 그 약속을 지킬 수 있는 글자는 **1000자 중 26자뿐**이었다.
 * 조리법 24개가 건드리는 글자가 50자밖에 안 되기 때문이다.
 * 나머지 974번은 아이를 상관없는 판으로 보내 놓고 "방금 배운 걸로" 라고 말했다.
 * 사용자가 場 을 배우고 나서 그 어긋남을 곧바로 잡아냈다.
 *
 * **버튼을 숨기지는 않는다.** 981/1000 에서 놀이 입구가 사라지면 배우기 화면에는
 * "다음 한자 배우기" 만 남아 무한 러닝머신이 된다. 문구와 목적지만 정직하게 고른다.
 */

export type NextPlay =
	| {
			kind: 'ready';
			/** 같이 붙일 짝 (같은 글자 두 개면 자기 자신) */
			partner: string;
			result: string;
			/** 木+木 처럼 같은 글자를 두 번 쓰는 조합인가 */
			doubled: boolean;
			href: string;
	  }
	| { kind: 'review'; href: '/quiz' }
	| { kind: 'workshop'; href: '/fusion' };

/**
 * `owned` 는 **방금 배운 글자를 포함한** 보유 부품 집합이다.
 *
 * 절대 null 을 돌려주지 않는다 — 어떤 경우에도 갈 곳은 있어야 한다.
 */
export function pickNextPlay(owned: ReadonlySet<string>, justLearned: string): NextPlay {
	/*
	 * 복습판(/quiz)이 실제로 쓰는 표로 잰다.
	 * FUSION_RECIPES 로 재면 변형 부수 조합(人+木=休 등)까지 "된다" 고 말해 놓고
	 * 정작 판에는 안 깔린다 — 더 날카로운 거짓말이 된다.
	 */
	const ready = SEAL_RECIPES.find(
		(r) => r.parts.includes(justLearned) && r.parts.every((p) => owned.has(p))
	);

	if (ready) {
		const doubled = ready.parts.every((p) => p === justLearned);
		const partner = doubled
			? justLearned
			: (ready.parts.find((p) => p !== justLearned) ?? justLearned);
		return {
			kind: 'ready',
			partner,
			result: ready.result,
			doubled,
			href: `/quiz?focus=${encodeURIComponent(justLearned)}`
		};
	}

	// 방금 배운 것과는 상관없지만 복습할 거리는 있다. focus 를 아예 안 붙인다.
	if (SEAL_RECIPES.some((r) => r.parts.every((p) => owned.has(p)))) {
		return { kind: 'review', href: '/quiz' };
	}

	// 공방은 변형 부수 조합까지 내주므로 여기서 한 번 더 살아난다
	return { kind: 'workshop', href: '/fusion' };
}

/**
 * 복습판이 `?focus=글자` 로 열렸을 때, 그 글자를 두고 **뭐라고 말해야 하는가.**
 *
 * 예전에는 관련 조합이 있으면 `focused: true`, 없으면 조용히 아무 판이나 냈다.
 * 없을 때 아무 말도 안 하는 것이 문제였다 — 아이는 "왜 딴 게 나오지" 하고 만다.
 */
export type FocusState =
	/** focus 없이 정상적으로 들어왔다 (지도·네비 경로) */
	| 'none'
	/** 그 글자로 지금 만들 수 있는 조합이 판에 있다 */
	| 'ready'
	/** 판(SEAL)에는 없지만 공방(변형 부수 포함)에서는 만들 수 있다 */
	| 'workshop-only'
	/** 어느 조리법에도 안 쓰이는 글자다 (1000자 중 950자) */
	| 'not-a-part';

export function classifyFocus(focus: string, relatedCount: number): FocusState {
	if (!focus) return 'none';
	if (relatedCount > 0) return 'ready';
	/*
	 * 여기를 빠뜨리면 人·水·二·白 처럼 8급에서 일찍 배우는 글자에 대해
	 * "붙일 짝이 없다" 고 **거짓말**을 하게 된다 — 같은 순간 공방에서는 人+木=休 가 된다.
	 */
	const inWorkshop = FUSION_RECIPES.some((r) => r.parts.includes(focus) || r.result === focus);
	return inWorkshop ? 'workshop-only' : 'not-a-part';
}

/** 복습 한 판에 낼 조합 수 */
export const QUIZ_ROUND_SIZE = 3;

/**
 * 복습 판에 낼 조합을 고른다.
 *
 * **`load` 와 `fuse` 액션이 둘 다 이 함수를 부른다.** 서버가 같은 방식으로 두 번 유도해야
 * "이 판의 목표가 무엇이었나" 를 나중에도 알 수 있다 — 대결이 봉인을 씨앗에서 다시
 * 유도해 검증하는 것과 같은 구조다.
 *
 * `round` 는 판을 새로 열 때마다 오르는 회차다. 관련 조합(`related`)은 앞에 고정하고
 * 나머지만 회전시킨다. 셔플이 아니라 회전인 이유:
 *  - 결정론이다. 서버가 몇 번을 다시 계산해도 같은 답이 나온다
 *  - `related` 가 앞에 남으므로 "방금 배운 글자" 안내가 계속 정직하다
 */
export function orderQuizRecipes(
	owned: ReadonlySet<string>,
	discovered: ReadonlySet<string>,
	focus: string,
	round = 0,
	size = QUIZ_ROUND_SIZE
): FusionRecipe[] {
	const makeable = SEAL_RECIPES.filter((r) => r.parts.every((p) => owned.has(p)));

	const related = focus
		? makeable.filter((r) => r.parts.includes(focus) || r.result === focus)
		: [];
	const rest = makeable.filter((r) => !related.includes(r));

	// 이미 만들어 본 것을 먼저 — 복습이 목적이므로 처음 보는 것보다 낫다
	const sorted = [
		...rest.filter((r) => discovered.has(r.result)),
		...rest.filter((r) => !discovered.has(r.result))
	];

	/*
	 * 회전.
	 *
	 * 이게 없으면 아이가 몇 번을 다시 열어도 **똑같은 여섯 조각**을 받는다.
	 * 조합에 안 쓰이는 950자에서는 언제나 같은 판(明星林)이 나왔다 —
	 * 사용자가 본 日月日生木木 이 우연이 아니라 그 950자의 고정 화면이었다.
	 */
	const turn = sorted.length > 0 ? ((round % sorted.length) + sorted.length) % sorted.length : 0;
	const rotated = [...sorted.slice(turn), ...sorted.slice(0, turn)];

	return [...related, ...rotated].slice(0, size);
}
