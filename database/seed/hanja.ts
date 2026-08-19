import { parseWords, type HanjaSeed, type RawHanja } from './types';
import { GRADE_8 } from './grade-8';
import { GRADE_7II } from './grade-7ii';
import { GRADE_7 } from './grade-7';
import { GRADE_6II } from './grade-6ii';
import { GRADE_6 } from './grade-6';
import { GRADE_5II } from './grade-5ii';
import { GRADE_5 } from './grade-5';

/**
 * 한자 500자 = 한국어문회 배정한자 8급 ~ 5급 누적.
 *
 * 임의로 500자를 고르지 않은 이유는 docs/04-CONTENT-PLAN.md §1 에 있다.
 * 요약하면: 검증된 난이도 순서이고, 7개 급수가 7개 지역과 그대로 맞아떨어지며,
 * 아이가 게임에서 지역을 깨면 실제 한자능력검정 범위를 익힌 것이 된다.
 */

interface GradeBlock {
	label: string;
	difficulty: number;
	areaId: number;
	levelRequired: number;
	rows: RawHanja[];
}

const BLOCKS: GradeBlock[] = [
	{ label: '8급', difficulty: 1, areaId: 1, levelRequired: 1, rows: GRADE_8 },
	{ label: '7급II', difficulty: 2, areaId: 2, levelRequired: 3, rows: GRADE_7II },
	{ label: '7급', difficulty: 3, areaId: 3, levelRequired: 6, rows: GRADE_7 },
	{ label: '6급II', difficulty: 4, areaId: 4, levelRequired: 10, rows: GRADE_6II },
	{ label: '6급', difficulty: 5, areaId: 5, levelRequired: 15, rows: GRADE_6 },
	{ label: '5급II', difficulty: 6, areaId: 6, levelRequired: 21, rows: GRADE_5II },
	{ label: '5급', difficulty: 7, areaId: 7, levelRequired: 28, rows: GRADE_5 }
];

function build(): HanjaSeed[] {
	const out: HanjaSeed[] = [];
	let id = 1;

	for (const block of BLOCKS) {
		block.rows.forEach((row, index) => {
			const [character, reading, meaning, strokes, category, words, description] = row;
			out.push({
				id: id++,
				character,
				reading,
				meaning,
				difficulty: block.difficulty,
				gradeLabel: block.label,
				levelRequired: block.levelRequired,
				areaId: block.areaId,
				category,
				strokeCount: strokes,
				exampleWords: parseWords(words),
				description,
				sortOrder: index + 1
			});
		});
	}

	return out;
}

export const HANJA_SEED: HanjaSeed[] = build();

export const HANJA_BY_AREA: Record<number, HanjaSeed[]> = HANJA_SEED.reduce(
	(acc, h) => {
		(acc[h.areaId] ??= []).push(h);
		return acc;
	},
	{} as Record<number, HanjaSeed[]>
);
