import { MAX_LEVEL } from './exp';
import { CHARACTERS, type CharacterClass } from '$lib/types/user';

/**
 * 전직 — **레벨에서 유도한다. 저장하지 않는다.**
 *
 * DB 에 `rank` 칼럼을 두면 마이그레이션이 필요하고, 레벨과 어긋날 수 있고,
 * 화면이 보낸 값을 서버가 믿어야 하는 자리가 생긴다. 셋 다 공짜로 없앨 수 있다 —
 * 이 프로젝트는 이미 봉인과 조각을 씨앗에서 유도해 세션 테이블을 없앤 전례가 있다.
 *
 * 그래서 상점에서 캐릭터를 사고 바꿔도 단계가 자동으로 보존된다.
 * "구매하면 초기화되나 유지되나" 라는, 어느 쪽을 골라도 버그인 질문이 아예 생기지 않는다.
 */

/** 10레벨마다 한 단계 (사용자 요청) */
export const RANK_STEP = 10;

/** 0단계(Lv 1~9) ~ 7단계(Lv 70~) = 여덟 단계 */
export const RANK_MAX = Math.floor(MAX_LEVEL / RANK_STEP) - 1;

/**
 * 계급 수식어. 클래스 이름 앞에 그대로 붙는 관형형이다.
 *
 * **6종 × 8단계 = 48개 이름을 짓지 않는다.** 수식어 8개면 48가지가 조합으로 나온다.
 * 저학년이 읽을 수 있어야 하므로 어려운 한자어를 쓰지 않았다.
 */
export const RANK_PREFIX = [
	'',
	'씩씩한',
	'빛나는',
	'날쌘',
	'굳센',
	'늠름한',
	'눈부신',
	'전설의'
] as const;

export function rankOf(level: number | null | undefined): number {
	const safe = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level || 1)));
	return Math.min(RANK_MAX, Math.floor(safe / RANK_STEP));
}

/** 다음 전직 레벨. 꼭대기면 null */
export function nextRankAt(level: number | null | undefined): number | null {
	const rank = rankOf(level);
	return rank >= RANK_MAX ? null : (rank + 1) * RANK_STEP;
}

/**
 * 화면에 보여 줄 칭호.
 *
 * `characters.ts` 가 아니라 `types/user` 에서 이름을 가져온다 —
 * 저쪽은 Svelte 컴포넌트를 import 하므로 서버 코드가 끌어오면 안 된다.
 */
export function titleFor(cls: CharacterClass | null | undefined, rank: number): string {
	const label = CHARACTERS[cls ?? 'knight'].label;
	const prefix = RANK_PREFIX[Math.min(RANK_MAX, Math.max(0, Math.floor(rank)))];
	return prefix ? `${prefix} ${label}` : label;
}

/** 이번 레벨업으로 전직했는가 */
export function didPromote(previousLevel: number, level: number): boolean {
	return rankOf(level) > rankOf(previousLevel);
}
