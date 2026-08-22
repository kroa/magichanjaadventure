import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { learnedCountByArea, learnHanja, listUnlearned, getHanja } from '$lib/server/db/hanja';
import { evaluateAreaUnlocks } from '$lib/game/areas';
import { allPartChars } from '$lib/game/fusion';
import { pickNextPlay } from '$lib/game/play';
import { grantRewards } from '$lib/server/game/rewards';
import { EXP_REWARD } from '$lib/game/exp';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.characterClass) redirect(303, '/character');

	const db = getDb(platform);
	const byArea = await learnedCountByArea(db, locals.user.id);
	const areas = evaluateAreaUnlocks(locals.user.level, byArea);

	const requested = Number(url.searchParams.get('area'));
	const openAreas = areas.filter((a) => a.unlocked);
	const chosen =
		openAreas.find((a) => a.area.id === requested) ??
		openAreas.find((a) => a.learned < a.area.hanjaCount) ??
		openAreas[openAreas.length - 1];

	const upcoming = await listUnlearned(db, locals.user.id, chosen.area.id, 1);
	const hanja = upcoming[0] ?? null;

	/*
	 * 이 글자를 배우고 나면 **어디로 보낼 것인가.**
	 *
	 * 예전에는 무조건 `/quiz?focus=이 글자` 로 보내면서 "방금 배운 걸로 복습" 이라고 썼다.
	 * 그 약속을 지킬 수 있는 글자는 1000자 중 26자뿐이었다.
	 * 여기서 서버가 미리 판단해 문구와 목적지를 맞춘다.
	 *
	 * loadWorkshop 을 쓰지 않는 이유: 전체 진도를 훑고 hanjas 를 두 번 더 읽는다.
	 * 배우기 화면은 글자마다 load 가 다시 도므로 26자짜리 한 쿼리로 끝내는 편이 맞다.
	 */
	const parts = allPartChars();
	const { results: ownedRows } = await db
		.prepare(
			`SELECT h.character FROM user_hanja_progress p
			 JOIN hanjas h ON h.id = p.hanja_id
			 WHERE p.user_id = ? AND h.character IN (${parts.map(() => '?').join(',')})`
		)
		.bind(locals.user.id, ...parts)
		.all<{ character: string }>();

	const owned = new Set(ownedRows.map((r) => r.character));
	// 아직 안 배운 상태지만, 곧 배울 것이므로 미리 넣고 계산한다
	if (hanja) owned.add(hanja.character);

	return {
		user: locals.user,
		areas: openAreas.map((a) => ({
			id: a.area.id,
			name: a.area.name,
			emoji: a.area.emoji,
			learned: a.learned,
			total: a.area.hanjaCount
		})),
		areaId: chosen.area.id,
		areaName: chosen.area.name,
		areaDone: upcoming.length === 0,
		hanja,
		nextPlay: hanja ? pickNextPlay(owned, hanja.character) : null
	};
};

export const actions: Actions = {
	/** 한자 획득 — 보상은 전부 서버가 계산한다. */
	learn: async ({ request, platform, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const db = getDb(platform);

		const form = await request.formData();
		const hanjaId = Number(form.get('hanjaId'));
		if (!Number.isInteger(hanjaId)) return { ok: false as const };

		const hanja = await getHanja(db, hanjaId);
		if (!hanja) return { ok: false as const };

		const isNew = await learnHanja(db, locals.user.id, hanjaId);
		if (!isNew) return { ok: true as const, alreadyKnown: true, reward: null };

		const reward = await grantRewards(db, locals.user.id, {
			expGained: EXP_REWARD.newHanja
		});

		return { ok: true as const, alreadyKnown: false, reward };
	}
};
