export type CharacterClass = 'knight' | 'wizard' | 'archer' | 'sage' | 'fox';

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

export interface CharacterInfo {
	id: CharacterClass;
	label: string;
	tagline: string;
	hp: number;
	attack: number;
	/** 0 이면 처음부터 가질 수 있다 */
	price: number;
	/** 상점 카드에 쓰는 한 줄 설명 */
	blurb: string;
}

/**
 * 캐릭터 도감.
 *
 * **밸런스 원칙: 어떤 선택도 "잘못된 선택"이 되면 안 된다.**
 * 비싼 캐릭터가 무조건 강한 것이 아니라 **플레이 리듬이 다르다.**
 * 에너지가 많으면 틀려도 버티고, 공격이 세면 잘 맞힐 때 빨리 끝난다.
 * (화면에는 "HP" 대신 "에너지"라고 쓴다 — 2학년이 HP 를 모른다)
 * 총합(hp/10 + attack)을 22 안팎으로 맞춰 두었다.
 */
export const CHARACTERS: Record<CharacterClass, CharacterInfo> = {
	knight: {
		id: 'knight',
		label: '한자 기사',
		tagline: '에너지가 많아 틀려도 오래 버텨요',
		hp: 120,
		attack: 10,
		price: 0,
		blurb: '방패에 한자를 새겨 힘으로 밀어붙여요. 처음 시작하기 좋아요.'
	},
	wizard: {
		id: 'wizard',
		label: '한자 마법사',
		tagline: '공격력이 높아 빨리 이겨요',
		hp: 90,
		attack: 14,
		price: 0,
		blurb: '한자를 마법으로 바꿔 쏘아요. 잘 맞히면 순식간에 끝나요.'
	},
	archer: {
		id: 'archer',
		label: '한자 궁수',
		tagline: '균형이 좋아 어디서나 잘 싸워요',
		hp: 105,
		attack: 12,
		price: 50,
		blurb: '숲에서 온 명사수예요. 한자 화살을 정확히 쏘아 맞혀요.'
	},
	sage: {
		id: 'sage',
		label: '한자 도사',
		tagline: '에너지가 아주 많아 실수에 너그러워요',
		hp: 140,
		attack: 9,
		price: 120,
		blurb: '산에서 수련한 어린 도사예요. 부채 한 번에 바람이 붑니다.'
	},
	fox: {
		id: 'fox',
		label: '한자 여우',
		tagline: '공격이 가장 세지만 에너지는 적어요',
		hp: 80,
		attack: 16,
		price: 200,
		blurb: '꼬리가 아홉인 장난꾸러기. 한자를 알아보는 눈이 빨라요.'
	}
};

/** 처음부터 가질 수 있는 캐릭터 */
export const STARTER_CLASSES: CharacterClass[] = ['knight', 'wizard'];

export const ALL_CLASSES: CharacterClass[] = ['knight', 'wizard', 'archer', 'sage', 'fox'];

export function isCharacterClass(value: unknown): value is CharacterClass {
	return typeof value === 'string' && (ALL_CLASSES as string[]).includes(value);
}

/** 이전 코드와의 호환용 별칭 (스탯만 필요할 때) */
export const CHARACTER_STATS = CHARACTERS;
