import { error } from '@sveltejs/kit';
import { ALL_WORDS, describeWord, relatedWords, wordEntry } from '$lib/dict/words';
import type { EntryGenerator, PageLoad } from './$types';

/** 낱말 815개를 전부 굽는다 */
export const entries: EntryGenerator = () => ALL_WORDS.map((w) => ({ word: w.word }));

const RELATED = 8;

export const load: PageLoad = ({ params }) => {
	const entry = wordEntry(params.word);
	if (!entry) error(404, '그런 낱말은 이 사전에 없습니다');

	const related = relatedWords(params.word);
	const trim = (list: typeof related.sharesHead) =>
		list.slice(0, RELATED).map((w) => ({ word: w.word, reading: w.reading, meaning: w.meaning }));

	return {
		entry,
		summary: describeWord(entry),
		sharesHead: trim(related.sharesHead),
		sharesTail: trim(related.sharesTail)
	};
};
