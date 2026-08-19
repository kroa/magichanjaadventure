import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { pickQuizPool, pickDistractors } from '$lib/server/db/hanja';
import { buildQuestion, pickQuestionType, type Question } from '$lib/game/quiz';
import { expToNextLevel } from '$lib/game/exp';

const QUESTION_COUNT = 10;

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.characterClass) redirect(303, '/character');

	const db = getDb(platform);
	const pool = await pickQuizPool(db, locals.user.id, QUESTION_COUNT);

	const questions: Question[] = [];
	for (const hanja of pool) {
		const distractors = await pickDistractors(db, hanja.areaId, hanja.id, 6);
		const type = pickQuestionType(hanja, 0);
		const question = buildQuestion(hanja, distractors, type);
		if (question) questions.push(question);
	}

	return {
		user: locals.user,
		expToNext: expToNextLevel(locals.user.level),
		questions,
		sessionKey: crypto.randomUUID()
	};
};
