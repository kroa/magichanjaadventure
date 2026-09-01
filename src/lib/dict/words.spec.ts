import { describe, expect, it } from 'vitest';
import {
	ALL_WORDS,
	describeWord,
	initialOf,
	relatedWords,
	wordEntry,
	wordsByInitial,
	wordsWith
} from './words';
import { entryOf } from './index';

describe('낱말 사전', () => {
	it('모든 낱말이 두 글자다', () => {
		const odd = ALL_WORDS.filter((w) => [...w.word].length !== 2);
		expect(odd.map((w) => w.word)).toEqual([]);
	});

	it('낱말마다 읽는 소리와 뜻이 있다', () => {
		const empty = ALL_WORDS.filter((w) => !w.reading.trim() || !w.meaning.trim());
		expect(empty.map((w) => w.word)).toEqual([]);
	});

	it('낱말이 겹치지 않는다', () => {
		expect(new Set(ALL_WORDS.map((w) => w.word)).size).toBe(ALL_WORDS.length);
	});

	it('가나다 순으로 정렬되어 있다', () => {
		const readings = ALL_WORDS.map((w) => w.reading);
		expect(readings).toEqual([...readings].sort((a, b) => a.localeCompare(b, 'ko')));
	});

	it('없는 낱말은 null 이다', () => {
		expect(wordEntry('없는말')).toBeNull();
	});

	it('낱말의 두 글자가 사전에 있다', () => {
		/*
		 * 두 글자 중 하나라도 1,000자 밖이면 낱말 페이지의 '글자로 풀어 보기' 가 반쪽이 된다.
		 * 놀이 쪽 목록에서 가져온 것이므로 사전 기준으로 다시 확인해 둔다.
		 */
		const orphan = ALL_WORDS.filter((w) => !entryOf(w.head) || !entryOf(w.tail));
		expect(orphan.map((w) => w.word)).toEqual([]);
	});
});

describe('낱말 잇기', () => {
	it('같은 글자를 쓰는 낱말이 자기 자신을 빼고 걸린다', () => {
		const some = ALL_WORDS.find((w) => wordsWith(w.head).length > 1);
		expect(some).toBeDefined();
		const { sharesHead } = relatedWords(some!.word);
		expect(sharesHead.some((w) => w.word === some!.word)).toBe(false);
		expect(sharesHead.every((w) => w.word.includes(some!.head))).toBe(true);
	});

	it('글자로 찾은 낱말은 그 글자를 담고 있다', () => {
		for (const ch of ['學', '國', '日']) {
			for (const w of wordsWith(ch)) expect(w.word).toContain(ch);
		}
	});

	it('없는 낱말은 빈 목록을 준다', () => {
		expect(relatedWords('없는말')).toEqual({ sharesHead: [], sharesTail: [] });
	});
});

describe('첫소리 묶음', () => {
	it('첫소리를 읽는 소리에서 뽑는다', () => {
		expect(initialOf('가격')).toBe('ㄱ');
		expect(initialOf('학교')).toBe('ㅎ');
		expect(initialOf('')).toBe('그 밖');
	});

	it('묶음을 다 합치면 전체가 된다', () => {
		const groups = wordsByInitial();
		expect(groups.flatMap((g) => g.words).length).toBe(ALL_WORDS.length);
		expect(new Set(groups.map((g) => g.initial)).size).toBe(groups.length);
	});
});

describe('낱말 풀이', () => {
	it('두 글자의 훈·음과 급수, 총획이 들어간다', () => {
		const e = wordEntry(ALL_WORDS[0].word)!;
		const text = describeWord(e);
		expect(text).toContain(e.reading);
		expect(text).toContain(e.meaning);
		expect(text).toContain(e.head!.meaning);
		expect(text).toContain(e.tail!.meaning);
		expect(text).toContain(`${e.head!.strokeCount + e.tail!.strokeCount}획`);
	});

	it('조사를 읽는 소리의 받침에 맞춘다', () => {
		// 받침이 있는 낱말은 '은', 없는 낱말은 '는'
		const withFinal = ALL_WORDS.find((w) => (w.reading.charCodeAt(1) - 0xac00) % 28 !== 0)!;
		const noFinal = ALL_WORDS.find((w) => (w.reading.charCodeAt(1) - 0xac00) % 28 === 0)!;
		expect(describeWord(wordEntry(withFinal.word)!)).toContain(`${withFinal.word}은`);
		expect(describeWord(wordEntry(noFinal.word)!)).toContain(`${noFinal.word}는`);
	});

	it('모든 낱말이 빈 풀이 없이 나온다', () => {
		const bad = ALL_WORDS.filter((w) => describeWord(wordEntry(w.word)!).length < 30);
		expect(bad.map((w) => w.word)).toEqual([]);
	});
});
