import { rngFrom, shuffled } from '$lib/game/rng';
import { charactersOfGrade, type DictEntry } from './index';

/**
 * 급수별 한자 퀴즈 — **사전 판.**
 *
 * 게임의 퀴즈는 조각을 붙여 글자를 만드는 놀이다. 여기는 다르다:
 * 검정시험을 준비하는 사람이 찾는 것은 **훈·음을 맞히는 문제**다
 * (조사에서 `한자 퀴즈 사이트` 가 자동완성 상위에 있었고, 그 자리를 채우고 있는 것은
 * 개인 프로젝트 수준의 사이트들이다).
 *
 * ── 왜 씨앗을 쓰는가 ────────────────────────────────────────────────
 * `Math.random()` 으로 문제를 뽑으면 서버가 그린 화면과 브라우저가 이어받은 화면이
 * 달라져 하이드레이션이 깨진다. 씨앗에서 유도하면 둘이 같고, 씨앗을 바꾸면
 * 새 문제가 나온다 — "다시 풀기" 는 씨앗을 바꾸는 일일 뿐이다.
 */

export const QUESTIONS_PER_ROUND = 10;
const CHOICES = 4;

export interface QuizQuestion {
	/** 물음에 내놓는 한자 */
	character: string;
	/** 보기 (훈·음). 하나만 정답이다 */
	choices: string[];
	answer: number;
}

function label(e: DictEntry): string {
	return `${e.meaning} ${e.reading}`;
}

/**
 * 한 판을 만든다.
 *
 * 오답 보기는 **같은 급수 안에서** 고른다. 아무 데서나 가져오면 난이도가 들쭉날쭉해지고,
 * 무엇보다 "8급 문제인데 4급 보기가 섞인" 이상한 판이 된다.
 */
export function roundFor(grade: string, seed: string): QuizQuestion[] {
	const pool = charactersOfGrade(grade);
	if (pool.length < CHOICES) return [];

	const rng = rngFrom(`${grade}:${seed}`);
	const picked = shuffled(pool, rng).slice(0, Math.min(QUESTIONS_PER_ROUND, pool.length));

	return picked.map((entry) => {
		const others = shuffled(
			pool.filter((e) => e.character !== entry.character && label(e) !== label(entry)),
			rng
		).slice(0, CHOICES - 1);

		const choices = shuffled([entry, ...others], rng);
		return {
			character: entry.character,
			choices: choices.map(label),
			answer: choices.findIndex((c) => c.character === entry.character)
		};
	});
}
