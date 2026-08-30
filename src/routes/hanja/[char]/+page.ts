import { error } from '@sveltejs/kit';
import {
	ALL,
	buildsInto,
	charactersOfGrade,
	entryOf,
	madeOf,
	strokesFor,
	summarize,
	wordPartners
} from '$lib/dict';
import type { EntryGenerator, PageLoad } from './$types';

/** 1,000자 전부를 굽는다. 이 목록이 곧 사이트맵의 뼈대다 */
export const entries: EntryGenerator = () => ALL.map((e) => ({ char: e.character }));

export const load: PageLoad = ({ params }) => {
	const entry = entryOf(params.char);
	if (!entry) error(404, '그런 한자는 이 사전에 없습니다');

	/*
	 * 같은 급수의 이웃 글자를 몇 개 붙인다.
	 *
	 * 색인을 위해서만이 아니다 — 글자 하나만 있는 페이지는 막다른 길이라
	 * 사람도 크롤러도 한 번 보고 나간다. 옆 글자로 이어지면 둘 다 더 머문다.
	 */
	const siblings = charactersOfGrade(entry.gradeLabel).filter(
		(e) => e.character !== entry.character
	);
	const at = charactersOfGrade(entry.gradeLabel).findIndex((e) => e.character === entry.character);

	return {
		entry,
		summary: summarize(entry),
		madeOf: madeOf(entry.character),
		buildsInto: buildsInto(entry.character).slice(0, 8),
		partners: wordPartners(entry.character).slice(0, 12),
		strokes: strokesFor(entry.character),
		nearby: siblings.slice(Math.max(0, at - 4), at + 4).map((e) => ({
			character: e.character,
			meaning: e.meaning,
			reading: e.reading
		}))
	};
};
