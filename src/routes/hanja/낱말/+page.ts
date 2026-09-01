import { ALL_WORDS, wordsByInitial } from '$lib/dict/words';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => ({
	total: ALL_WORDS.length,
	groups: wordsByInitial().map((g) => ({
		initial: g.initial,
		words: g.words.map((w) => ({ word: w.word, reading: w.reading, meaning: w.meaning }))
	}))
});
