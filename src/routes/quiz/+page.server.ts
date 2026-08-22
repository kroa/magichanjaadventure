import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { loadWorkshop, tryFuse } from '$lib/server/db/fusion';
import { SEAL_RECIPES } from '$lib/game/fusion';
import { expToNextLevel } from '$lib/game/exp';

/** 한 판에 낼 조합 수 */
const ROUND_SIZE = 3;

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
	 * 만들 수 있는 조합 중에서 고른다.
	 * **이미 만들어 본 것을 먼저** 낸다 — 복습이 목적이므로 처음 보는 것보다 낫다.
	 */
	const makeable = SEAL_RECIPES.filter((r) => r.parts.every((p) => owned.has(p)));

	/*
	 * **방금 배운 글자와 상관있는 것부터 낸다.**
	 *
	 * 배우기 화면에서 "복습하기" 로 넘어오면 `?focus=一` 처럼 방금 배운 글자가 붙어 온다.
	 * 그걸 무시하고 아무거나 내면 아이는 "왜 딴 게 나오지?" 하고 만다 —
	 * 실제로 그 지적을 받았다.
	 */
	const focus = url.searchParams.get('focus') ?? '';
	const related = focus
		? makeable.filter((r) => r.parts.includes(focus) || r.result === focus)
		: [];
	const rest = makeable.filter((r) => !related.includes(r));

	const ordered = [
		...related,
		...rest.filter((r) => discovered.has(r.result)),
		...rest.filter((r) => !discovered.has(r.result))
	].slice(0, ROUND_SIZE);

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
		/** 방금 배운 글자로 만들 수 있는 것이 하나라도 있었는가 */
		focused: related.length > 0,
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
	fuse: async ({ request, platform, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const db = getDb(platform);

		const form = await request.formData();
		const parts = form.getAll('part').map(String);
		if (parts.length < 2 || parts.length > 4) return { ok: false as const };

		const outcome = await tryFuse(db, locals.user.id, parts);
		if (!outcome.ok) return { ok: false as const, reason: outcome.reason };

		return {
			ok: true as const,
			character: outcome.result.character,
			reading: outcome.result.reading,
			meaning: outcome.result.meaning,
			story: outcome.story
		};
	}
};
