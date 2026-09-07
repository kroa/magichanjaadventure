import { GRADE_INFO } from '$lib/dict/grade-info';
import { charactersOfGrade } from '$lib/dict';
import type { PageLoad } from './$types';

export const prerender = true;

/**
 * 급수 안내.
 *
 * 급수별 한자표는 각 급수 페이지에 있는데, **급수 체계 자체**를 묻는 사람이
 * 닿을 곳이 없었다. `한자 급수`, `한자 급수표`, `한자 급수 종류`, `한자 몇 급부터`
 * 같은 물음은 특정 급수 페이지가 아니라 여기서 답해야 한다.
 */
export const load: PageLoad = () => ({
	grades: GRADE_INFO.map((g) => ({
		...g,
		// 그 급수에서 가장 쉬운 글자 몇 자 — 급수의 난이도를 눈으로 보여 준다
		sample: charactersOfGrade(g.label)
			.slice(0, 6)
			.map((e) => e.character)
	}))
});
