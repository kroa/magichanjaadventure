import { error } from '@sveltejs/kit';
import { charactersOfGrade, gradeExists, GRADES, strokesFor } from '$lib/dict';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => GRADES.map((g) => ({ grade: g.label }));

export const load: PageLoad = ({ params }) => {
	if (!gradeExists(params.grade)) error(404, '그런 급수는 없습니다');
	return {
		grade: params.grade,
		characters: charactersOfGrade(params.grade).map((e) => ({
			character: e.character,
			reading: e.reading,
			meaning: e.meaning,
			strokeCount: e.strokeCount,
			strokes: strokesFor(e.character)
		}))
	};
};
