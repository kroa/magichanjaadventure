/**
 * 퀴즈 문항 생성 — 순수 함수.
 *
 * 서버가 문제를 만들고, 채점도 서버가 한다.
 * 채점에 문제 원본을 저장할 필요가 없다: 정답은 (hanjaId, questionType) 만으로
 * 언제든 DB 에서 다시 유도할 수 있기 때문이다. → 세션 상태 없이 서버 권위가 성립한다.
 */

export type QuestionType = 'meaning' | 'reading' | 'character' | 'word';

export interface QuizHanja {
	id: number;
	character: string;
	reading: string;
	meaning: string;
	exampleWords: { word: string; reading: string; meaning: string }[];
}

export interface Question {
	hanjaId: number;
	type: QuestionType;
	/** 화면 한가운데 크게 보여 줄 것 (한자 또는 단어) */
	subject: string;
	/** subject 를 한자 폰트로 그릴지 */
	subjectIsHanja: boolean;
	prompt: string;
	options: string[];
	/** 클라이언트가 즉시 피드백을 그리기 위한 값. 서버도 같은 함수로 다시 계산한다. */
	answer: string;
}

export const QUESTION_TYPES: QuestionType[] = ['meaning', 'reading', 'character', 'word'];

/** (hanja, type) 의 정답. 서버 채점의 기준이다. */
export function correctAnswerFor(hanja: QuizHanja, type: QuestionType): string | null {
	switch (type) {
		case 'meaning':
			return hanja.meaning;
		case 'reading':
			return hanja.reading;
		case 'character':
			return hanja.character;
		case 'word':
			return hanja.exampleWords[0]?.meaning ?? null;
	}
}

function optionFor(hanja: QuizHanja, type: QuestionType): string | null {
	return correctAnswerFor(hanja, type);
}

/** 배열을 섞는다. rng 를 주입받아 테스트에서 결정론적으로 만들 수 있게 한다. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * 이 한자로 낼 수 있는 문제 유형.
 * 예시 단어가 없으면 'word' 문제를 낼 수 없다.
 */
export function availableTypes(hanja: QuizHanja): QuestionType[] {
	return QUESTION_TYPES.filter((type) => correctAnswerFor(hanja, type) !== null);
}

export interface BuildOptions {
	optionCount?: number;
	rng?: () => number;
}

/**
 * 문항 하나를 만든다.
 *
 * 오답 보기는 **정답과 값이 겹치지 않아야** 한다.
 * 예를 들어 훈이 똑같은 한자가 보기로 들어오면 정답이 둘이 되어 버린다.
 * 보기가 모자라면 만들 수 있는 만큼만 만들고, 2개도 못 채우면 null 을 준다.
 */
export function buildQuestion(
	hanja: QuizHanja,
	distractors: QuizHanja[],
	type: QuestionType,
	options: BuildOptions = {}
): Question | null {
	const optionCount = options.optionCount ?? 4;
	const rng = options.rng ?? Math.random;

	const answer = correctAnswerFor(hanja, type);
	if (!answer) return null;

	const seen = new Set<string>([answer]);
	const wrong: string[] = [];

	for (const candidate of distractors) {
		if (wrong.length >= optionCount - 1) break;
		if (candidate.id === hanja.id) continue;
		const value = optionFor(candidate, type);
		if (!value || seen.has(value)) continue;
		seen.add(value);
		wrong.push(value);
	}

	if (wrong.length < 1) return null;

	const word = hanja.exampleWords[0];

	const subject =
		type === 'character'
			? `${hanja.meaning} ${hanja.reading}`
			: type === 'word'
				? (word?.word ?? hanja.character)
				: hanja.character;

	const prompt =
		type === 'meaning'
			? '이 한자의 뜻은 무엇일까요?'
			: type === 'reading'
				? '이 한자는 어떻게 읽을까요?'
				: type === 'character'
					? '이 뜻과 음을 가진 한자는?'
					: '이 낱말의 뜻은 무엇일까요?';

	return {
		hanjaId: hanja.id,
		type,
		subject,
		subjectIsHanja: type !== 'character',
		prompt,
		options: shuffle([answer, ...wrong], rng),
		answer
	};
}

/**
 * 아이가 처음 보는 한자는 쉬운 유형부터 낸다.
 * 많이 맞힌 한자일수록 어려운 유형(한자 고르기, 낱말 뜻)이 나온다.
 */
export function pickQuestionType(
	hanja: QuizHanja,
	correctCount: number,
	rng: () => number = Math.random
): QuestionType {
	const available = availableTypes(hanja);
	const easy = available.filter((t) => t === 'meaning' || t === 'reading');
	const hard = available.filter((t) => t === 'character' || t === 'word');

	const pool =
		correctCount < 2 ? easy : correctCount < 5 ? available : hard.length > 0 ? hard : available;
	const usable = pool.length > 0 ? pool : available;
	return usable[Math.floor(rng() * usable.length)];
}
