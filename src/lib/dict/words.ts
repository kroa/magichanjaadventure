import { WORDS, type Word } from '$lib/game/words';
import { entryOf, withParticle, type DictEntry } from './index';

/**
 * 한자어 — **사전의 두 번째 축.**
 *
 * ── 왜 낱말인가 ──────────────────────────────────────────────────────
 * 글자 1,000장은 이미 있다. 그런데 사람이 검색창에 치는 말은 글자가 아니라
 * 낱말인 경우가 훨씬 많다: `가격 한자`, `한자어 뜻`, `國語 무슨 뜻`.
 * 글자만 있는 사전은 그 물음에 답할 자리가 없다.
 *
 * 낱말 목록은 이미 놀이에 쓰려고 만들어 둔 것이 있다(815개). 놀이에서는
 * "제자리에 놓았는가" 를 판정하는 데 쓰지만, 사전에서는 **글자와 글자를 잇는 길**이다.
 * 價 페이지에서 價格 으로, 價格 에서 格 으로 — 막다른 길이 사라진다.
 *
 * ── 자동 생성이 아니라 조립이다 ──────────────────────────────────────
 * 낱말마다 값이 다섯 가지 다르다(읽는 소리, 뜻, 앞 글자의 훈·음·급수, 뒤 글자의 것,
 * 같은 글자를 쓰는 다른 낱말). 문장 틀은 같아도 나오는 내용은 낱말마다 다르다.
 */

export interface WordEntry {
	word: string;
	reading: string;
	meaning: string;
	head: DictEntry | null;
	tail: DictEntry | null;
}

const BY_WORD = new Map<string, Word>(WORDS.map((w) => [w.word, w]));

/** 가나다 순. 목록에서 읽기 좋은 순서는 한자 코드 순이 아니라 **읽는 소리** 순이다 */
export const ALL_WORDS: readonly Word[] = [...WORDS].sort((a, b) =>
	a.reading.localeCompare(b.reading, 'ko')
);

export function wordEntry(word: string): WordEntry | null {
	const w = BY_WORD.get(word);
	if (!w) return null;
	return {
		word: w.word,
		reading: w.reading,
		meaning: w.meaning,
		head: entryOf(w.head),
		tail: entryOf(w.tail)
	};
}

/**
 * 같은 글자를 쓰는 다른 낱말.
 *
 * 이 목록이 페이지끼리 이어 주는 실이다. 앞 글자를 함께 쓰는 것과
 * 뒤 글자를 함께 쓰는 것을 나눠 준다 — 뭉뚱그리면 왜 걸렸는지 알 수 없다.
 */
export function relatedWords(word: string): { sharesHead: Word[]; sharesTail: Word[] } {
	const w = BY_WORD.get(word);
	if (!w) return { sharesHead: [], sharesTail: [] };
	return {
		sharesHead: ALL_WORDS.filter(
			(o) => o.word !== w.word && (o.head === w.head || o.tail === w.head)
		),
		sharesTail: ALL_WORDS.filter(
			(o) => o.word !== w.word && (o.head === w.tail || o.tail === w.tail)
		)
	};
}

/** 이 글자가 들어가는 낱말 전부 */
export function wordsWith(character: string): Word[] {
	return ALL_WORDS.filter((w) => w.head === character || w.tail === character);
}

/**
 * 첫소리(ㄱ~ㅎ)로 묶는다.
 *
 * 815개를 한 줄로 늘어놓으면 아무도 찾지 못한다. 종이 사전이 그러듯
 * 첫소리로 나누면 아는 낱말은 바로 짚고, 모르는 낱말은 훑어보게 된다.
 */
const CHOSUNG = [
	'ㄱ',
	'ㄲ',
	'ㄴ',
	'ㄷ',
	'ㄸ',
	'ㄹ',
	'ㅁ',
	'ㅂ',
	'ㅃ',
	'ㅅ',
	'ㅆ',
	'ㅇ',
	'ㅈ',
	'ㅉ',
	'ㅊ',
	'ㅋ',
	'ㅌ',
	'ㅍ',
	'ㅎ'
];

export function initialOf(reading: string): string {
	const code = reading.charCodeAt(0) - 0xac00;
	if (!Number.isFinite(code) || code < 0 || code > 11171) return '그 밖';
	return CHOSUNG[Math.floor(code / 588)];
}

export function wordsByInitial(): { initial: string; words: Word[] }[] {
	const buckets = new Map<string, Word[]>();
	for (const w of ALL_WORDS) {
		const k = initialOf(w.reading);
		const list = buckets.get(k);
		if (list) list.push(w);
		else buckets.set(k, [w]);
	}
	// 첫소리 차례대로. 사전 순서는 ㄱ·ㄲ·ㄴ… 이고 '그 밖'은 맨 뒤다
	return [...buckets.entries()]
		.sort((a, b) => {
			const ia = CHOSUNG.indexOf(a[0]);
			const ib = CHOSUNG.indexOf(b[0]);
			return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
		})
		.map(([initial, words]) => ({ initial, words }));
}

/**
 * 낱말 설명을 **글자에서 조립한다.**
 *
 * 뜻풀이는 이미 목록에 있다(‘값’). 여기서 더하는 것은 **왜 그 뜻이 되는가** 다 —
 * 價(값 가) 와 格(격식 격) 이 만나 ‘값’ 이 된다는, 한자어를 배우는 이유 그 자체다.
 */
export function describeWord(e: WordEntry): string {
	const out: string[] = [];
	const named = (d: DictEntry | null, ch: string) => (d ? `${ch}(${d.meaning} ${d.reading})` : ch);

	out.push(
		`${withParticle(e.word, e.reading, '은는')} '${e.reading}' 이라 읽고, 뜻은 '${e.meaning}' 이다.`
	);

	if (e.head && e.tail) {
		out.push(
			`앞의 ${withParticle(named(e.head, e.word[0]), e.head.reading, '과와')} ` +
				`뒤의 ${withParticle(named(e.tail, e.word[1]), e.tail.reading, '이가')} 만나 이룬 한자어다.`
		);
		const grades = [e.head.gradeLabel, e.tail.gradeLabel];
		out.push(
			grades[0] === grades[1]
				? `두 글자 모두 한국어문회 ${grades[0]} 배정한자다.`
				: `한국어문회 급수로는 각각 ${grades[0]}, ${grades[1]} 배정한자다.`
		);
		out.push(`총획은 ${e.head.strokeCount + e.tail.strokeCount}획이다.`);
	}

	return out.join(' ');
}
