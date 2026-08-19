export type CharacterClass = 'knight' | 'wizard';

/**
 * 세션에서 복원한 로그인 사용자.
 *
 * **개인 식별 정보를 담지 않는다.** 닉네임은 아이가 직접 만든 게임 아이디다.
 */
export interface SessionUser {
	id: string;
	nickname: string;
	level: number;
	exp: number;
	totalExp: number;
	gems: number;
	characterClass: CharacterClass | null;
}

/** 캐릭터 클래스별 전투 능력치. 어느 쪽도 "잘못된 선택"이 되면 안 된다. */
export const CHARACTER_STATS: Record<
	CharacterClass,
	{ hp: number; attack: number; label: string; tagline: string }
> = {
	knight: {
		hp: 120,
		attack: 10,
		label: '한자 기사',
		tagline: 'HP가 높아 틀려도 오래 버텨요'
	},
	wizard: {
		hp: 90,
		attack: 14,
		label: '한자 마법사',
		tagline: '공격력이 높아 빨리 이겨요'
	}
};
