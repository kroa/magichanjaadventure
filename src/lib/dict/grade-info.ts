import { GRADES, charactersOfGrade } from './index';

/**
 * 급수 체계 자체에 대한 정보.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────
 * 사람들이 검색창에 치는 말 중에 `7급 한자 개수` 가 있다. 그런데 그 사람이
 * 알고 싶은 것은 **7급에 새로 나오는 50자가 아니라 누적 150자**다 —
 * 시험은 누적으로 나오기 때문이다. 상위 급수는 하위 급수를 포함한다.
 *
 * 우리 급수표는 신규 배정한자만 늘어놓고 있어서 그 물음에 답하지 못했다.
 *
 * ── 값의 출처 ────────────────────────────────────────────────────────
 * 한국어문회가 배포하는 배정한자 마스터 파일에서 급수별로 세었다.
 * 8급 50 · 7급II 50 · 7급 50 · 6급II 75 · 6급 75 · 5급II 100 · 5급 100 ·
 * 4급II 250 · 4급 250 → 누적 50·100·150·225·300·400·500·750·1000.
 *
 * ── 우리가 다 갖고 있지는 않다 ───────────────────────────────────────
 * 이 사전에 실린 자수는 급수에 따라 공식 자수보다 적다(5급 94/100,
 * 4급II 232/250, 4급 246/250). 그 차이를 감추면 급수표가 거짓말을 하게 되므로
 * **둘을 나란히 보여 준다.**
 */

/** 급수별 신규 배정 자수 — 한국어문회 공식 */
const OFFICIAL_NEW: Record<string, number> = {
	'8급': 50,
	'7급II': 50,
	'7급': 50,
	'6급II': 75,
	'6급': 75,
	'5급II': 100,
	'5급': 100,
	'4급II': 250,
	'4급': 250
};

export interface GradeInfo {
	label: string;
	/** 그 급수에 새로 나오는 글자 수 (공식) */
	official: number;
	/** 8급부터 그 급수까지 다 합친 글자 수 (공식). 시험은 이 범위에서 나온다 */
	cumulative: number;
	/** 이 사전에 실제로 실린 글자 수 */
	ours: number;
	/** 공식 자수를 빠짐없이 담고 있는가 */
	complete: boolean;
}

export const GRADE_INFO: GradeInfo[] = (() => {
	let cum = 0;
	return GRADES.map((g) => {
		const official = OFFICIAL_NEW[g.label] ?? g.count;
		cum += official;
		return {
			label: g.label,
			official,
			cumulative: cum,
			ours: g.count,
			complete: g.count === official
		};
	});
})();

export function gradeInfoOf(label: string): GradeInfo | null {
	return GRADE_INFO.find((g) => g.label === label) ?? null;
}

/** 그 급수까지 이 사전이 실제로 담고 있는 글자 수 */
export function ourCumulative(label: string): number {
	let n = 0;
	for (const g of GRADE_INFO) {
		n += charactersOfGrade(g.label).length;
		if (g.label === label) break;
	}
	return n;
}
