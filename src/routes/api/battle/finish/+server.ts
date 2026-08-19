import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { grantRewards } from '$lib/server/game/rewards';
import { EXP_REWARD } from '$lib/game/exp';

/**
 * 대결 결과 기록 + 보상.
 *
 * 클라이언트가 승패를 주장하지만, **보상은 서버가 재계산한다.**
 * 검증 가능한 근거는 quiz_results 다: 이 세션에서 실제로 맞힌 문제 수를 DB 에서 세고,
 * 그 수가 승리에 필요한 최소치를 넘지 못하면 승리로 인정하지 않는다.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, '로그인이 필요해요.');
	const db = getDb(platform);

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, '요청을 이해할 수 없어요.');

	const { sessionKey, npcId, areaId, playerHpLeft, enemyHpLeft, maxCombo, durationMs, claimedWin } =
		body as {
			sessionKey: string;
			npcId: string;
			areaId: number;
			playerHpLeft: number;
			enemyHpLeft: number;
			maxCombo: number;
			durationMs: number;
			claimedWin: boolean;
		};

	if (typeof sessionKey !== 'string' || !sessionKey) error(400, '세션 정보가 없어요.');

	// 이 대결 세션에서 실제로 맞힌/틀린 수를 DB 에서 센다
	const tally = await db
		.prepare(
			`SELECT
			   SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct,
			   SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS wrong
			 FROM quiz_results WHERE user_id = ? AND session_key = ?`
		)
		.bind(locals.user.id, sessionKey.slice(0, 64))
		.first<{ correct: number | null; wrong: number | null }>();

	const correct = tally?.correct ?? 0;
	const wrong = tally?.wrong ?? 0;

	// 적을 쓰러뜨렸다고 주장하려면 실제 정답 기록이 있어야 한다
	const won = claimedWin === true && enemyHpLeft <= 0 && correct > 0;

	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO battle_records
			   (user_id, npc_id, area_id, result, player_hp_left, enemy_hp_left,
			    correct_count, wrong_count, max_combo, exp_gained, duration_ms, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			locals.user.id,
			String(npcId ?? 'unknown').slice(0, 64),
			Number.isInteger(areaId) ? areaId : 1,
			won ? 'win' : 'lose',
			Math.max(0, Math.floor(playerHpLeft ?? 0)),
			Math.max(0, Math.floor(enemyHpLeft ?? 0)),
			correct,
			wrong,
			Math.max(0, Math.floor(maxCombo ?? 0)),
			won ? EXP_REWARD.battleWin : 0,
			Math.max(0, Math.floor(durationMs ?? 0)),
			now
		)
		.run();

	const reward = won
		? await grantRewards(db, locals.user.id, {
				expGained: EXP_REWARD.battleWin,
				gemsGained: 5,
				comboReached: Math.max(0, Math.floor(maxCombo ?? 0)),
				battleWon: true
			})
		: null;

	return json({ won, correct, wrong, reward });
};
