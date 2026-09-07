import { error } from '@sveltejs/kit';
import { charactersOfGrade, gradeExists, GRADES } from '$lib/dict';
import { gradeInfoOf, ourCumulative } from '$lib/dict/grade-info';
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
		/*
		 * `N급 한자 개수` 로 찾아오는 사람이 알고 싶은 것은 **누적 자수**다 —
		 * 시험은 상위 급수가 하위를 포함해 나오기 때문이다. 신규만 적으면
		 * 7급을 50자로 알고 돌아간다(실제로는 150자다).
		 */
		info: gradeInfoOf(params.grade),
		oursCumulative: ourCumulative(params.grade),
		characters: charactersOfGrade(params.grade).map((e) => ({
			character: e.character,
			reading: e.reading,
			meaning: e.meaning,
			strokeCount: e.strokeCount
		}))
	};
};
