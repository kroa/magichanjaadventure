import { error } from '@sveltejs/kit';
import { gradeExists, GRADES, charactersOfGrade } from '$lib/dict';
import { roundFor } from '$lib/dict/quiz';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => GRADES.map((g) => ({ grade: g.label }));

export const load: PageLoad = ({ params }) => {
	if (!gradeExists(params.grade)) error(404, '그런 급수는 없습니다');
	return {
		grade: params.grade,
		total: charactersOfGrade(params.grade).length,
		// 첫 판은 고정된 씨앗으로 굽는다 — 서버와 브라우저가 같은 문제를 봐야 한다
		questions: roundFor(params.grade, '1')
	};
};
