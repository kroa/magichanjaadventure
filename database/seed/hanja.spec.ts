import { describe, expect, it } from 'vitest';
import { HANJA_SEED } from './hanja';
import { AREAS } from '../../src/lib/game/areas';

/**
 * 한자 데이터 무결성 검사.
 *
 * 콘텐츠 데이터의 오류는 **아이에게 잘못된 지식을 가르치는 버그**다.
 * 화면이 깨지는 버그보다 심각하게 취급한다.
 */
describe('한자 시드 데이터', () => {
	it('정확히 500자다', () => {
		expect(HANJA_SEED).toHaveLength(500);
	});

	it('중복된 한자가 없다', () => {
		const seen = new Map<string, number[]>();
		for (const h of HANJA_SEED) {
			const list = seen.get(h.character) ?? [];
			list.push(h.id);
			seen.set(h.character, list);
		}
		const duplicates = [...seen.entries()]
			.filter(([, ids]) => ids.length > 1)
			.map(([char, ids]) => `${char}(id ${ids.join(', ')})`);

		expect(duplicates, `중복 한자: ${duplicates.join(' / ')}`).toEqual([]);
	});

	it('id 가 1부터 500까지 빠짐없이 이어진다', () => {
		const ids = HANJA_SEED.map((h) => h.id);
		expect(ids).toEqual(Array.from({ length: 500 }, (_, i) => i + 1));
	});

	it('각 지역의 한자 수가 지역 정의와 일치한다', () => {
		for (const area of AREAS) {
			const count = HANJA_SEED.filter((h) => h.areaId === area.id).length;
			expect(count, `${area.name}(${area.grade})`).toBe(area.hanjaCount);
		}
	});

	it('모든 필수 필드가 비어 있지 않다', () => {
		const empty = HANJA_SEED.filter(
			(h) =>
				!h.character.trim() ||
				!h.reading.trim() ||
				!h.meaning.trim() ||
				!h.category.trim() ||
				!h.description.trim()
		).map((h) => `${h.id}:${h.character}`);

		expect(empty, `빈 필드: ${empty.join(', ')}`).toEqual([]);
	});

	it('한자는 정확히 한 글자이며 CJK 영역에 있다', () => {
		const bad = HANJA_SEED.filter((h) => !/^[一-鿿]$/.test(h.character)).map(
			(h) => `${h.id}:${h.character}`
		);
		expect(bad, `한자가 아닌 값: ${bad.join(', ')}`).toEqual([]);
	});

	it('음(reading)은 한글 1~2자다', () => {
		const bad = HANJA_SEED.filter((h) => !/^[가-힣]{1,2}$/.test(h.reading)).map(
			(h) => `${h.id}:${h.character}(${h.reading})`
		);
		expect(bad, `잘못된 음: ${bad.join(', ')}`).toEqual([]);
	});

	it('훈(meaning)은 한글로만 되어 있다', () => {
		const bad = HANJA_SEED.filter((h) => !/^[가-힣 ]+$/.test(h.meaning)).map(
			(h) => `${h.id}:${h.character}(${h.meaning})`
		);
		expect(bad, `잘못된 훈: ${bad.join(', ')}`).toEqual([]);
	});

	it('획수는 1~30 사이다', () => {
		const bad = HANJA_SEED.filter((h) => h.strokeCount < 1 || h.strokeCount > 30).map(
			(h) => `${h.id}:${h.character}(${h.strokeCount})`
		);
		expect(bad, `획수 이상: ${bad.join(', ')}`).toEqual([]);
	});

	it('예시 단어가 최소 1개이고 형식이 올바르다', () => {
		const bad = HANJA_SEED.filter(
			(h) =>
				h.exampleWords.length === 0 ||
				h.exampleWords.some((w) => !w.word?.trim() || !w.reading?.trim() || !w.meaning?.trim())
		).map((h) => `${h.id}:${h.character}`);

		expect(bad, `예시 단어 문제: ${bad.join(', ')}`).toEqual([]);
	});

	it('예시 단어는 한자로만 되어 있다 (한글/영문 혼입 금지)', () => {
		const bad: string[] = [];
		for (const h of HANJA_SEED) {
			for (const w of h.exampleWords) {
				if (!/^[一-鿿]+$/.test(w.word)) bad.push(`${h.character} → ${w.word}`);
			}
		}
		expect(bad, `혼입된 예시 단어: ${bad.join(', ')}`).toEqual([]);
	});

	it('예시 단어의 읽기는 한글이다', () => {
		const bad: string[] = [];
		for (const h of HANJA_SEED) {
			for (const w of h.exampleWords) {
				if (!/^[가-힣]+$/.test(w.reading)) bad.push(`${h.character} → ${w.word}(${w.reading})`);
			}
		}
		expect(bad, `읽기 형식 문제: ${bad.join(', ')}`).toEqual([]);
	});

	it('난이도와 지역이 1:1로 대응한다', () => {
		for (const h of HANJA_SEED) {
			expect(h.areaId, `${h.character}`).toBe(h.difficulty);
		}
	});

	it('난이도가 오를수록 해금 레벨이 낮아지지 않는다', () => {
		const byDifficulty = new Map<number, number>();
		for (const h of HANJA_SEED) byDifficulty.set(h.difficulty, h.levelRequired);
		const levels = [...byDifficulty.entries()].sort((a, b) => a[0] - b[0]).map(([, lv]) => lv);
		for (let i = 1; i < levels.length; i++) {
			expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
		}
	});
});
