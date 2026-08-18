import type { Page, TestInfo } from '@playwright/test';

/**
 * 주요 화면 스크린샷 수집기.
 *
 * 이 스크린샷은 **테스트를 실패시키지 않는다.** 픽셀 비교를 하지 않기 때문이다.
 * 목적은 사람(그리고 AI)이 디자인을 눈으로 확인하는 것이다.
 * 레이아웃 오류 판정은 `helpers/layout.ts` 의 주장(assertion)이 담당한다.
 *
 * 저장 위치: screenshots/<project>/<name>.png
 */
export async function captureScreen(
	page: Page,
	testInfo: TestInfo,
	name: string,
	options: { fullPage?: boolean } = {}
): Promise<void> {
	const project = testInfo.project.name;
	await page.screenshot({
		path: `screenshots/${project}/${name}.png`,
		fullPage: options.fullPage ?? true,
		animations: 'disabled'
	});
}

/**
 * 연출(GSAP 타임라인 등)이 끝날 때까지 기다린다.
 *
 * 연출 컴포넌트는 완료 시 컨테이너에 `data-anim-state="done"` 을 붙인다.
 * 임의의 `waitForTimeout` 을 쓰지 않기 위한 규약이다.
 */
export async function waitForAnimation(
	page: Page,
	testId: string,
	timeout = 15_000
): Promise<void> {
	await page
		.locator(`[data-testid="${testId}"][data-anim-state="done"]`)
		.waitFor({ state: 'attached', timeout });
}

/** 폰트가 모두 로드될 때까지 기다린다 (스크린샷 전 레이아웃 안정화). */
export async function waitForFonts(page: Page): Promise<void> {
	await page.evaluate(() => document.fonts.ready.then(() => undefined));
}
