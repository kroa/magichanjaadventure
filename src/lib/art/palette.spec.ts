import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * 캐릭터 여섯이 **같은 얼굴 규격**을 쓰는가.
 *
 * 파일이 여섯 벌이라 같은 부위인데 색이 조금씩 갈라져 있었다.
 * `GeniusSprite` 만 눈이 `#2B1A66`, 볼이 `#FFB4C4`, 입선이 `#C4796A` 였다 —
 * 나머지 다섯은 `#2A2050` · `#FF9EC4` · `#A03C60` 이다.
 * 눈으로는 "조금 다르네" 정도지만, 여섯이 한 화면(상점)에 같이 뜨면 한 명만 이질적으로 보인다.
 *
 * 새 캐릭터를 그릴 때 이 검사가 먼저 잡는다.
 */

const SPRITES = ['Knight', 'Wizard', 'Archer', 'Sage', 'Fox', 'Genius'] as const;

/** 여섯 모두가 같아야 하는 부위 */
const FACE = {
	눈: '#2A2050',
	볼: '#FF9EC4',
	입선: '#A03C60'
} as const;

/** 사람 얼굴을 가진 캐릭터만. 여우는 동물이라 털색이 얼굴색이다 */
const HUMAN_SKIN = { 피부: '#FFDFC0', 피부외곽선: '#E8B894' } as const;
const HUMAN_FACED = SPRITES.filter((n) => n !== 'Fox');

function source(name: string): string {
	return readFileSync(`src/lib/components/art/${name}Sprite.svelte`, 'utf8');
}

describe('캐릭터 얼굴 규격', () => {
	for (const name of SPRITES) {
		it(`${name} 이 공통 얼굴색을 쓴다`, () => {
			const src = source(name).toUpperCase();
			for (const [part, hex] of Object.entries(FACE)) {
				expect(src, `${name}: ${part} 색 ${hex} 이 없다`).toContain(hex);
			}
		});
	}

	for (const name of HUMAN_FACED) {
		it(`${name} 이 공통 피부색을 쓴다`, () => {
			const src = source(name).toUpperCase();
			for (const [part, hex] of Object.entries(HUMAN_SKIN)) {
				expect(src, `${name}: ${part} 색 ${hex} 이 없다`).toContain(hex);
			}
		});
	}

	it('예전에 갈라져 있던 색이 남아 있지 않다', () => {
		const stale = ['#2B1A66', '#FFB4C4', '#C4796A', '#FFE2C8', '#D9A97E'];
		const genius = source('Genius').toUpperCase();
		for (const hex of stale) {
			expect(genius, `천재 스프라이트에 옛 색 ${hex} 이 남았다`).not.toContain(hex);
		}
	});
});

describe('스프라이트 공통 규약', () => {
	it('여섯 다 viewBox 밖으로 그릴 수 있다', () => {
		/*
		 * 계급 표식처럼 몸통 밖으로 넘치는 장식이 붙으면
		 * `overflow: visible` 이 없는 스프라이트에서만 잘린다.
		 * 천재만 이게 없어서 혼자 잘렸다.
		 */
		for (const name of SPRITES) {
			expect(source(name), `${name} 에 overflow: visible 이 없다`).toMatch(/overflow:\s*visible/);
		}
	});

	it('그라디언트 id 를 하드코딩하지 않는다', () => {
		/*
		 * 같은 캐릭터가 한 화면에 둘 뜨면 SVG 규칙상 먼저 나온 정의만 살아남는다.
		 * 상점·도감·스타일가이드가 실제로 그런 화면이다.
		 */
		for (const name of SPRITES) {
			const src = source(name);
			const defs = src.match(/id="([^"]+)"/g) ?? [];
			for (const def of defs) {
				expect(def, `${name}: ${def} 가 인스턴스마다 달라지지 않는다`).toContain('{uid}');
			}
		}
	});

	it('감속 설정에서 안전하게 멈춘다', () => {
		/*
		 * 전역 감속 규칙(app.css)은 애니메이션을 **멈추는** 것이 아니라
		 * `duration: 0.01ms` + `iteration-count: 1` 로 **끝 키프레임에 착지시킨다.**
		 * 그래서 끝 프레임이 중립이 아니면 캐릭터가 기울어진 채 굳는다.
		 *
		 * 이 스프라이트들은 전부 `0%, 100% { … }` 로 시작과 끝을 한 선택자에 묶어 두어
		 * 우연이 아니라 구조적으로 안전하다. 새 키프레임이 그 규칙을 어기면 여기서 걸린다.
		 * (자기 파일에 감속 블록을 따로 둔 것도 허용한다 — GeniusSprite 가 그렇다.)
		 */
		for (const name of SPRITES) {
			const src = source(name);
			if (src.includes('prefers-reduced-motion')) continue;

			// `@keyframes 이름 { 첫 선택자 {` 까지만 떼어 본다
			const heads = src.match(/@keyframes\s+[\w-]+\s*\{\s*[^{]+\{/g) ?? [];
			expect(heads.length, `${name}: 키프레임을 못 찾았다`).toBeGreaterThan(0);

			for (const head of heads) {
				const selector = head.slice(head.indexOf('{') + 1, head.lastIndexOf('{'));
				expect(
					/0%/.test(selector) && /100%/.test(selector),
					`${name}: 끝 프레임이 중립이 아닌 키프레임이 있다 — 감속 설정에서 그 자세로 굳는다 (${selector.trim()})`
				).toBe(true);
			}
		}
	});
});
