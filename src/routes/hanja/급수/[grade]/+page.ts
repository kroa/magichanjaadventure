import { error } from '@sveltejs/kit';
import { charactersOfGrade, gradeExists, GRADES } from '$lib/dict';
import type { EntryGenerator, PageLoad } from './$types';

/**
 * 급수별 목록.
 *
 * `entries()` 를 주지 않으면 SvelteKit 이 어떤 급수가 있는지 몰라 아무것도 굽지 않는다.
 * 링크를 타고 발견되는 것에 의존하지 않고 **명시한다** — 목록에서 빠진 급수가 생기면
 * 그 페이지는 조용히 사라지고, 사이트맵에도 안 실리고, 아무도 눈치채지 못한다.
 */
export const entries: EntryGenerator = () => GRADES.map((g) => ({ grade: g.label }));

export const load: PageLoad = ({ params }) => {
	if (!gradeExists(params.grade)) error(404, '그런 급수는 없습니다');
	return {
		grade: params.grade,
		characters: charactersOfGrade(params.grade).map((e) => ({
			character: e.character,
			reading: e.reading,
			meaning: e.meaning,
			strokeCount: e.strokeCount
		}))
	};
};
