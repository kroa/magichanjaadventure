import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { learnedCountByArea, pickQuizPool, pickDistractors } from '$lib/server/db/hanja';
import { evaluateAreaUnlocks, getArea } from '$lib/game/areas';
import { buildQuestion, pickQuestionType, type Question } from '$lib/game/quiz';
import { expToNextLevel } from '$lib/game/exp';
import { statsFor } from '$lib/server/db/shop';

const BATTLE_QUESTIONS = 8;

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.characterClass) redirect(303, '/character');

	const db = getDb(platform);
	const byArea = await learnedCountByArea(db, locals.user.id);
	const areas = evaluateAreaUnlocks(locals.user.level, byArea);

	const requested = Number(url.searchParams.get('area'));
	const open = areas.filter((a) => a.unlocked);
	const chosen = open.find((a) => a.area.id === requested) ?? open[open.length - 1];
	const area = getArea(chosen.area.id)!;

	const pool = await pickQuizPool(db, locals.user.id, BATTLE_QUESTIONS);
	const questions: Question[] = [];
	for (const hanja of pool) {
		const distractors = await pickDistractors(db, hanja.areaId, hanja.id, 6);
		const question = buildQuestion(hanja, distractors, pickQuestionType(hanja, 3));
		if (question) questions.push(question);
	}

	// 장비 보너스가 더해진 최종 능력치 (서버에서 계산한다)
	const stats = await statsFor(db, locals.user.id, locals.user.characterClass);
	// 문제 수 × 공격력보다 적의 HP 를 조금 낮게 잡는다.
	// 몇 번 틀려도 이길 수 있어야 아이가 다시 도전한다.
	const enemyHp = Math.round(stats.attack * BATTLE_QUESTIONS * 0.72);

	return {
		user: locals.user,
		expToNext: expToNextLevel(locals.user.level),
		area: {
			id: area.id,
			name: area.name,
			emoji: area.emoji,
			sky: area.sky,
			accent: area.accent,
			boss: area.boss
		},
		areas: open.map((a) => ({ id: a.area.id, name: a.area.name, emoji: a.area.emoji })),
		questions,
		playerHp: stats.hp,
		playerAttack: stats.attack,
		enemyHp,
		enemyAttack: Math.max(6, Math.round(stats.hp / (BATTLE_QUESTIONS + 2)))
	};
};
