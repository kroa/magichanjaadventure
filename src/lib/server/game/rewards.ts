import { applyExp, expToNextLevel, EXP_REWARD } from '$lib/game/exp';
import { totalLearned } from '../db/hanja';

/**
 * 보상 확정 — **서버 권위**.
 *
 * 클라이언트가 보낸 exp 값을 절대 신뢰하지 않는다.
 * 순수 계산은 `$lib/game/exp` 를 그대로 재사용하므로
 * "화면에 뜬 숫자 ≠ 저장된 숫자" 가 구조적으로 불가능하다.
 */

export interface RewardOutcome {
	expGained: number;
	gemsGained: number;
	level: number;
	exp: number;
	expToNext: number;
	levelsGained: number;
	/** 이 보상을 받기 전의 레벨. 화면이 역산하지 않도록 서버가 준다 */
	previousLevel: number;
	totalExp: number;
	gems: number;
	unlockedAchievements: UnlockedAchievement[];
}

export interface UnlockedAchievement {
	id: string;
	title: string;
	description: string;
	icon: string;
	expReward: number;
	gemReward: number;
}

interface UserProgressRow {
	level: number;
	exp: number;
	total_exp: number;
	gems: number;
	best_combo: number;
	streak_days: number;
}

/**
 * EXP/젬을 더하고 레벨업과 업적을 처리한 뒤 최종 상태를 돌려준다.
 *
 * 업적 보상 EXP 도 같은 곡선을 타므로, 업적으로 레벨업하는 경우까지 자연스럽게 처리된다.
 */
export async function grantRewards(
	db: D1Database,
	userId: string,
	input: { expGained: number; gemsGained?: number; comboReached?: number; battleWon?: boolean }
): Promise<RewardOutcome> {
	const now = Date.now();
	const user = await db
		.prepare('SELECT level, exp, total_exp, gems, best_combo, streak_days FROM users WHERE id = ?')
		.bind(userId)
		.first<UserProgressRow>();

	if (!user) throw new Error('사용자를 찾을 수 없습니다.');

	const combo = Math.max(user.best_combo, input.comboReached ?? 0);

	// 1차 적용 — 행동 보상
	const first = applyExp({ level: user.level, exp: user.exp }, input.expGained);
	let totalExp = user.total_exp + input.expGained;
	let gems = user.gems + (input.gemsGained ?? 0);

	// 업적 판정
	const unlocked = await evaluateAchievements(db, userId, {
		level: first.level,
		combo,
		battleWon: input.battleWon ?? false,
		streakDays: user.streak_days,
		now
	});

	let achievementExp = 0;
	for (const a of unlocked) {
		achievementExp += a.expReward;
		gems += a.gemReward;
	}

	/*
	 * **오른 레벨 수는 두 번을 더해야 한다.**
	 *
	 * 예전에는 `state = applyExp(...)` 로 통째로 덮어써서 `levelsGained` 가
	 * 2차 호출 값으로 리셋됐다. 그런데 `level_5`·`level_10`·`level_25` 업적은
	 * 조건이 '레벨' 이고 1차 적용 뒤의 레벨로 판정하므로, **레벨 5·10·25 에 도달하는
	 * 바로 그 요청에서 반드시 함께 터진다.** 업적 EXP 는 대개 한 레벨을 더 못 넘기니
	 * 2차 levelsGained 는 0 이고, 결국 `announce` 의 `levelsGained > 0` 이 false 가 되어
	 * **하필 그 세 레벨에서만 레벨업 연출이 통째로 사라졌다.**
	 */
	const second =
		achievementExp > 0 ? applyExp({ level: first.level, exp: first.exp }, achievementExp) : first;
	if (achievementExp > 0) totalExp += achievementExp;

	const levelsGained = first.levelsGained + (achievementExp > 0 ? second.levelsGained : 0);

	await db
		.prepare(
			`UPDATE users SET level = ?, exp = ?, total_exp = ?, gems = ?, best_combo = ?, updated_at = ?
			 WHERE id = ?`
		)
		.bind(second.level, second.exp, totalExp, gems, combo, now, userId)
		.run();

	return {
		expGained: input.expGained + achievementExp,
		gemsGained: (input.gemsGained ?? 0) + unlocked.reduce((sum, a) => sum + a.gemReward, 0),
		level: second.level,
		exp: second.exp,
		expToNext: expToNextLevel(second.level),
		levelsGained,
		/*
		 * 화면이 `level - levelsGained` 로 역산하지 않게 서버가 직접 준다.
		 * 역산은 두 번에 걸쳐 오른 경우에 어긋난다.
		 */
		previousLevel: user.level,
		totalExp,
		gems,
		unlockedAchievements: unlocked
	};
}

interface AchievementRow {
	id: string;
	title: string;
	description: string;
	icon: string;
	condition_type: string;
	condition_value: number;
	exp_reward: number;
	gem_reward: number;
}

/**
 * 아직 못 받은 업적 중 조건을 만족한 것을 찾아 지급한다.
 *
 * 조건 판정은 데이터 주도다 — 새 업적을 추가할 때 이 함수를 고치지 않는다.
 */
async function evaluateAchievements(
	db: D1Database,
	userId: string,
	ctx: { level: number; combo: number; battleWon: boolean; streakDays: number; now: number }
): Promise<UnlockedAchievement[]> {
	const { results: pending } = await db
		.prepare(
			`SELECT a.* FROM achievements a
			 LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
			 WHERE ua.achievement_id IS NULL
			 ORDER BY a.sort_order`
		)
		.bind(userId)
		.all<AchievementRow>();

	if (pending.length === 0) return [];

	// 필요한 통계만 실제로 조회한다 (업적 종류별로 한 번씩)
	const needed = new Set(pending.map((a) => a.condition_type));
	const stats: Record<string, number> = {
		level: ctx.level,
		combo: ctx.combo,
		streak: ctx.streakDays
	};

	if (needed.has('hanja_learned')) {
		stats.hanja_learned = await totalLearned(db, userId);
	}
	if (needed.has('quiz_correct')) {
		const row = await db
			.prepare('SELECT COUNT(*) AS n FROM quiz_results WHERE user_id = ? AND is_correct = 1')
			.bind(userId)
			.first<{ n: number }>();
		stats.quiz_correct = row?.n ?? 0;
	}
	if (needed.has('battle_win')) {
		const row = await db
			.prepare("SELECT COUNT(*) AS n FROM battle_records WHERE user_id = ? AND result = 'win'")
			.bind(userId)
			.first<{ n: number }>();
		stats.battle_win = (row?.n ?? 0) + (ctx.battleWon ? 0 : 0);
	}
	if (needed.has('area_clear')) {
		stats.area_clear = 0; // PHASE 16 에서 지역 100% 판정을 연결한다
	}

	const unlocked: UnlockedAchievement[] = [];
	for (const a of pending) {
		const current = stats[a.condition_type];
		if (current === undefined) continue;
		if (current < a.condition_value) continue;

		const result = await db
			.prepare(
				`INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)
				 ON CONFLICT(user_id, achievement_id) DO NOTHING`
			)
			.bind(userId, a.id, ctx.now)
			.run();

		if ((result.meta?.changes ?? 0) > 0) {
			unlocked.push({
				id: a.id,
				title: a.title,
				description: a.description,
				icon: a.icon,
				expReward: a.exp_reward,
				gemReward: a.gem_reward
			});
		}
	}
	return unlocked;
}

export { EXP_REWARD };
