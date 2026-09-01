import { error } from '@sveltejs/kit';
import {
	ALL,
	buildsInto,
	charactersOfGrade,
	entryOf,
	madeOf,
	strokesFor,
	summarize
} from '$lib/dict';
import { wordsWith } from '$lib/dict/words';
import type { EntryGenerator, PageLoad } from './$types';

interface WordLink {
	word: string;
	reading: string;
	meaning: string;
	/** 낱말 페이지가 있는가 */
	linked: boolean;
}

function mergedWords(entry: {
	character: string;
	exampleWords: { word: string; reading: string; meaning: string }[];
}): WordLink[] {
	const out: WordLink[] = wordsWith(entry.character).map((w) => ({
		word: w.word,
		reading: w.reading,
		meaning: w.meaning,
		linked: true
	}));
	const seen = new Set(out.map((w) => w.word));
	for (const w of entry.exampleWords) {
		if (seen.has(w.word)) continue;
		out.push({ word: w.word, reading: w.reading, meaning: w.meaning, linked: false });
	}
	return out;
}

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
		/*
		 * 쓰이는 낱말 — 두 가지 묶음을 **하나로 합친다.**
		 *
		 * 시드의 예문과 낱말 목록(815개)은 겹치는 것이 있다. 따로 두면 한 페이지에
		 * 같은 낱말이 두 번 나온다. 낱말 페이지가 있는 것은 길을 열어 주고,
		 * 없는 것은 그대로 보여 준다 — 쓸 수 있는 예문을 링크가 없다고 버릴 이유는 없다.
		 */
		words: mergedWords(entry).slice(0, 12),
		strokes: strokesFor(entry.character),
		nearby: siblings.slice(Math.max(0, at - 4), at + 4).map((e) => ({
			character: e.character,
			meaning: e.meaning,
			reading: e.reading
		}))
	};
};
