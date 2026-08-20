import { describe, expect, it } from 'vitest';
import {
	FUSION_RECIPES,
	allPartChars,
	allResultChars,
	fuse,
	hasAnyRecipeWith,
	partsKey,
	recipeFor
} from './fusion';
import { HANJA_SEED } from '../../../database/seed/hanja';

/**
 * 조합표 무결성 검사.
 *
 * 한자 1000자를 만들 때 24군데를 틀렸고 **전부 이런 테스트가 잡았다.**
 * 조합표는 그보다 더 위험하다. 잘못된 분해는 "그럴듯해 보이는 거짓말" 이라
 * 눈으로는 걸러지지 않고, 아이는 그걸 그대로 외운다.
 */

const CHARS = new Set(HANJA_SEED.map((h) => h.character));

describe('조합표', () => {
	it('부품이 전부 우리 한자 1000자 안에 있다', () => {
		for (const recipe of FUSION_RECIPES) {
			for (const part of recipe.parts) {
				expect(CHARS.has(part), `${recipe.result} 의 부품 ${part} 이(가) 1000자에 없다`).toBe(true);
			}
		}
	});

	it('결과 한자가 전부 우리 한자 1000자 안에 있다', () => {
		for (const recipe of FUSION_RECIPES) {
			expect(CHARS.has(recipe.result), `${recipe.result} 이(가) 1000자에 없다`).toBe(true);
		}
	});

	it('같은 부품 묶음이 두 번 나오지 않는다', () => {
		// 木+一 로 本 과 末 을 둘 다 만들 수 있으면 아이가 무엇을 얻을지 알 수 없다
		const seen = new Map<string, string>();
		for (const recipe of FUSION_RECIPES) {
			const key = partsKey(recipe.parts);
			const clash = seen.get(key);
			expect(clash, `${recipe.result} 와 ${clash} 의 부품이 같다 (${key})`).toBeUndefined();
			seen.set(key, recipe.result);
		}
	});

	it('결과 한자가 중복되지 않는다', () => {
		const results = allResultChars();
		expect(new Set(results).size).toBe(results.length);
	});

	it('부품이 2개 이상이다', () => {
		for (const recipe of FUSION_RECIPES) {
			expect(recipe.parts.length, `${recipe.result}`).toBeGreaterThanOrEqual(2);
		}
	});

	it('자기 자신을 재료로 쓰지 않는다', () => {
		for (const recipe of FUSION_RECIPES) {
			expect(recipe.parts, `${recipe.result} 가 자기 자신으로 만들어진다`).not.toContain(
				recipe.result
			);
		}
	});

	it('이야기가 비어 있지 않고 한국어로 쓰여 있다', () => {
		for (const recipe of FUSION_RECIPES) {
			expect(recipe.story.length, `${recipe.result} 의 설명이 너무 짧다`).toBeGreaterThan(8);
			// 아이가 읽는 문장이다. 한자나 영어가 섞여 있으면 안 된다
			expect(recipe.story, `${recipe.result} 의 설명에 한자가 섞여 있다`).not.toMatch(/[一-鿿]/);
		}
	});

	it('형성자는 소리 부품을 밝히고, 그 부품이 실제 재료에 들어 있다', () => {
		for (const recipe of FUSION_RECIPES) {
			if (recipe.kind !== '형성') {
				expect(
					recipe.soundPart,
					`${recipe.result} 는 형성자가 아닌데 소리 부품이 있다`
				).toBeUndefined();
				continue;
			}
			expect(recipe.soundPart, `${recipe.result} 의 소리 부품이 없다`).toBeTruthy();
			expect(recipe.parts, `${recipe.result} 의 소리 부품이 재료에 없다`).toContain(
				recipe.soundPart
			);
		}
	});
});

describe('fuse', () => {
	it('부품을 합치면 한자가 나온다', () => {
		expect(fuse(['日', '月'])?.result).toBe('明');
		expect(fuse(['人', '木'])?.result).toBe('休');
	});

	it('순서를 따지지 않는다', () => {
		// 아이에게 "순서가 틀렸어요" 라고 말하는 순간 이건 다시 시험이 된다
		expect(fuse(['木', '人'])?.result).toBe('休');
		expect(fuse(['月', '日'])?.result).toBe('明');
	});

	it('없는 조합은 조용히 null 을 준다', () => {
		// 틀렸다고 알리지 않는다. 아무 일도 일어나지 않을 뿐이다
		expect(fuse(['日', '山'])).toBeNull();
		expect(fuse(['水', '火'])).toBeNull();
	});

	it('부품이 하나뿐이면 합쳐지지 않는다', () => {
		expect(fuse(['日'])).toBeNull();
		expect(fuse([])).toBeNull();
	});

	it('재료가 남거나 모자라면 합쳐지지 않는다', () => {
		expect(fuse(['日', '月', '木'])).toBeNull();
	});

	it('같은 글자 둘도 합쳐진다', () => {
		expect(fuse(['木', '木'])?.result).toBe('林');
	});
});

describe('도움 함수', () => {
	it('가진 부품으로 만들 수 있는 것이 있는지 안다', () => {
		expect(hasAnyRecipeWith(['日', '月'])).toBe(true);
		expect(hasAnyRecipeWith(['山', '川'])).toBe(false);
		expect(hasAnyRecipeWith([])).toBe(false);
	});

	it('결과 한자로 조합법을 되찾을 수 있다', () => {
		expect(recipeFor('明')?.parts).toEqual(['日', '月']);
		expect(recipeFor('없')).toBeNull();
	});

	it('재료 목록에 중복이 없다', () => {
		const parts = allPartChars();
		expect(new Set(parts).size).toBe(parts.length);
	});
});
