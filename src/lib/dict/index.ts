import { HANJA_SEED } from '../../../database/seed/hanja';
import type { ExampleWord } from '../../../database/seed/types';
import { strokesOf } from '$lib/game/stroke-data';
import { FUSION_RECIPES } from '$lib/game/fusion';
import { partnersOf } from '$lib/game/words';
import type { Stroke } from '$lib/game/stroke';

/**
 * 한자 사전 — **공개 영역의 데이터.**
 *
 * ── 왜 게임과 따로 두는가 ────────────────────────────────────────────
 * 게임 화면은 로그인한 아이의 진행도(배운 글자·레벨·보석)에 따라 달라진다.
 * 사전은 그 반대다 — **누가 보든 같고, 빌드할 때 이미 결정되어 있다.**
 * 그래서 D1 을 쓰지 않고 시드에서 직접 읽는다. 프리렌더가 가능해지고,
 * 크롤러가 로그인 없이 볼 수 있으며, 응답에 서버 시간이 들지 않는다.
 *
 * ── 말투에 대하여 ────────────────────────────────────────────────────
 * 시드의 `description` 은 **아이 눈높이로 쓰여 있다**("~예요").
 * 사전 페이지는 검색으로 들어오는 어른이 주 독자다(작명·사자성어·검정시험).
 * 그래서 그 문장을 그대로 쓰지 않고, 사전 어투의 설명을 따로 만든다.
 * 이건 문체 취향이 아니라 **이 섹션이 누구를 향하는가**의 문제다 —
 * 광고 정책도 "언어와 그 밖의 특성"을 대상 판정 요소로 본다.
 */

export interface DictEntry {
	character: string;
	/** 음 (예: '명') */
	reading: string;
	/** 훈 (예: '밝을') */
	meaning: string;
	strokeCount: number;
	gradeLabel: string;
	/** 시드의 분류 (자연/숫자/사람/방향/시간/학교/동작/색/생활) */
	category: string;
	exampleWords: ExampleWord[];
	/** 아이 눈높이 원문. 사전 페이지에서는 쓰지 않는다 */
	childNote: string;
	sortOrder: number;
}

const ORDER = ['8급', '7급II', '7급', '6급II', '6급', '5급II', '5급', '4급II', '4급'];

const BY_CHAR = new Map<string, DictEntry>(
	HANJA_SEED.map((h) => [
		h.character,
		{
			character: h.character,
			reading: h.reading,
			meaning: h.meaning,
			strokeCount: h.strokeCount,
			gradeLabel: h.gradeLabel,
			category: h.category,
			exampleWords: h.exampleWords,
			childNote: h.description,
			sortOrder: h.sortOrder
		}
	])
);

export const ALL: DictEntry[] = [...BY_CHAR.values()];

export function entryOf(character: string): DictEntry | null {
	return BY_CHAR.get(character) ?? null;
}

/** 급수 목록 — 쉬운 것부터 */
export const GRADES: { label: string; count: number }[] = ORDER.map((label) => ({
	label,
	count: ALL.filter((e) => e.gradeLabel === label).length
})).filter((g) => g.count > 0);

export function gradeExists(label: string): boolean {
	return GRADES.some((g) => g.label === label);
}

/** 그 급수의 글자들. 시드 순서를 그대로 따른다 (교재의 배열 순서다) */
export function charactersOfGrade(label: string): DictEntry[] {
	return ALL.filter((e) => e.gradeLabel === label).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 이 글자를 만드는 조합. `日 + 月 = 明` 같은 것.
 *
 * 여느 한자 사전에 없는 각도라 이 사전의 고유한 부분이다.
 * 부수(部首) 와는 다르다 — 부수는 색인용 분류이고, 이건 **글자를 이루는 조각**이다.
 * 부수 데이터는 아직 없으므로 부수라고 부르지 않는다.
 */
export function madeOf(character: string): { parts: string[]; note: string } | null {
	const recipe = FUSION_RECIPES.find((r) => r.result === character);
	if (!recipe) return null;
	return { parts: [...recipe.parts], note: recipe.story };
}

/** 이 글자가 조각으로 쓰이는 다른 글자들 */
export function buildsInto(character: string): string[] {
	return FUSION_RECIPES.filter((r) => r.parts.includes(character)).map((r) => r.result);
}

/** 이 글자로 만드는 두 글자 낱말의 짝 */
export function wordPartners(character: string): string[] {
	return partnersOf(character);
}

/** 획순 좌표가 있으면 준다 (지금은 8급·7급II 의 99자) */
export function strokesFor(character: string): Stroke[] | null {
	return strokesOf(character);
}

/**
 * 사전 어투의 설명을 **구조에서 만든다.**
 *
 * 1000자에 사람이 쓴 문장을 새로 다는 것이 이상적이지만, 그 전까지 페이지가
 * 비어 있으면 안 된다. 항목마다 다른 값(획수·급수·조각·용례)이 들어가므로
 * 자동 생성 문구라도 페이지마다 내용이 실제로 다르다.
 */

/**
 * 한자 뒤에 붙는 조사를 **읽는 소리로 고른다.**
 *
 * `明은(는)` 처럼 두 개를 다 적어 두면 읽는 사람에게 기계가 쓴 티가 나고,
 * 광고 심사에서도 "자동 생성 페이지" 로 읽히기 쉽다. 한자는 눈으로는 뜻이지만
 * 입으로는 음이므로(明 → 명), **음의 마지막 글자에 받침이 있는지**로 고르면 된다.
 */
function hasFinal(reading: string): boolean {
	const last = reading.trim().slice(-1);
	const code = last.charCodeAt(0) - 0xac00;
	// 음이 비었거나 한글이 아니면 받침이 없는 것으로 본다 (NaN 은 비교가 전부 false 라 따로 막는다)
	if (!Number.isFinite(code) || code < 0 || code > 11171) return false;
	return code % 28 !== 0;
}

type Particle = '은는' | '이가' | '을를' | '과와';

export function withParticle(word: string, reading: string, kind: Particle): string {
	const f = hasFinal(reading);
	const pick: Record<Particle, [string, string]> = {
		은는: ['은', '는'],
		이가: ['이', '가'],
		을를: ['을', '를'],
		과와: ['과', '와']
	};
	return word + pick[kind][f ? 0 : 1];
}

export function summarize(e: DictEntry): string {
	const out: string[] = [];
	out.push(
		`${withParticle(e.character, e.reading, '은는')} 한국어문회 ${e.gradeLabel} 배정한자로, ` +
			`훈과 음은 '${e.meaning} ${e.reading}'이고 총획은 ${e.strokeCount}획이다.`
	);

	const made = madeOf(e.character);
	if (made) {
		// 조각에도 훈·음을 달아 준다 — 조각만 늘어놓으면 읽는 사람이 다시 찾아봐야 한다
		const named = made.parts.map((p) => {
			const q = entryOf(p);
			return q ? `${p}(${q.meaning} ${q.reading})` : p;
		});
		const head = named
			.slice(0, -1)
			.map((n, i) => withParticle(n, entryOf(made.parts[i])?.reading ?? n, '과와'))
			.join(' ');
		const lastPart = made.parts[made.parts.length - 1];
		const tail = withParticle(
			named[named.length - 1],
			entryOf(lastPart)?.reading ?? lastPart,
			'을를'
		);
		out.push(`${head} ${tail} 합쳐 이룬 글자다.`.trim());
	}

	const into = buildsInto(e.character);
	if (into.length) {
		out.push(`${into.slice(0, 3).join('·')} 같은 글자를 이루는 조각으로도 쓰인다.`);
	}

	if (e.exampleWords.length) {
		out.push(
			`쓰이는 낱말로는 ${e.exampleWords
				.slice(0, 2)
				.map((w) => `${w.word}(${w.reading}, ${w.meaning})`)
				.join(', ')} 등이 있다.`
		);
	}
	return out.join(' ');
}
