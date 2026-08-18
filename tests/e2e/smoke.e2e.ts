import { expect, test } from '@playwright/test';
import { expectHealthyLayout } from '../helpers/layout';
import { captureScreen, waitForFonts } from '../helpers/screens';

/**
 * PHASE 1 스모크 테스트.
 *
 * 목적: 개발 harness 자체가 동작하는지 확인한다.
 *  - Worker(workerd) 가 뜨고 페이지가 렌더된다
 *  - 3개 viewport 모두에서 레이아웃 규칙을 위반하지 않는다
 *  - 스크린샷 수집 경로가 동작한다
 *
 * 화면 내용 자체는 PHASE 2/3 에서 교체되므로 여기서는 최소한만 단언한다.
 */
test.describe('부팅 스모크', () => {
	test('홈이 열리고 서비스 이름이 보인다', async ({ page }) => {
		const response = await page.goto('/');
		expect(response?.status()).toBe(200);

		await expect(page.getByRole('heading', { name: '마법한자탐험대', level: 1 })).toBeVisible();
		await expect(page).toHaveTitle(/마법한자탐험대/);
	});

	test('문서 언어가 한국어로 선언되어 있다', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
	});

	test('레이아웃 규칙을 위반하지 않는다', async ({ page }, testInfo) => {
		await page.goto('/');
		await waitForFonts(page);

		await expectHealthyLayout(page);
		await captureScreen(page, testInfo, 'phase1-home');
	});

	test('없는 경로는 404 를 준다', async ({ page }) => {
		const response = await page.goto('/이런페이지는없다');
		expect(response?.status()).toBe(404);
	});

	/**
	 * harness 자체에 대한 회귀 방지.
	 *
	 * 사양서 33번이 요구하는 viewport 로 실제 실행되고 있는지 확인한다.
	 * playwright.config 의 device 프로파일이 바뀌면 조용히 "모바일을 테스트하지 않는" 상태가
	 * 될 수 있는데, 그런 실패는 눈에 띄지 않아 가장 위험하다.
	 */
	test('설정된 viewport 로 실제 실행되고 있다', async ({ page }, testInfo) => {
		await page.goto('/');

		const expected: Record<string, number> = {
			desktop: 1280,
			tablet: 1024,
			mobile: 390
		};
		const width = expected[testInfo.project.name];
		expect(width, `알 수 없는 프로젝트: ${testInfo.project.name}`).toBeDefined();

		await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width);
	});
});
