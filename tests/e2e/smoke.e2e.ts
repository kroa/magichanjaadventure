import { expect, test } from '@playwright/test';
import { expectHealthyLayout, expectSufficientContrast } from '../helpers/layout';
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
	/**
	 * 가장 먼저: 우리가 검사하는 서버가 **정말 이 프로젝트인지** 확인한다.
	 *
	 * 과거에 같은 PC 의 다른 프로젝트가 같은 포트를 쓰고 있어
	 * 엉뚱한 앱을 상대로 테스트가 돌아간 적이 있다. 그때 실패 메시지가
	 * "버튼이 작다" 같은 엉뚱한 내용이라 원인을 찾는 데 시간이 걸렸다.
	 */
	test('검사 대상이 이 프로젝트가 맞다', async ({ page, baseURL }) => {
		await page.goto('/');
		const title = await page.title();
		expect(
			title,
			`${baseURL} 에서 다른 앱이 응답하고 있습니다 (title="${title}"). ` +
				`해당 포트를 쓰는 다른 개발 서버를 종료하세요.`
		).toContain('마법한자탐험대');
	});

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
		/*
		 * 대비 검사를 **실제로 켠다.**
		 * `expectSufficientContrast` 는 정의만 있고 어디서도 호출되지 않고 있었다.
		 * 그래서 로그인 제목이 하늘 위에서 1.6:1 인 채로 출시돼 있었다.
		 * (하늘처럼 그라디언트 위인 글자는 이 검사가 건너뛰므로,
		 *  그쪽은 src/lib/design/sky.spec.ts 가 순수 계산으로 잡는다.)
		 */
		await expectSufficientContrast(page);
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
