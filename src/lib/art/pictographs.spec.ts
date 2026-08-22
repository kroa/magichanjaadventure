import { describe, expect, it } from 'vitest';
import { PICTOGRAPHS, fadeStage, hasPicture } from './pictographs';
import { allPartChars } from '../game/fusion';

/**
 * 그림 자산 무결성.
 *
 * 부품 하나라도 그림이 없으면 그 타일만 글자로 뜬다.
 * 그러면 아이는 그림들 사이에서 혼자 낯선 기호를 만나고, "늦은 기호화" 가 그 자리에서 깨진다.
 */
describe('그림 한자', () => {
	it('모든 부품에 그림이 있다', () => {
		for (const part of allPartChars()) {
			expect(hasPicture(part), `${part} 에 그림이 없다 — 이 타일만 글자로 뜬다`).toBe(true);
		}
	});

	it('그림에 위험한 마크업이 없다', () => {
		for (const [char, picture] of Object.entries(PICTOGRAPHS)) {
			// 우리가 직접 쓴 도형만 @html 로 넣는다는 전제를 여기서 지킨다
			expect(picture.svg, `${char}`).not.toMatch(/<script|onload=|onerror=|javascript:/i);
			expect(picture.svg, `${char} 에 외부 참조가 있다`).not.toMatch(
				/<image|xlink:href|url\(http/i
			);
			expect(picture.svg, `${char} 에 <svg> 태그가 들어 있다`).not.toMatch(/<svg/i);
		}
	});

	it('그림에 글자가 들어 있지 않다', () => {
		// 그림 안에 한자를 써 버리면 "그림 먼저" 라는 약속이 무너진다
		for (const [char, picture] of Object.entries(PICTOGRAPHS)) {
			expect(picture.svg, `${char} 에 <text> 가 있다`).not.toMatch(/<text/i);
			expect(picture.svg, `${char} 그림 안에 한자가 있다`).not.toMatch(/[一-鿿]/);
		}
	});

	it('이름이 순한글이다', () => {
		for (const [char, picture] of Object.entries(PICTOGRAPHS)) {
			expect(picture.label.length, `${char}`).toBeGreaterThan(0);
			expect(picture.label, `${char} 의 이름에 한자가 섞여 있다`).not.toMatch(/[一-鿿]/);
		}
	});
});

describe('fadeStage', () => {
	it('글자를 아예 감추지는 않는다', () => {
		/*
		 * 그림만 보여 주면 "무엇을 합치는 건지" 알 수가 없다.
		 * 우리가 가르치는 것은 표기법이 아니라 **글자 그 자체**이므로,
		 * 글자가 화면에서 사라지면 아이는 연결할 대상을 잃는다.
		 */
		expect(fadeStage(0)).toBe(1);
		expect(fadeStage(null)).toBe(1);
		expect(fadeStage(undefined)).toBe(1);
		expect(fadeStage(49)).toBe(1);
	});

	it('익숙해지면 글자만 남는다', () => {
		expect(fadeStage(50)).toBe(2);
		expect(fadeStage(100)).toBe(2);
	});

	it('단계가 거꾸로 가지 않는다', () => {
		// 익숙해질수록 글자 쪽으로만 간다. 왔다 갔다 하면 아이가 혼란스럽다
		let previous = 0;
		for (let mastery = 0; mastery <= 100; mastery += 5) {
			const stage = fadeStage(mastery);
			expect(stage).toBeGreaterThanOrEqual(previous);
			previous = stage;
		}
	});
});
