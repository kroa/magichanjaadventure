import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { learnedCountByArea } from '$lib/server/db/hanja';
import { bossWinAreas } from '$lib/server/db/battle';
import { evaluateAreaUnlocks, getArea } from '$lib/game/areas';
import { expToNextLevel } from '$lib/game/exp';
import { statsFor } from '$lib/server/db/shop';
import { planFor, sealLimitFor } from '$lib/server/db/battle';
import { loadWorkshop } from '$lib/server/db/fusion';

/**
 * 합체 대결.
 *
 * 4지선다를 걷어내고 **보스의 봉인을 합체로 깨는** 구조로 바꿨다.
 * 아이가 몇 자를 배웠는지와 무관하게 대결이 성립한다 — 부품 서랍이 봉인에서 유도되기 때문이다.
 * 그래서 "배운 게 없어서 못 들어가는" 빈 화면 분기가 아예 없다.
 */
export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.characterClass) redirect(303, '/character');

	const db = getDb(platform);
	const [byArea, bossWins] = await Promise.all([
		learnedCountByArea(db, locals.user.id),
		bossWinAreas(db, locals.user.id)
	]);
	const areas = evaluateAreaUnlocks(locals.user.level, byArea, bossWins);

	const requested = Number(url.searchParams.get('area'));
	const open = areas.filter((a) => a.unlocked);
	const chosen = open.find((a) => a.area.id === requested) ?? open[open.length - 1];
	const area = getArea(chosen.area.id)!;

	/*
	 * 세션 키를 **서버가 발급한다.**
	 * 봉인은 이 키에서 유도되므로, 클라이언트가 키를 고르게 두면
	 * 마음에 드는 봉인이 나올 때까지 키를 바꿔 볼 수 있다.
	 */
	const sessionKey = crypto.randomUUID();

	/*
	 * 아직 한 번도 합체해 본 적 없는 아이에게는 봉인 하나만 내고 손 시범을 보인다.
	 * 무엇을 하는 화면인지 **글이 아니라 몸짓으로** 알려 주기 위해서다.
	 */
	const workshop = await loadWorkshop(db, locals.user.id);
	const discovered = workshop.discovered.length;
	const plan = await planFor(db, locals.user.id, sessionKey, area.id, sealLimitFor(discovered));

	// 장비 보너스가 더해진 최종 능력치 (서버에서 계산한다)
	const stats = await statsFor(db, locals.user.id, locals.user.characterClass);

	return {
		user: locals.user,
		expToNext: expToNextLevel(locals.user.level),
		sessionKey,
		area: {
			id: area.id,
			name: area.name,
			emoji: area.emoji,
			sky: area.sky,
			accent: area.accent,
			boss: area.boss
		},
		areas: open.map((a) => ({ id: a.area.id, name: a.area.name, emoji: a.area.emoji })),
		seals: plan.seals,
		pieces: plan.pieces,
		showDemo: discovered === 0,
		playerHp: stats.hp,
		playerAttack: stats.attack
	};
};
