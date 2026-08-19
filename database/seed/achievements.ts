/**
 * 업적 정의.
 *
 * `conditionType` + `conditionValue` 로 **데이터 주도** 판정한다.
 * 새 업적을 추가할 때 코드를 고치지 않고 여기 한 줄만 넣는다.
 */

export type ConditionType =
	'hanja_learned' | 'combo' | 'level' | 'battle_win' | 'quiz_correct' | 'streak' | 'area_clear';

export interface Achievement {
	id: string;
	title: string;
	description: string;
	icon: string;
	conditionType: ConditionType;
	conditionValue: number;
	expReward: number;
	gemReward: number;
	sortOrder: number;
}

export const ACHIEVEMENTS: Achievement[] = [
	{
		id: 'first_hanja',
		title: '첫 발견',
		description: '한자를 1자 모았어요',
		icon: '✨',
		conditionType: 'hanja_learned',
		conditionValue: 1,
		expReward: 20,
		gemReward: 0,
		sortOrder: 1
	},
	{
		id: 'collect_10',
		title: '새싹 수집가',
		description: '한자를 10자 모았어요',
		icon: '🌱',
		conditionType: 'hanja_learned',
		conditionValue: 10,
		expReward: 50,
		gemReward: 5,
		sortOrder: 2
	},
	{
		id: 'collect_50',
		title: '한자 탐험가',
		description: '한자를 50자 모았어요',
		icon: '🧭',
		conditionType: 'hanja_learned',
		conditionValue: 50,
		expReward: 150,
		gemReward: 10,
		sortOrder: 3
	},
	{
		id: 'collect_100',
		title: '한자 학자',
		description: '한자를 100자 모았어요',
		icon: '📚',
		conditionType: 'hanja_learned',
		conditionValue: 100,
		expReward: 300,
		gemReward: 20,
		sortOrder: 4
	},
	{
		id: 'collect_250',
		title: '한자 현자',
		description: '한자를 250자 모았어요',
		icon: '🔮',
		conditionType: 'hanja_learned',
		conditionValue: 250,
		expReward: 600,
		gemReward: 50,
		sortOrder: 5
	},
	{
		id: 'collect_500',
		title: '한자 마스터',
		description: '한자 500자를 모두 모았어요',
		icon: '👑',
		conditionType: 'hanja_learned',
		conditionValue: 500,
		expReward: 2000,
		gemReward: 200,
		sortOrder: 6
	},

	{
		id: 'combo_3',
		title: '연속 정답!',
		description: '3연속 정답을 맞혔어요',
		icon: '🔥',
		conditionType: 'combo',
		conditionValue: 3,
		expReward: 20,
		gemReward: 0,
		sortOrder: 7
	},
	{
		id: 'combo_10',
		title: '불타는 콤보',
		description: '10연속 정답을 맞혔어요',
		icon: '💥',
		conditionType: 'combo',
		conditionValue: 10,
		expReward: 100,
		gemReward: 10,
		sortOrder: 8
	},
	{
		id: 'combo_20',
		title: '전설의 콤보',
		description: '20연속 정답을 맞혔어요',
		icon: '🌟',
		conditionType: 'combo',
		conditionValue: 20,
		expReward: 300,
		gemReward: 30,
		sortOrder: 9
	},

	{
		id: 'level_5',
		title: '견습 탐험대원',
		description: '레벨 5에 올랐어요',
		icon: '🎖️',
		conditionType: 'level',
		conditionValue: 5,
		expReward: 50,
		gemReward: 0,
		sortOrder: 10
	},
	{
		id: 'level_10',
		title: '정식 탐험대원',
		description: '레벨 10에 올랐어요',
		icon: '🏅',
		conditionType: 'level',
		conditionValue: 10,
		expReward: 120,
		gemReward: 10,
		sortOrder: 11
	},
	{
		id: 'level_25',
		title: '베테랑 탐험대원',
		description: '레벨 25에 올랐어요',
		icon: '🏆',
		conditionType: 'level',
		conditionValue: 25,
		expReward: 400,
		gemReward: 40,
		sortOrder: 12
	},

	{
		id: 'first_win',
		title: '첫 승리',
		description: '대결에서 처음 이겼어요',
		icon: '⚔️',
		conditionType: 'battle_win',
		conditionValue: 1,
		expReward: 50,
		gemReward: 5,
		sortOrder: 13
	},
	{
		id: 'win_10',
		title: '몬스터 사냥꾼',
		description: '대결에서 10번 이겼어요',
		icon: '🛡️',
		conditionType: 'battle_win',
		conditionValue: 10,
		expReward: 200,
		gemReward: 20,
		sortOrder: 14
	},

	{
		id: 'quiz_100',
		title: '백 문제 돌파',
		description: '퀴즈를 100문제 맞혔어요',
		icon: '💯',
		conditionType: 'quiz_correct',
		conditionValue: 100,
		expReward: 150,
		gemReward: 15,
		sortOrder: 15
	},
	{
		id: 'quiz_500',
		title: '오백 문제 돌파',
		description: '퀴즈를 500문제 맞혔어요',
		icon: '🎯',
		conditionType: 'quiz_correct',
		conditionValue: 500,
		expReward: 500,
		gemReward: 50,
		sortOrder: 16
	},

	{
		id: 'streak_3',
		title: '3일 연속 모험',
		description: '3일 연속으로 접속했어요',
		icon: '📅',
		conditionType: 'streak',
		conditionValue: 3,
		expReward: 60,
		gemReward: 5,
		sortOrder: 17
	},
	{
		id: 'streak_7',
		title: '일주일 개근',
		description: '7일 연속으로 접속했어요',
		icon: '🗓️',
		conditionType: 'streak',
		conditionValue: 7,
		expReward: 200,
		gemReward: 20,
		sortOrder: 18
	}
];
