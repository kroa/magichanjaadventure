import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { grantRewards } from '$lib/server/game/rewards';
import { EXP_REWARD } from '$lib/game/exp';
import { sealLimitOf, tallyFor } from '$lib/server/db/battle';
import { countStars } from '$lib/game/seals';

/**
 * 대결 결과 기록 + 보상.
 *
 * 클라이언트가 승패를 주장하지만, **보상은 서버가 재계산한다.**
 * 검증 가능한 근거는 battle_seals 다: 이 세션에서 실제로 깨뜨린 봉인 수를 DB 에서 세고,
 * 봉인을 다 깨지 못했으면 승리로 인정하지 않는다.
 *
 * 예전에는 quiz_results 의 정답 수를 근거로 삼았다. 대결이 합체로 바뀌면서
 * 그 표에는 아무것도 안 남게 되었고, 그대로 두면 **모든 대결이 패배로 기록되고 보상이 0** 이 된다.
 * 에러가 나지 않아 조용히 망가지는 종류라, 이 파일과 화면은 반드시 함께 배포해야 한다.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, '로그인이 필요해요.');
	const db = getDb(platform);

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, '요청을 이해할 수 없어요.');

	const {
		sessionKey,
		npcId,
		areaId,
		playerHpLeft,
		enemyHpLeft,
		sealCount,
		discoveredNew,
		durationMs,
		claimedWin
	} = body as {
		sessionKey: string;
		npcId: string;
		areaId: number;
		playerHpLeft: number;
		enemyHpLeft: number;
		sealCount: number;
		discoveredNew: boolean;
		durationMs: number;
		claimedWin: boolean;
	};

	if (typeof sessionKey !== 'string' || !sessionKey) error(400, '세션 정보가 없어요.');

	// 이 대결 세션에서 실제로 깨뜨린 봉인을 DB 에서 센다
	const { broken, firstTry } = await tallyFor(db, locals.user.id, sessionKey);

	/*
	 * **총 봉인 수는 세션 키에서 읽는다. 클라이언트가 보낸 값을 믿지 않는다.**
	 *
	 * 예전에는 `sealCount` 를 그대로 썼다. 봉인 하나만 깨고 `sealCount: 1` 을 보내면
	 * 승리로 기록됐고, 이번 회차에 지역 해금 조건이 "직전 마을 보스 격파" 가 되면서
	 * 그 구멍이 **게임 진행을 통째로 건너뛰는 길**이 됐다.
	 */
	const totalSeals = sealLimitOf(sessionKey);
	void sealCount;

	const correct = broken;
	const wrong = 0;

	// 봉인을 다 깨야 승리다. 클라이언트 주장만으로는 인정하지 않는다
	const won = claimedWin === true && totalSeals > 0 && broken >= totalSeals;

	const stars = countStars({
		brokenCount: broken,
		totalSeals,
		firstTryCount: firstTry,
		discoveredNew: discoveredNew === true
	});

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
			firstTry,
			won ? EXP_REWARD.battleWin : 0,
			Math.max(0, Math.floor(durationMs ?? 0)),
			now
		)
		.run();

	/*
	 * 별은 전부 가점이다 — 도움을 썼다고 깎지 않는다.
	 * 그래서 보석도 "별이 많으면 더" 이지 "실수하면 덜" 이 아니다.
	 */
	const reward = won
		? await grantRewards(db, locals.user.id, {
				expGained: EXP_REWARD.battleWin,
				gemsGained: 5 + stars,
				comboReached: firstTry,
				battleWon: true
			})
		: null;

	return json({ won, correct, wrong, stars, broken, firstTry, reward });
};
