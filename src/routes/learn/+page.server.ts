import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { learnedCountByArea, learnHanja, listUnlearned, getHanja } from '$lib/server/db/hanja';
import { evaluateAreaUnlocks } from '$lib/game/areas';
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
		hanja: upcoming[0] ?? null
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
