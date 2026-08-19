import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { learnedCountByArea, totalLearned } from '$lib/server/db/hanja';
import { evaluateAreaUnlocks, TOTAL_HANJA } from '$lib/game/areas';
import { expToNextLevel } from '$lib/game/exp';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.characterClass) redirect(303, '/character');

	const db = getDb(platform);
	const user = locals.user;

	const [byArea, learned] = await Promise.all([
		learnedCountByArea(db, user.id),
		totalLearned(db, user.id)
	]);

	const areas = evaluateAreaUnlocks(user.level, byArea);

	// 다음에 갈 곳: 열려 있으면서 아직 다 못 모은 첫 지역
	const nextArea = areas.find((a) => a.unlocked && a.learned < a.area.hanjaCount) ?? areas[0];

	return {
		user,
		areas,
		learned,
		total: TOTAL_HANJA,
		expToNext: expToNextLevel(user.level),
		nextAreaId: nextArea.area.id
	};
};
