/**
 * 한자 시드 데이터 타입.
 *
 * 작성 규칙
 *  - 훈(meaning) · 음(reading) 은 한국어문회 표기를 따른다
 *  - 설명(description)은 **직접 쓴 문장**만 쓴다. 교재/사전 문장을 옮기지 않는다
 *    (docs/06-ASSETS-LICENSE.md §4)
 *  - 예시 단어는 초등학생이 실제로 들어봤을 법한 것으로 고른다
 *
 * 튜플로 쓰는 이유: 500자를 객체로 쓰면 키 이름이 500번 반복되어
 * 파일이 3배 커지고 읽기도 어렵다.
 */
export type RawHanja = [
	/** 한자 */
	character: string,
	/** 음 (예: '수') */
	reading: string,
	/** 훈 (예: '물') */
	meaning: string,
	/** 획수 */
	strokes: number,
	/** 분류 (자연/숫자/사람/방향/시간/학교/동작/색/생활) */
	category: string,
	/** 예시 단어. "단어:읽기:뜻" 을 | 로 구분 */
	words: string,
	/** 아이 눈높이 한 줄 설명 */
	description: string
];

export interface ExampleWord {
	word: string;
	reading: string;
	meaning: string;
}

export interface HanjaSeed {
	id: number;
	character: string;
	reading: string;
	meaning: string;
	difficulty: number;
	gradeLabel: string;
	levelRequired: number;
	areaId: number;
	category: string;
	strokeCount: number;
	exampleWords: ExampleWord[];
	description: string;
	sortOrder: number;
}

export function parseWords(raw: string): ExampleWord[] {
	if (!raw.trim()) return [];
	return raw.split('|').map((chunk) => {
		const [word, reading, meaning] = chunk.split(':');
		return { word, reading, meaning };
	});
}
