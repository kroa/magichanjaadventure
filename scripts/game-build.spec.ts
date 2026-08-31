import { describe, expect, it } from 'vitest';
import { isDictArtifact } from './game-build.mjs';

/**
 * 게임 배포본에 사전이 섞이지 않는가.
 *
 * 이 검사가 지키는 것은 파일 목록이 아니라 **도메인 분리 그 자체**다.
 * 사전 파일이 게임 배포본에 남으면 Pages 가 워커를 거치지 않고 내보내서,
 * 광고 대상 판정을 나누려고 도메인을 나눈 이유가 사라진다.
 */
describe('게임 배포본', () => {
	it('사전 산출물을 전부 걸러낸다', () => {
		expect(isDictArtifact('hanja')).toBe(true);
		expect(isDictArtifact('hanja/明.html')).toBe(true);
		expect(isDictArtifact('hanja/급수/8급.html')).toBe(true);
		// 목차는 폴더가 아니라 별개 파일이다 — 실제로 이걸 빠뜨려 /hanja 가 열렸다
		expect(isDictArtifact('hanja.html')).toBe(true);
		expect(isDictArtifact('sitemap.xml')).toBe(true);
	});

	it('게임 파일은 남긴다', () => {
		for (const f of [
			'login.html',
			'index.html',
			'_routes.json',
			'_app/version.json',
			'robots.txt'
		]) {
			expect(isDictArtifact(f), `${f} 이 잘못 걸러진다`).toBe(false);
		}
	});

	it('이름이 비슷한 것에 속지 않는다', () => {
		expect(isDictArtifact('hanjastore.html')).toBe(false);
		expect(isDictArtifact('hanja-quiz.html')).toBe(false);
	});
});
