export type ItemKind = 'attack' | 'hp';

export interface ItemInfo {
	id: string;
	name: string;
	icon: string;
	kind: ItemKind;
	/** 더해지는 능력치 */
	value: number;
	price: number;
	description: string;
}

/**
 * 장비 아이템.
 *
 * **한 번 사면 계속 적용된다(누적).** 장착/해제 개념을 두지 않았다.
 *  - 초등학생에게 "무기 슬롯 / 방어구 슬롯"은 규칙이 하나 더 늘어나는 것이다
 *  - 모은 것이 그대로 세짐으로 이어져야 "모으는 재미"가 성립한다
 *  - 젬은 퀴즈·대결·업적으로만 벌 수 있으므로, 다 모으려면 결국 한자를 많이 익혀야 한다
 *
 * 밸런스: 전부 모으면 공격 +13, HP +95. 기사 기준 공격 23 / HP 215 로,
 * 마지막 지역 보스를 여유 있게 잡을 수 있는 수준이다.
 */
export const ITEMS: ItemInfo[] = [
	{
		id: 'wood_sword',
		name: '나무 검',
		icon: '🗡️',
		kind: 'attack',
		value: 2,
		price: 30,
		description: '연습용이지만 없는 것보다 훨씬 낫습니다.'
	},
	{
		id: 'leather_armor',
		name: '가죽 갑옷',
		icon: '🦺',
		kind: 'hp',
		value: 15,
		price: 30,
		description: '가볍고 튼튼해요. 몇 번 틀려도 버틸 수 있어요.'
	},
	{
		id: 'steel_sword',
		name: '강철 검',
		icon: '⚔️',
		kind: 'attack',
		value: 4,
		price: 80,
		description: '제대로 벼린 검. 한 방이 묵직해집니다.'
	},
	{
		id: 'steel_armor',
		name: '강철 갑옷',
		icon: '🛡️',
		kind: 'hp',
		value: 30,
		price: 80,
		description: '단단한 판금 갑옷. 어지간해선 쓰러지지 않아요.'
	},
	{
		id: 'magic_blade',
		name: '마법 검',
		icon: '✨',
		kind: 'attack',
		value: 7,
		price: 180,
		description: '한자의 힘이 깃든 검. 벨 때마다 빛이 납니다.'
	},
	{
		id: 'guardian_charm',
		name: '수호 부적',
		icon: '🧿',
		kind: 'hp',
		value: 50,
		price: 180,
		description: '위험할 때 대신 막아 주는 부적이에요.'
	}
];

export const ITEMS_BY_ID: Record<string, ItemInfo> = Object.fromEntries(
	ITEMS.map((item) => [item.id, item])
);

export interface StatBonus {
	attack: number;
	hp: number;
}

/** 보유한 아이템의 능력치를 합산한다. */
export function bonusFrom(ownedIds: readonly string[]): StatBonus {
	const bonus: StatBonus = { attack: 0, hp: 0 };
	for (const id of ownedIds) {
		const item = ITEMS_BY_ID[id];
		if (!item) continue;
		if (item.kind === 'attack') bonus.attack += item.value;
		else bonus.hp += item.value;
	}
	return bonus;
}
