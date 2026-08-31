import { expect, test } from '@playwright/test';
import { expectHealthyLayout } from '../helpers/layout';
import { captureScreen, waitForFonts } from '../helpers/screens';

/**
 * 한자 사전 — **로그인 없이 열리는 공개 영역.**
 *
 * 게임은 전부 로그인 뒤에 있어 검색엔진이 볼 수 있는 것이 없었다.
 * 사전은 그 반대여야 한다 — 이 검사는 그 전제가 무너지지 않았는지 지킨다:
 *  1. 로그인 없이 열리는가 (하나라도 막히면 색인이 끊긴다)
 *  2. 페이지마다 제목·설명·구조화 데이터가 있는가
 *  3. 게임의 얼굴(카툰 HUD)이 섞이지 않았는가 — 섞이면 광고 대상 판정이 달라진다
 */

test.describe('한자사전', () => {
	test('로그인 없이 열리고 급수·글자로 이어진다', async ({ page }, testInfo) => {
		await page.goto('/hanja');
		await expect(page.getByRole('heading', { name: '한자사전', level: 1 })).toBeVisible();

		// 게임이라면 여기서 /login 으로 튕겼을 것이다
		expect(new URL(page.url()).pathname).toBe('/hanja');

		await waitForFonts(page);
		await captureScreen(page, testInfo, 'dict-index');
		await expectHealthyLayout(page);

		// 급수 → 글자로 링크가 이어지는가
		await page.getByRole('link', { name: /8급/ }).first().click();
		await expect(page.getByRole('heading', { level: 1 })).toContainText('8급');
		await expect(page.locator('tbody tr')).toHaveCount(50);
		await captureScreen(page, testInfo, 'dict-grade');
		await expectHealthyLayout(page);

		/*
		 * **주소가 실제로 바뀌었는지까지 본다.**
		 * 급수 목록에도 h1 이 있어서, 이동이 안 돼도 "제목이 보인다" 는 통과해 버린다 —
		 * 실제로 그 탓에 글자 페이지 대신 목록이 찍힌 스크린샷을 못 잡았다.
		 */
		const first = page.locator('td.ch a').first();
		const ch = (await first.textContent())?.trim();
		await first.click();
		await page.waitForURL((u) => decodeURIComponent(u.pathname) === `/hanja/${ch}`);
		await expect(page.locator('.glyph')).toHaveText(ch!);
		await captureScreen(page, testInfo, 'dict-entry');
		await expectHealthyLayout(page);
	});

	test('글자 페이지에 제목·설명·구조화 데이터가 있다', async ({ page }) => {
		await page.goto('/hanja/明');

		await expect(page).toHaveTitle(/明.*밝을 명/);

		const desc = page.locator('meta[name="description"]');
		await expect(desc).toHaveAttribute('content', /밝을 명/);

		// 검색결과에서 사전 항목으로 이해되게 하는 표시
		const ld = await page.locator('script[type="application/ld+json"]').textContent();
		expect(ld, '구조화 데이터가 없다').toBeTruthy();
		const parsed = JSON.parse(ld!);
		expect(parsed['@type']).toBe('DefinedTerm');
		expect(parsed.name).toBe('明');

		// 자동 생성 페이지로 보이지 않도록 완전한 문장이 있어야 한다
		const body = await page.locator('main').innerText();
		expect(body).toContain('배정한자');
		expect(body.length, '내용이 너무 얇다').toBeGreaterThan(200);
	});

	test('사전에는 게임의 얼굴이 섞이지 않는다', async ({ page }) => {
		/*
		 * 이건 취향이 아니라 판정 요소다. 광고 정책은 시각물·캐릭터·언어를 보고
		 * 대상을 가른다 — 사전에 카툰 HUD 가 들어가면 이 섹션까지 아동 대상으로 읽힌다.
		 */
		await page.goto('/hanja/明');
		await expect(page.getByTestId('top-hud')).toHaveCount(0);
		await expect(page.locator('.island')).toHaveCount(0);

		const body = await page.locator('body').innerText();
		for (const word of ['보석', '모험', '마법사']) {
			expect(body, `사전에 게임 말투(${word})가 섞였다`).not.toContain(word);
		}
	});

	test('두 도메인이 서로의 경로를 열지 않는다', async ({ page }) => {
		/*
		 * 같은 산출물이 두 Pages 프로젝트에 올라간다. 갈라 주지 않으면 같은 주소가
		 * 두 도메인에서 열려 중복 콘텐츠가 되고, 무엇보다 **게임 도메인에 사전이 남으면**
		 * 광고 대상 판정을 나누려고 도메인을 나눈 이유가 사라진다.
		 */
		const dict = { host: 'hanjasajeon.pages.dev' };
		const game = { host: 'magichanjaadventure.pages.dev' };

		// 사전 도메인에서 게임 경로 → 게임 도메인으로
		const a = await page.request.get('/learn', { headers: dict, maxRedirects: 0 });
		expect(a.status()).toBe(308);
		expect(a.headers()['location']).toContain('magichanjaadventure.pages.dev/learn');

		// 제 도메인에서는 그대로 열린다
		const c = await page.request.get('/hanja', { headers: dict, maxRedirects: 0 });
		expect(c.status()).toBe(200);

		/*
		 * **반대 방향(게임 도메인 + 사전 경로)은 여기서 확인할 수 없다.**
		 *
		 * 사전은 프리렌더된 정적 파일이라 Pages 가 워커를 거치지 않고 내보낸다.
		 * 이 테스트 서버는 사전이 들어 있는 빌드를 그대로 띄우므로 여기서는 200 이 뜬다.
		 * 운영 게임 배포본에는 그 파일이 **아예 없고**(scripts/game-build.mjs),
		 * 파일이 없을 때만 요청이 워커까지 와서 이 리다이렉트가 산다.
		 * 그래서 그 보장은 `scripts/game-build.spec.ts` 가 파일 목록으로 지킨다.
		 */
		expect(game.host).toBe('magichanjaadventure.pages.dev');
	});

	test('robots 가 도메인마다 다르다', async ({ page }) => {
		// 게임 도메인은 전부 막는다 — 로그인 폼이 검색결과에 뜰 이유가 없다
		const game = await page.request.get('/robots.txt', {
			headers: { host: 'magichanjaadventure.pages.dev' }
		});
		const gameText = await game.text();
		expect(gameText).toContain('Disallow: /');
		expect(gameText, '게임 robots 가 사이트맵을 가리키면 안 된다').not.toContain('Sitemap:');

		// 사전 도메인은 전부 열고 사이트맵을 가리킨다
		const dict = await page.request.get('/robots.txt', {
			headers: { host: 'hanjasajeon.pages.dev' }
		});
		const dictText = await dict.text();
		expect(dictText).toContain('Allow: /');
		expect(dictText).toContain('hanjasajeon.pages.dev/sitemap.xml');
	});

	test('로그인·가입 화면은 색인하지 않는다', async ({ page }) => {
		for (const path of ['/login', '/register']) {
			await page.goto(path);
			await expect(
				page.locator('meta[name="robots"]'),
				`${path} 에 noindex 가 없다`
			).toHaveAttribute('content', /noindex/);
		}
	});

	test('sitemap 과 robots 가 서로를 가리킨다', async ({ page }) => {
		const robots = await page.request.get('/robots.txt', {
			headers: { host: 'hanjasajeon.pages.dev' }
		});
		expect(robots.ok()).toBe(true);
		const robotsText = await robots.text();
		expect(robotsText, 'robots 가 sitemap 을 가리키지 않는다').toContain('Sitemap:');

		const map = await page.request.get('/sitemap.xml');
		expect(map.ok()).toBe(true);
		const xml = await map.text();
		expect(xml).toContain('<urlset');
		// 1000자 + 급수 9 + 목차 1
		expect((xml.match(/<url>/g) ?? []).length).toBe(1010);
	});
});
