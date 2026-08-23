/**
 * 보석은 어디서 나오는가.
 *
 * **반복해서 얻을 수 있는 출처는 대결 승리 하나뿐이다** (`api/battle/finish`: 5 + 별).
 * 나머지는 전부 1회성 업적이다. 퀴즈로는 한 개도 안 나온다 —
 * 그런데 상점 화면은 "보석은 퀴즈 · 대결 · 업적으로 모을 수 있어요" 라고 적어 두고 있었다.
 * 아이가 그 말을 믿고 복습만 반복하면 영원히 아무것도 못 산다.
 *
 * 환산 계수를 화면에 하드코딩하지 않으려고 여기 둔다. 보상이 바뀌면 여기만 고친다.
 */

/** 대결 승리 한 번의 보석 (별 0~3 → 5~8). 안내에는 평균을 쓴다 */
export const GEMS_PER_BATTLE_WIN = 6;

/** 이만큼 모으려면 대결을 몇 번 이겨야 하는가 */
export function battlesToAfford(price: number, gems: number): number {
	const short = Math.max(0, Math.ceil(price) - Math.max(0, Math.floor(gems)));
	if (short === 0) return 0;
	return Math.ceil(short / GEMS_PER_BATTLE_WIN);
}
