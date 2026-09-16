import { error } from '@sveltejs/kit';
import { entryOf, madeOf, strokesFor, summarize } from '$lib/dict';
import { ALL_WORDS, describeWord, homophones, relatedWords, wordEntry } from '$lib/dict/words';
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

	/*
	 * 낱말을 찾은 사람은 대개 **그 글자를 쓸 줄 모른다.**
	 *
	 * 획순은 이 사전이 따로 만들어 가진 것인데(99자), 지금까지 글자 페이지에만
	 * 있었다. 낱말에서 한 번 더 눌러 들어가야 볼 수 있다는 뜻이고, 대부분은 안 누른다.
	 * 좌표가 있는 글자는 여기서 바로 보여 준다 — 없는 글자는 조용히 빠진다.
	 */
	const strokes = [...params.word].map((ch) => ({ character: ch, strokes: strokesFor(ch) }));

	/*
	 * 글자마다의 사전 풀이를 낱말 페이지에도 싣는다.
	 *
	 * 낱말 페이지는 두 글자를 훈·음·급수·획수로만 소개하고 있었다. 그래서
	 * 太陽 처럼 두 글자가 다른 낱말에 안 쓰이는 낱말은 페이지에 실을 것이
	 * 거의 없었다(본문 186자). 정작 그 사람이 알고 싶은 것은 **각 글자가 무엇인가**인데
	 * 그걸 보려면 글자 페이지로 한 번 더 들어가야 했다.
	 */
	const explain = [...params.word]
		.map((ch) => ({ character: ch, entry: entryOf(ch) }))
		.filter((x): x is { character: string; entry: NonNullable<typeof x.entry> } => Boolean(x.entry))
		.map((x) => ({ character: x.character, text: summarize(x.entry) }));

	return {
		entry,
		explain,
		summary: describeWord(entry),
		sharesHead: trim(related.sharesHead),
		sharesTail: trim(related.sharesTail),
		homophones: homophones(params.word).map((w) => ({
			word: w.word,
			reading: w.reading,
			meaning: w.meaning
		})),
		strokes: strokes.filter(
			(s): s is { character: string; strokes: NonNullable<typeof s.strokes> } => Boolean(s.strokes)
		),
		/** 조각으로 이루어진 글자라면 그 짜임도 보여 준다 (日 + 月 = 明) */
		parts: [...params.word]
			.map((ch) => ({ character: ch, recipe: madeOf(ch) }))
			.filter((p): p is { character: string; recipe: NonNullable<typeof p.recipe> } =>
				Boolean(p.recipe)
			)
	};
};
