import type { AnswerExpBreakdown } from '$lib/game/exp';

/**
 * API 응답 계약.
 *
 * 서버 라우트와 클라이언트가 **같은 타입**을 import 하므로,
 * 한쪽 모양이 바뀌면 다른 쪽이 컴파일 에러로 즉시 드러난다.
 */

export interface UnlockedAchievementDto {
	id: string;
	title: string;
	description: string;
	icon: string;
	expReward: number;
	gemReward: number;
}

export interface RewardDto {
	expGained: number;
	gemsGained: number;
	level: number;
	exp: number;
	expToNext: number;
	levelsGained: number;
	totalExp: number;
	gems: number;
	unlockedAchievements: UnlockedAchievementDto[];
}

export interface QuizAnswerResponse {
	isCorrect: boolean;
	answer: string;
	combo: number;
	breakdown: AnswerExpBreakdown;
	reward: RewardDto | null;
}

export interface BattleFinishResponse {
	won: boolean;
	correct: number;
	wrong: number;
	reward: RewardDto | null;
}
