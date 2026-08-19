import { describe, expect, it } from 'vitest';
import {
	availableTypes,
	buildQuestion,
	correctAnswerFor,
	pickQuestionType,
	shuffle,
	type QuizHanja
} from './quiz';

const 水: QuizHanja = {
	id: 14,
	character: '水',
	reading: '수',
	meaning: '물',
	exampleWords: [{ word: '水泳', reading: '수영', meaning: '헤엄치기' }]
};

const 火: QuizHanja = {
	id: 13,
	character: '火',
	reading: '화',
	meaning: '불',
	exampleWords: [{ word: '火山', reading: '화산', meaning: '불 뿜는 산' }]
};

const 木: QuizHanja = {
	id: 15,
	character: '木',
	reading: '목',
	meaning: '나무',
	exampleWords: [{ word: '木手', reading: '목수', meaning: '나무 다루는 사람' }]
};

const 山: QuizHanja = {
	id: 18,
	character: '山',
	reading: '산',
	meaning: '메',
	exampleWords: [{ word: '山川', reading: '산천', meaning: '산과 내' }]
};

/** 결정론적 rng — 항상 첫 요소를 고르고 섞지 않는다 */
const stableRng = () => 0;

describe('correctAnswerFor', () => {
	it('유형별 정답을 준다', () => {
		expect(correctAnswerFor(水, 'meaning')).toBe('물');
		expect(correctAnswerFor(水, 'reading')).toBe('수');
		expect(correctAnswerFor(水, 'character')).toBe('水');
		expect(correctAnswerFor(水, 'word')).toBe('헤엄치기');
	});

	it('예시 단어가 없으면 word 유형은 낼 수 없다', () => {
		const noWords: QuizHanja = { ...水, exampleWords: [] };
		expect(correctAnswerFor(noWords, 'word')).toBeNull();
		expect(availableTypes(noWords)).not.toContain('word');
	});
});

describe('buildQuestion', () => {
	it('보기 4개를 만들고 정답이 정확히 하나 들어 있다', () => {
		const q = buildQuestion(水, [火, 木, 山], 'meaning', { rng: stableRng });
		expect(q).not.toBeNull();
		expect(q!.options).toHaveLength(4);
		expect(q!.options.filter((o) => o === q!.answer)).toHaveLength(1);
	});

	it('보기에 중복이 없다', () => {
		const q = buildQuestion(水, [火, 木, 山], 'reading', { rng: stableRng });
		expect(new Set(q!.options).size).toBe(q!.options.length);
	});

	it('정답과 같은 값을 가진 오답은 보기에서 제외한다', () => {
		// 훈이 '물'로 같은 가짜 한자를 오답 후보에 넣는다
		const 같은뜻: QuizHanja = { ...火, id: 999, character: '氵', meaning: '물' };
		const q = buildQuestion(水, [같은뜻, 木, 山], 'meaning', { rng: stableRng });
		expect(q!.options.filter((o) => o === '물')).toHaveLength(1);
	});

	it('자기 자신은 오답 보기가 되지 않는다', () => {
		const q = buildQuestion(水, [水, 火, 木, 山], 'character', { rng: stableRng });
		expect(q!.options.filter((o) => o === '水')).toHaveLength(1);
	});

	it('오답 후보가 하나도 없으면 문제를 만들지 않는다', () => {
		expect(buildQuestion(水, [], 'meaning')).toBeNull();
	});

	it('character 유형은 뜻과 음을 문제로 보여 준다', () => {
		const q = buildQuestion(水, [火, 木, 山], 'character', { rng: stableRng });
		expect(q!.subject).toBe('물 수');
		expect(q!.subjectIsHanja).toBe(false);
	});

	it('word 유형은 예시 낱말을 문제로 보여 준다', () => {
		const q = buildQuestion(水, [火, 木, 山], 'word', { rng: stableRng });
		expect(q!.subject).toBe('水泳');
		expect(q!.answer).toBe('헤엄치기');
	});

	it('보기가 모자라면 있는 만큼만 만든다', () => {
		const q = buildQuestion(水, [火], 'meaning', { rng: stableRng });
		expect(q!.options).toHaveLength(2);
		expect(q!.options).toContain('물');
	});
});

describe('pickQuestionType', () => {
	it('처음 보는 한자는 쉬운 유형(뜻/음)으로 낸다', () => {
		for (let i = 0; i < 20; i++) {
			const type = pickQuestionType(水, 0, Math.random);
			expect(['meaning', 'reading']).toContain(type);
		}
	});

	it('많이 맞힌 한자는 어려운 유형으로 낸다', () => {
		for (let i = 0; i < 20; i++) {
			const type = pickQuestionType(水, 10, Math.random);
			expect(['character', 'word']).toContain(type);
		}
	});
});

describe('shuffle', () => {
	it('원본을 바꾸지 않고 같은 원소를 유지한다', () => {
		const source = [1, 2, 3, 4, 5];
		const result = shuffle(source, Math.random);
		expect(source).toEqual([1, 2, 3, 4, 5]);
		expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
	});
});
