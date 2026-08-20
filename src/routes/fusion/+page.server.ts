import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { loadWorkshop, remainingFor, tryFuse } from '$lib/server/db/fusion';
import { grantRewards } from '$lib/server/game/rewards';
import { EXP_REWARD } from '$lib/game/exp';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.characterClass) redirect(303, '/character');

	const db = getDb(platform);
	const workshop = await loadWorkshop(db, locals.user.id);

	return {
		user: locals.user,
		parts: workshop.parts,
		lockedPartCount: workshop.lockedPartCount,
		discovered: workshop.discovered,
		remaining: remainingFor(
			workshop.parts.map((p) => p.character),
			workshop.discovered
		)
	};
};

export const actions: Actions = {
	/**
	 * 합체 시도.
	 *
	 * 실패를 오류로 취급하지 않는다. `ok: false` 는 "아무 일도 일어나지 않았다" 는 뜻이고,
	 * 화면은 부품을 원래 자리로 되돌릴 뿐 아무 말도 하지 않는다.
	 * 여기서 "틀렸어요" 를 띄우는 순간 이 화면은 다시 시험지가 된다.
	 */
	fuse: async ({ request, platform, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const db = getDb(platform);

		const form = await request.formData();
		const raw = form.getAll('part').map(String);
		// 부품이 터무니없이 많으면 그냥 실패로 본다 (조합표에 3개 넘는 것이 없다)
		if (raw.length < 2 || raw.length > 4) return { ok: false as const, reason: 'no-recipe' };

		const outcome = await tryFuse(db, locals.user.id, raw);
		if (!outcome.ok) return { ok: false as const, reason: outcome.reason };

		const reward = outcome.alreadyKnown
			? null
			: await grantRewards(db, locals.user.id, { expGained: EXP_REWARD.newHanja });

		return {
			ok: true as const,
			character: outcome.result.character,
			reading: outcome.result.reading,
			meaning: outcome.result.meaning,
			story: outcome.story,
			alreadyKnown: outcome.alreadyKnown,
			reward
		};
	}
};
