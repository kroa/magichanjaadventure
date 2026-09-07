import { describe, expect, it } from 'vitest';
import { OFFICIAL_GRADE } from '../../../database/seed/official-grades';
import {
	ABOVE_GRADES,
	ALL,
	GRADES,
	IN_GRADE_TABLE,
	charactersOfGrade,
	entryOf,
	summarize,
	withParticle
} from './index';

/**
 * 사전이 **검색엔진과 광고 심사 앞에서 버티는가.**
 *
 * 이 검사가 지키는 것은 디자인이 아니라 두 가지다:
 *  1. 페이지마다 **내용이 실제로 다른가** — AdSense 미승인 사유에
 *     "제목만 있고 완전한 문장이 없는 페이지, 자동 생성 페이지" 가 있다
 *  2. 링크로 **다 닿을 수 있는가** — 어디서도 링크되지 않는 페이지는 색인되지 않는다
 */

describe('사전 데이터', () => {
	it('1000자가 모두 어딘가에 속한다', () => {
		/*
		 * 예전에는 "1,000자가 전부 8급~4급 급수표에 든다" 를 못 박고 있었다.
		 * 그런데 공식 배정급수를 대 보니 28자는 3급II·3급·2급이었다 —
		 * 게임이 마지막 마을에 넣어 둔 글자들이다. 급수표에 끼워 넣으면 사전이
		 * 거짓을 말하게 되므로 따로 모았고, 대신 **한 자도 새지 않았는지**를 본다.
		 * 어디에도 안 걸린 글자는 링크가 닿지 않는 섬이 되어 색인에서 사라진다.
		 */
		expect(ALL.length).toBe(1000);
		const above = ABOVE_GRADES.reduce((n, g) => n + g.entries.length, 0);
		expect(IN_GRADE_TABLE + above, '어디에도 속하지 않는 글자가 있다').toBe(ALL.length);
	});

	it('급수가 공식 배정급수와 어긋나지 않는다', () => {
		/*
		 * 급수는 검정시험을 준비하는 사람에게 핵심 정보다. 틀린 급수를 자신 있게
		 * 적는 것은 안 적느니만 못하다. 시드(게임의 마을 순서)를 그대로 쓰다가
		 * 133자가 틀려 있었고, 이 검사가 그때 없었다.
		 */
		const wrong = ALL.filter((e) => e.gradeLabel !== OFFICIAL_GRADE[e.character]);
		expect(
			wrong.map((e) => `${e.character}: ${e.gradeLabel} ≠ ${OFFICIAL_GRADE[e.character]}`),
			'공식 급수와 다른 글자'
		).toEqual([]);
	});

	it('완전히 담고 있는 급수는 공식 자수와 같다', () => {
		// 8급~6급은 공식 배정한자를 빠짐없이 담고 있다. 여기가 어긋나면 데이터가 샌 것이다
		const official: Record<string, number> = {
			'8급': 50,
			'7급II': 50,
			'7급': 50,
			'6급II': 75,
			'6급': 75,
			'5급II': 100
		};
		for (const [label, n] of Object.entries(official)) {
			expect(GRADES.find((g) => g.label === label)?.count, `${label}`).toBe(n);
		}
	});

	it('급수마다 글자가 있고 순서가 유지된다', () => {
		for (const g of GRADES) {
			const list = charactersOfGrade(g.label);
			expect(list.length, `${g.label} 이 비어 있다`).toBeGreaterThan(0);
			const order = list.map((e) => e.sortOrder);
			expect(order, `${g.label} 의 정렬이 깨졌다`).toEqual([...order].sort((a, b) => a - b));
		}
	});

	it('글자가 중복되지 않는다 — 같은 주소가 둘이면 색인이 갈린다', () => {
		const seen = new Set(ALL.map((e) => e.character));
		expect(seen.size).toBe(ALL.length);
	});
});

describe('페이지 내용', () => {
	it('모든 글자에 완전한 문장의 설명이 있다', () => {
		for (const e of ALL) {
			const s = summarize(e);
			expect(s.length, `${e.character} 의 설명이 너무 짧다`).toBeGreaterThan(40);
			expect(s.endsWith('.'), `${e.character} 의 설명이 문장으로 끝나지 않는다`).toBe(true);
		}
	});

	it('설명이 글자마다 다르다 — 같은 문장이 1000장이면 자동 생성 페이지다', () => {
		const texts = new Set(ALL.map((e) => summarize(e)));
		expect(texts.size, '설명이 겹치는 글자가 있다').toBe(ALL.length);
	});

	it('훈·음·획수가 비어 있지 않다', () => {
		for (const e of ALL) {
			expect(e.meaning.trim(), `${e.character} 의 훈이 비었다`).not.toBe('');
			expect(e.reading.trim(), `${e.character} 의 음이 비었다`).not.toBe('');
			expect(e.strokeCount, `${e.character} 의 획수가 이상하다`).toBeGreaterThan(0);
		}
	});
});

describe('조사', () => {
	/*
	 * `明은(는)` 처럼 둘 다 적어 두면 읽는 사람에게 기계가 쓴 티가 난다.
	 * 한자는 눈으로는 뜻이지만 입으로는 음이므로 **음**으로 골라야 한다.
	 */
	it('받침이 있으면 은/과/을, 없으면 는/와/를', () => {
		expect(withParticle('明', '명', '은는')).toBe('明은');
		expect(withParticle('休', '휴', '은는')).toBe('休는');
		expect(withParticle('日', '일', '과와')).toBe('日과');
		expect(withParticle('木', '목', '을를')).toBe('木을');
		expect(withParticle('母', '모', '과와')).toBe('母와');
	});

	it('한글이 아닌 음이 와도 죽지 않는다', () => {
		expect(withParticle('X', '', '은는')).toBe('X는');
	});
});

describe('링크로 다 닿는가', () => {
	it('모든 글자가 자기 급수 목록에 들어 있다', () => {
		for (const e of ALL) {
			const list = charactersOfGrade(e.gradeLabel);
			expect(
				list.some((x) => x.character === e.character),
				`${e.character} 은 어느 급수 목록에서도 링크되지 않는다`
			).toBe(true);
		}
	});

	it('entryOf 는 없는 글자에 null 을 준다', () => {
		expect(entryOf('日')).not.toBeNull();
		expect(entryOf('龘')).toBeNull();
	});
});
