/**
 * 지역(Area) = 한국어문회 급수 티어.
 *
 * 아이는 "6급 공부"를 하는 게 아니라 **"수정 동굴 탐험"**을 한다.
 * 근거: docs/04-CONTENT-PLAN.md §2
 */

/**
 * 지역 보스. 유니온으로 좁혀 두면 스킨을 빠뜨릴 수 없다.
 *
 * 예전에는 `string` 이라 MonsterSprite 에 스킨이 없는 지역(구름 나루·하늘섬)이
 * 조용히 1지역 도토리 도적으로 떨어졌고, 아무도 눈치채지 못했다.
 */
export type BossId =
	| 'acorn_bandit'
	| 'droplet_trickster'
	| 'cloud_puff'
	| 'rainbow_fox'
	| 'crystal_golem'
	| 'star_sprite'
	| 'brush_king'
	| 'cloud_captain'
	| 'sky_dragon';

export interface Area {
	id: number;
	name: string;
	grade: string;
	/** 이 지역의 한자 수 */
	hanjaCount: number;
	levelRequired: number;
	/** 분위기 한 줄 */
	mood: string;
	/** 지역 보스 */
	boss: { id: BossId; name: string; hint: string };
	/** 배경 그라디언트 (CSS) */
	sky: string;
	/** 지역 대표색 */
	accent: string;
	emoji: string;
	/** 발굴 흙 재질 (배우기 화면) */
	soil: { top: string; bottom: string; grit: string };
	/** 지도에서 섬 밑에 깔리는 땅색 */
	ground: string;
}

export const AREAS: Area[] = [
	{
		id: 1,
		name: '새싹 마을',
		grade: '8급',
		hanjaCount: 50,
		levelRequired: 1,
		mood: '햇살 가득한 들판에서 첫 마법을 배우는 곳',
		boss: { id: 'acorn_bandit', name: '꼬마 도토리 도적', hint: '숫자와 방향을 좋아해요' },
		sky: 'linear-gradient(180deg,#D6F5C9 0%,#C9E9FF 55%,#F6EEFF 100%)',
		accent: '#7BC96F',
		emoji: '🌱',
		/** 발굴 흙 재질 — 배우기 화면이 지역마다 다른 땅을 파게 한다 */
		soil: { top: '#B08356', bottom: '#8A5A28', grit: '#D9B382' },
		/** 지도에서 섬 밑에 깔리는 땅색. accent 와 달라야 섬과 땅이 안 뭉갠다 */
		ground: '#5E9E58'
	},
	{
		id: 2,
		name: '반짝 시냇가',
		grade: '7급 II',
		hanjaCount: 50,
		levelRequired: 3,
		mood: '조약돌 사이로 물이 흐르는 맑은 개울',
		boss: { id: 'droplet_trickster', name: '물방울 장난꾸러기', hint: '자연의 한자를 씁니다' },
		sky: 'linear-gradient(180deg,#BEEBFF 0%,#D9F2FF 55%,#F2FBFF 100%)',
		accent: '#4FC3F7',
		emoji: '💧',
		/** 발굴 흙 재질 — 배우기 화면이 지역마다 다른 땅을 파게 한다 */
		soil: { top: '#D9C7A8', bottom: '#A88F63', grit: '#EFE2C4' },
		/** 지도에서 섬 밑에 깔리는 땅색. accent 와 달라야 섬과 땅이 안 뭉갠다 */
		ground: '#3E93BE'
	},
	{
		id: 3,
		name: '바람 언덕',
		grade: '7급',
		hanjaCount: 50,
		levelRequired: 6,
		mood: '풍차가 돌고 민들레가 날리는 언덕',
		boss: { id: 'cloud_puff', name: '구름 뭉치', hint: '하늘과 시간의 한자를 좋아해요' },
		sky: 'linear-gradient(180deg,#CFE8FF 0%,#E4E0FF 55%,#FFF6E9 100%)',
		accent: '#9BB8E8',
		emoji: '🍃',
		/** 발굴 흙 재질 — 배우기 화면이 지역마다 다른 땅을 파게 한다 */
		soil: { top: '#C2B487', bottom: '#8E7F52', grit: '#E4DAB4' },
		/** 지도에서 섬 밑에 깔리는 땅색. accent 와 달라야 섬과 땅이 안 뭉갠다 */
		ground: '#7189B4'
	},
	{
		id: 4,
		name: '무지개 다리',
		grade: '6급 II',
		hanjaCount: 75,
		levelRequired: 10,
		mood: '폭포 위 공중 섬을 잇는 무지개',
		boss: { id: 'rainbow_fox', name: '무지개 여우', hint: '색과 모양의 한자를 부립니다' },
		sky: 'linear-gradient(180deg,#FFE0F0 0%,#E4E0FF 50%,#D9F2FF 100%)',
		accent: '#FF9EC4',
		emoji: '🌈',
		/** 발굴 흙 재질 — 배우기 화면이 지역마다 다른 땅을 파게 한다 */
		soil: { top: '#C79BB4', bottom: '#8E5F80', grit: '#F0C8DE' },
		/** 지도에서 섬 밑에 깔리는 땅색. accent 와 달라야 섬과 땅이 안 뭉갠다 */
		ground: '#C1749A'
	},
	{
		id: 5,
		name: '수정 동굴',
		grade: '6급',
		hanjaCount: 75,
		levelRequired: 15,
		mood: '보라 수정과 빛나는 이끼가 가득한 동굴',
		boss: { id: 'crystal_golem', name: '수정 아기 골렘', hint: '단단한 한자를 씁니다' },
		sky: 'linear-gradient(180deg,#B7A6F5 0%,#8E7BE0 55%,#6742E8 100%)',
		accent: '#9575FF',
		emoji: '💎',
		/** 발굴 흙 재질 — 배우기 화면이 지역마다 다른 땅을 파게 한다 */
		soil: { top: '#6E5F92', bottom: '#40315F', grit: '#B9A8E6' },
		/** 지도에서 섬 밑에 깔리는 땅색. accent 와 달라야 섬과 땅이 안 뭉갠다 */
		ground: '#6E56C4'
	},
	{
		id: 6,
		name: '별빛 신전',
		grade: '5급 II',
		hanjaCount: 100,
		levelRequired: 21,
		mood: '밤하늘 아래 떠다니는 룬과 기둥',
		boss: { id: 'star_sprite', name: '별똥별 요정', hint: '어려운 한자를 반짝이며 던져요' },
		sky: 'radial-gradient(120% 90% at 50% 10%,#3E2590 0%,#2B1A66 60%,#1B1042 100%)',
		accent: '#FFD25E',
		emoji: '✨',
		/** 발굴 흙 재질 — 배우기 화면이 지역마다 다른 땅을 파게 한다 */
		soil: { top: '#4A4270', bottom: '#241E44', grit: '#FFD25E' },
		/** 지도에서 섬 밑에 깔리는 땅색. accent 와 달라야 섬과 땅이 안 뭉갠다 */
		ground: '#C2A03F'
	},
	{
		id: 7,
		name: '한자 왕성',
		grade: '5급',
		hanjaCount: 100,
		levelRequired: 28,
		mood: '구름 위에 솟은 황금빛 성',
		boss: { id: 'brush_king', name: '붓 마왕', hint: '모든 한자를 알고 있어요' },
		sky: 'linear-gradient(180deg,#FFE9B0 0%,#FFC93C 45%,#F5A623 100%)',
		accent: '#F5A623',
		emoji: '🏰',
		/** 발굴 흙 재질 — 배우기 화면이 지역마다 다른 땅을 파게 한다 */
		soil: { top: '#C9A15A', bottom: '#8A6320', grit: '#FFE7A8' },
		/** 지도에서 섬 밑에 깔리는 땅색. accent 와 달라야 섬과 땅이 안 뭉갠다 */
		ground: '#BC7F1B'
	},
	{
		id: 8,
		name: '구름 나루',
		grade: '4급 II',
		hanjaCount: 272,
		levelRequired: 36,
		mood: '구름 위에 뜬 나루터. 배를 타고 더 높이 간다',
		boss: { id: 'cloud_captain', name: '구름배 선장', hint: '어려운 한자를 잔뜩 싣고 다녀요' },
		sky: 'linear-gradient(180deg,#CFE4F5 0%,#9FC7E8 50%,#6FA9E8 100%)',
		accent: '#5BA8D6',
		emoji: '⛵',
		/** 발굴 흙 재질 — 배우기 화면이 지역마다 다른 땅을 파게 한다 */
		soil: { top: '#9FB6C9', bottom: '#5F7A90', grit: '#DDEAF5' },
		/** 지도에서 섬 밑에 깔리는 땅색. accent 와 달라야 섬과 땅이 안 뭉갠다 */
		ground: '#4581A6'
	},
	{
		id: 9,
		name: '한자 하늘섬',
		grade: '4급',
		hanjaCount: 228,
		levelRequired: 46,
		mood: '구름보다 높은 곳에 떠 있는 마지막 섬',
		boss: { id: 'sky_dragon', name: '아기 구름용', hint: '1000자를 모두 아는 마지막 상대' },
		sky: 'radial-gradient(120% 90% at 50% 10%,#5BA8D6 0%,#3E2590 60%,#1B1042 100%)',
		accent: '#B29CFF',
		emoji: '🐉',
		/** 발굴 흙 재질 — 배우기 화면이 지역마다 다른 땅을 파게 한다 */
		soil: { top: '#7E77B8', bottom: '#3E3670', grit: '#CFC6FF' },
		/** 지도에서 섬 밑에 깔리는 땅색. accent 와 달라야 섬과 땅이 안 뭉갠다 */
		ground: '#8878C9'
	}
];

/**
 * 전체 한자 수. 지역 정의에서 계산하므로 지역을 늘리면 자동으로 따라온다.
 * (화면마다 숫자를 하드코딩하면 다음에 늘릴 때 흩어진 값을 찾아다녀야 한다)
 */
export const TOTAL_HANJA: number = AREAS.reduce((sum, area) => sum + area.hanjaCount, 0);

export function getArea(id: number): Area | undefined {
	return AREAS.find((a) => a.id === id);
}

/**
 * 지역 해금 조건: **레벨 도달 AND 직전 지역 습득률 60%**.
 *
 * 레벨만 보면 쉬운 한자를 건너뛰고, 습득률만 보면 진도가 막힌다.
 * 둘 다 요구하면 "조금만 더 모으면 다음 지역이 열린다"는 단기 목표가 생긴다.
 */
export const AREA_UNLOCK_RATIO = 0.6;

/**
 * 잠긴 이유를 **숫자 그대로** 내보낸다.
 *
 * `lockedReason` 문자열은 토스트가 쓰므로 그대로 두되, 지도가 진행바를 그리려면
 * "몇 중 몇" 이 필요하다. 문자열을 다시 파싱하는 짓을 하지 않으려고 함께 준다.
 * 잠긴 섬이 "못 가는 곳" 이 아니라 "조금만 더 하면 가는 곳" 으로 보이려면 이 숫자가 있어야 한다.
 */
export type AreaGate =
	| { kind: 'level'; need: number; have: number }
	| { kind: 'progress'; need: number; have: number; from: string };

export interface AreaUnlockState {
	area: Area;
	unlocked: boolean;
	learned: number;
	/** 잠긴 이유 (열려 있으면 null) */
	lockedReason: string | null;
	/** 잠긴 이유를 숫자로 (열려 있으면 null) */
	gate: AreaGate | null;
}

export function evaluateAreaUnlocks(
	level: number,
	learnedByArea: Record<number, number>
): AreaUnlockState[] {
	return AREAS.map((area) => {
		const learned = learnedByArea[area.id] ?? 0;

		if (area.id === 1) {
			return { area, unlocked: true, learned, lockedReason: null, gate: null };
		}

		const previous = AREAS[area.id - 2];
		const previousLearned = learnedByArea[previous.id] ?? 0;
		const needed = Math.ceil(previous.hanjaCount * AREA_UNLOCK_RATIO);

		if (level < area.levelRequired) {
			return {
				area,
				unlocked: false,
				learned,
				lockedReason: `레벨 ${area.levelRequired} 필요`,
				gate: { kind: 'level', need: area.levelRequired, have: level }
			};
		}
		if (previousLearned < needed) {
			return {
				area,
				unlocked: false,
				learned,
				lockedReason: `${previous.name} 한자 ${needed}자 필요 (지금 ${previousLearned}자)`,
				gate: { kind: 'progress', need: needed, have: previousLearned, from: previous.name }
			};
		}
		return { area, unlocked: true, learned, lockedReason: null, gate: null };
	});
}
