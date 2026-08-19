/**
 * 레벨 / EXP 규칙 — **순수 함수만** 둔다.
 *
 * 이 파일은 클라이언트와 서버가 **함께 import** 한다.
 *  - 클라이언트: "+10 EXP" 같은 즉시 피드백을 그린다
 *  - 서버:       실제 값을 확정해 DB 에 쓴다 (권위 있는 계산)
 *
 * 규칙을 한 곳에만 두므로 "화면에 뜬 숫자 ≠ 저장된 숫자" 버그가 구조적으로 불가능하다.
 * 근거 문서: docs/01-DATABASE.md §9
 */

/** 게임 최대 레벨. 한자 1000자를 다 모으면 도달하도록 잡았다. */
export const MAX_LEVEL = 80;

/** 행동별 기본 EXP */
export const EXP_REWARD = {
	/** 퀴즈 정답 */
	correctAnswer: 10,
	/** 한자를 처음 획득 */
	newHanja: 20,
	/** 대결 승리 */
	battleWin: 50,
	/** 3초 이내 정답 */
	fastAnswer: 2
} as const;

/** 콤보 보너스 구간. 누적이 아니라 **해당하는 최고 구간 하나만** 적용한다. */
const COMBO_TIERS = [
	{ min: 10, bonus: 20 },
	{ min: 5, bonus: 10 },
	{ min: 3, bonus: 5 }
] as const;

/** 빠른 정답으로 인정하는 시간 (ms) */
export const FAST_ANSWER_MS = 3000;

/**
 * 해당 레벨에서 다음 레벨로 가는 데 필요한 EXP.
 *
 * 초반을 완만하게 잡아 아이가 첫 5분 안에 레벨업을 한 번 경험하게 한다.
 * (docs/04-CONTENT-PLAN.md §7 온보딩 시나리오)
 */
export function expToNextLevel(level: number): number {
	if (level >= MAX_LEVEL) return Infinity;
	const safe = Math.max(1, Math.floor(level));
	return 60 + safe * 40;
}

/** 콤보 수에 해당하는 보너스 EXP. */
export function comboBonus(combo: number): number {
	if (!Number.isFinite(combo) || combo < 3) return 0;
	return COMBO_TIERS.find((tier) => combo >= tier.min)?.bonus ?? 0;
}

/** 콤보가 특별 연출(10콤보 이상)을 발동시키는가. */
export function isSpecialCombo(combo: number): boolean {
	return combo >= 10;
}

export interface AnswerExpInput {
	isCorrect: boolean;
	/** 이 문제를 맞힌 뒤의 콤보 수 */
	combo: number;
	/** 답하는 데 걸린 시간 (ms). 모르면 생략 */
	answerMs?: number;
	/** 이 한자를 처음 획득하는가 */
	isNewHanja?: boolean;
}

export interface AnswerExpBreakdown {
	base: number;
	combo: number;
	speed: number;
	discovery: number;
	total: number;
}

/**
 * 한 문제에 대한 EXP 를 계산한다.
 *
 * 오답이면 0 이다. **EXP 를 깎지 않는다** — 아이에게 오답은 처벌이 아니라 재시도여야 한다.
 */
export function expForAnswer(input: AnswerExpInput): AnswerExpBreakdown {
	const empty: AnswerExpBreakdown = { base: 0, combo: 0, speed: 0, discovery: 0, total: 0 };
	if (!input.isCorrect) return empty;

	const base = EXP_REWARD.correctAnswer;
	const combo = comboBonus(input.combo);
	const speed =
		typeof input.answerMs === 'number' && input.answerMs >= 0 && input.answerMs <= FAST_ANSWER_MS
			? EXP_REWARD.fastAnswer
			: 0;
	const discovery = input.isNewHanja ? EXP_REWARD.newHanja : 0;

	return { base, combo, speed, discovery, total: base + combo + speed + discovery };
}

export interface LevelState {
	level: number;
	/** 현재 레벨 안에서의 EXP */
	exp: number;
}

export interface LevelUpResult extends LevelState {
	/** 이번에 오른 레벨 수 (0 이면 레벨업 없음) */
	levelsGained: number;
	/** 다음 레벨까지 필요한 EXP */
	expToNext: number;
}

/**
 * EXP 를 더하고 레벨업을 처리한다. 한 번에 여러 레벨이 오를 수 있다.
 *
 * 최대 레벨에 도달하면 EXP 는 0 으로 고정한다(진행바가 가득 찬 채 멈추면 아이가 혼란스러워한다).
 */
export function applyExp(state: LevelState, gained: number): LevelUpResult {
	let level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(state.level)));
	let exp = Math.max(0, Math.floor(state.exp)) + Math.max(0, Math.floor(gained));
	let levelsGained = 0;

	while (level < MAX_LEVEL) {
		const need = expToNextLevel(level);
		if (exp < need) break;
		exp -= need;
		level += 1;
		levelsGained += 1;
	}

	if (level >= MAX_LEVEL) {
		level = MAX_LEVEL;
		exp = 0;
	}

	return { level, exp, levelsGained, expToNext: expToNextLevel(level) };
}

/** 진행바에 쓸 0~1 비율. */
export function levelProgress(state: LevelState): number {
	const need = expToNextLevel(state.level);
	if (!Number.isFinite(need) || need <= 0) return 1;
	return Math.min(1, Math.max(0, state.exp / need));
}
