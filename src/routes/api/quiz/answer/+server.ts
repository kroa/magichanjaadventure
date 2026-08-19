import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { getHanja, recordReview } from '$lib/server/db/hanja';
import { correctAnswerFor, type QuestionType, QUESTION_TYPES } from '$lib/game/quiz';
import { expForAnswer } from '$lib/game/exp';
import { grantRewards } from '$lib/server/game/rewards';

/**
 * 퀴즈 채점 — **서버 권위**.
 *
 * 클라이언트는 "어떤 문제에 무엇을 골랐는지"만 보낸다.
 * 정답 여부도, EXP 도 서버가 다시 계산한다. 보내온 점수는 쳐다보지도 않는다.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, '로그인이 필요해요.');
	const db = getDb(platform);

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, '요청을 이해할 수 없어요.');

	const { hanjaId, type, chosen, combo, answerMs, sessionKey } = body as {
		hanjaId: number;
		type: QuestionType;
		chosen: string;
		combo: number;
		answerMs?: number;
		sessionKey?: string;
	};

	if (!Number.isInteger(hanjaId) || !QUESTION_TYPES.includes(type) || typeof chosen !== 'string') {
		error(400, '요청 값이 올바르지 않아요.');
	}

	const hanja = await getHanja(db, hanjaId);
	if (!hanja) error(404, '한자를 찾을 수 없어요.');

	const answer = correctAnswerFor(hanja, type);
	if (answer === null) error(400, '이 한자로는 낼 수 없는 문제예요.');

	const isCorrect = chosen === answer;
	// 콤보도 서버가 다시 계산한다 (클라이언트 값은 상한만 참고)
	const safeCombo = isCorrect ? Math.max(1, Math.min(999, Math.floor(combo ?? 0) + 1)) : 0;

	const breakdown = expForAnswer({
		isCorrect,
		combo: safeCombo,
		answerMs: typeof answerMs === 'number' ? answerMs : undefined
	});

	const now = Date.now();
	await recordReview(db, locals.user.id, hanjaId, isCorrect, now);

	await db
		.prepare(
			`INSERT INTO quiz_results
			   (user_id, session_key, hanja_id, question_type, is_correct, combo_at, exp_gained, answer_ms, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			locals.user.id,
			String(sessionKey ?? 'unknown').slice(0, 64),
			hanjaId,
			type,
			isCorrect ? 1 : 0,
			safeCombo,
			breakdown.total,
			typeof answerMs === 'number' ? Math.max(0, Math.floor(answerMs)) : null,
			now
		)
		.run();

	const reward =
		breakdown.total > 0 || isCorrect
			? await grantRewards(db, locals.user.id, {
					expGained: breakdown.total,
					comboReached: safeCombo
				})
			: null;

	return json({
		isCorrect,
		answer,
		combo: safeCombo,
		breakdown,
		reward
	});
};
