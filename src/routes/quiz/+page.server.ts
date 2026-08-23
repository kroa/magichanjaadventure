import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { loadWorkshop, tryFuse } from '$lib/server/db/fusion';
import { classifyFocus, orderQuizRecipes } from '$lib/game/play';
import { expToNextLevel } from '$lib/game/exp';

/**
 * 복습 — **4지선다를 걷어냈다.**
 *
 * 예전에는 배운 한자로 객관식 문제를 만들어 냈다. 그건 시험이지 놀이가 아니고,
 * 대결·공방과 조작 방식도 달라서 아이가 화면마다 규칙을 새로 배워야 했다.
 *
 * 지금은 **이미 만들어 본 조합**의 조각을 판에 흩어 놓는다. 아이는 다시 밀어서 붙인다.
 * 같은 손동작으로 복습이 되고, 무엇을 만드는지 미리 알려 주지 않으니 인출 연습이 된다.
 */
export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.characterClass) redirect(303, '/character');

	const db = getDb(platform);
	const workshop = await loadWorkshop(db, locals.user.id);
	const owned = new Set(workshop.parts.map((p) => p.character));
	const discovered = new Set(workshop.discovered);
	const masteryOf = new Map(workshop.parts.map((p) => [p.character, p.mastery]));

	/*
	 * 이 판에 낼 조합. **`fuse` 액션이 같은 함수로 다시 유도해 검증한다.**
	 *
	 * `?r=` 은 회차다. 이게 없으면 아이가 몇 번을 다시 열어도 똑같은 여섯 조각을 받는다 —
	 * 조합에 안 쓰이는 950자에서는 언제나 같은 판이었다.
	 */
	const focus = url.searchParams.get('focus') ?? '';
	const round = Number(url.searchParams.get('r') ?? '0') || 0;
	const ordered = orderQuizRecipes(owned, discovered, focus, round);
	const related = focus ? ordered.filter((r) => r.parts.includes(focus) || r.result === focus) : [];

	return {
		user: locals.user,
		expToNext: expToNextLevel(locals.user.level),
		pieces: ordered
			.flatMap((r) => r.parts)
			.map((character, id) => ({
				id,
				character,
				mastery: masteryOf.get(character) ?? 0
			})),
		total: ordered.length,
		round,
		/**
		 * 이 글자를 두고 뭐라고 말해야 하는가.
		 *
		 * 예전에는 `focused: boolean` 이라, 관련 조합이 없으면 조용히 아무 판이나 냈다.
		 * 아이 입장에서는 "방금 배운 걸로" 라고 해 놓고 딴 게 나오는 것이라 헷갈린다.
		 */
		focusState: classifyFocus(focus, related.length),
		focus
	};
};

export const actions: Actions = {
	/**
	 * 조각 두 개를 붙인다.
	 *
	 * 판정은 서버가 한다. 아이가 정말 그 부품을 배웠는지까지 다시 확인하므로,
	 * 요청을 직접 만들어도 아무 한자나 가질 수 없다 (공방과 같은 규칙이다).
	 */
	fuse: async ({ request, platform, locals, url }) => {
		if (!locals.user) redirect(303, '/login');
		const db = getDb(platform);

		const form = await request.formData();
		const parts = form.getAll('part').map(String);
		if (parts.length < 2 || parts.length > 4) return { ok: false as const };

		/*
		 * **이 판의 목표를 먼저 유도한다.** 대결의 거절 규칙과 같은 구조다.
		 *
		 * `tryFuse` 보다 **앞서** 읽어야 한다 — 합체가 성공하면 결과 글자가 진도에 들어가
		 * `discovered` 가 바뀌고, 그러면 같은 회차인데도 순서가 달라져 방금 맞힌 것이
		 * 목표가 아니게 되는 어이없는 거절이 난다.
		 */
		const before = await loadWorkshop(db, locals.user.id);
		const round = Number(url.searchParams.get('r') ?? '0') || 0;
		const goals = orderQuizRecipes(
			new Set(before.parts.map((p) => p.character)),
			new Set(before.discovered),
			url.searchParams.get('focus') ?? '',
			round
		);

		const outcome = await tryFuse(db, locals.user.id, parts);
		if (!outcome.ok) return { ok: false as const, reason: outcome.reason };

		/*
		 * 예전에는 "되는 조합이면 무엇이든" 인정하고 조각을 지웠다. 그런데 판에 깔린
		 * 조각들끼리는 목표가 아닌 조합도 만들어진다 — 그걸 지워 버리면 남은 조각이
		 * 서로 안 붙어 **판을 영영 못 비운다.** 3조합 판 560가지 중 260가지(46%)에
		 * 그런 막다른 길이 있고, 실제로 도달 가능한 판 22개 중 3개가 그렇다.
		 * 힌트 로봇은 그 길로 안 가므로 CI 는 영원히 초록불이고 아이만 갇힌다.
		 *
		 * 목표가 아니어도 **한자는 진짜로 얻는다** — 탐색이 헛수고가 되면 안 된다.
		 */
		if (!goals.some((g) => g.result === outcome.result.character)) {
			return {
				ok: false as const,
				reason: 'not-target' as const,
				character: outcome.result.character
			};
		}

		return {
			ok: true as const,
			character: outcome.result.character,
			reading: outcome.result.reading,
			meaning: outcome.result.meaning,
			story: outcome.story
		};
	}
};
