import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { learnedCountByArea, listAreaHanja } from '$lib/server/db/hanja';
import { evaluateAreaUnlocks, TOTAL_HANJA } from '$lib/game/areas';
import { expToNextLevel } from '$lib/game/exp';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.characterClass) redirect(303, '/character');

	const db = getDb(platform);
	const byArea = await learnedCountByArea(db, locals.user.id);
	const areas = evaluateAreaUnlocks(locals.user.level, byArea);

	const requested = Number(url.searchParams.get('area'));
	const areaId = areas.some((a) => a.area.id === requested) ? requested : 1;

	/*
	 * 1000자를 한 번에 보내지 않고 지역 단위로 나눠 보낸다.
	 * (성능 예산: 한자 데이터를 클라이언트에 전량 전송 금지 — docs/00-ARCHITECTURE.md §8)
	 */
	const hanja = await listAreaHanja(db, areaId, locals.user.id);
	const learnedTotal = Object.values(byArea).reduce((sum, n) => sum + n, 0);

	return {
		user: locals.user,
		expToNext: expToNextLevel(locals.user.level),
		areas: areas.map((a) => ({
			id: a.area.id,
			name: a.area.name,
			emoji: a.area.emoji,
			grade: a.area.grade,
			unlocked: a.unlocked,
			learned: a.learned,
			total: a.area.hanjaCount
		})),
		areaId,
		hanja,
		learnedTotal,
		grandTotal: TOTAL_HANJA
	};
};
