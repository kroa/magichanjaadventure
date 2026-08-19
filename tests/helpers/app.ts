import type { Page } from '@playwright/test';

/**
 * 하이드레이션이 끝날 때까지 기다린다.
 *
 * SSR 로 그려진 화면은 눌러도 JS 핸들러가 아직 없을 수 있고,
 * 하이드레이션 도중 입력하면 Svelte 가 input 값을 서버 렌더 값으로 되돌린다.
 * 실제로 "닉네임을 채웠는데 폼이 비어 있는" 간헐 실패를 겪었다.
 *
 * `data-hydrated` 표식은 src/routes/+layout.svelte 가 붙인다.
 */
export async function waitForHydration(page: Page, timeout = 20_000): Promise<void> {
	await page.waitForFunction(
		() => document.documentElement.dataset.hydrated === 'true',
		undefined,
		{
			timeout
		}
	);
}

/** 이동한 뒤 조작 가능한 상태가 될 때까지 기다린다. */
export async function gotoReady(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await waitForHydration(page);
}
