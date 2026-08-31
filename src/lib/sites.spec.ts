import { describe, expect, it } from 'vitest';
import { DICT_HOST, GAME_HOST, isDictPath, siteOf } from './sites';

/**
 * 두 도메인이 **서로의 경로를 열지 않는가.**
 *
 * 같은 산출물이 두 Pages 프로젝트에 올라가므로, 갈라 주지 않으면 같은 주소가
 * 두 도메인에서 열려 중복 콘텐츠가 된다. 더 나쁜 것은 게임 도메인에 사전이
 * 남아 있는 경우다 — 광고 대상 판정을 나누려고 도메인을 갈랐는데 그 이유가 사라진다.
 */

describe('사이트 가르기', () => {
	it('호스트로 어느 사이트인지 안다', () => {
		expect(siteOf(GAME_HOST)).toBe('game');
		expect(siteOf(DICT_HOST)).toBe('dict');
		// 포트가 붙어도 같아야 한다
		expect(siteOf(`${DICT_HOST}:443`)).toBe('dict');
		expect(siteOf(GAME_HOST.toUpperCase())).toBe('game');
	});

	it('로컬은 둘 다 연다 — 서버 하나로 확인할 수 있어야 한다', () => {
		expect(siteOf('localhost:4319')).toBe('both');
		expect(siteOf(null)).toBe('both');
	});

	it('사전 경로를 가린다', () => {
		expect(isDictPath('/hanja')).toBe(true);
		expect(isDictPath('/hanja/明')).toBe(true);
		expect(isDictPath('/hanja/급수/8급')).toBe(true);
		expect(isDictPath('/sitemap.xml')).toBe(true);
		expect(isDictPath('/robots.txt')).toBe(true);
	});

	it('게임 경로를 사전 경로로 착각하지 않는다', () => {
		for (const p of ['/', '/learn', '/battle', '/login', '/collection']) {
			expect(isDictPath(p), `${p} 이 사전 경로로 잡힌다`).toBe(false);
		}
	});

	it('접두어만 같은 주소에 속지 않는다', () => {
		// `/hanjastore` 는 `/hanja` 로 시작하지만 사전이 아니다
		expect(isDictPath('/hanjastore')).toBe(false);
		expect(isDictPath('/hanja-quiz')).toBe(false);
	});

	it('두 호스트가 서로 다르다', () => {
		expect(GAME_HOST).not.toBe(DICT_HOST);
	});
});
