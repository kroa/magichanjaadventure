import { expect, test, type Page } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';
import { settleAnimations } from '../helpers/layout';

/**
 * "한 화면에 다 담기는가" 회귀 테스트.
 *
 * 퀴즈와 대결은 답을 고르는 화면이다. 마지막 보기나 '다음' 버튼을 보려고
 * 스크롤을 내려야 하면 리듬이 끊기고, 아이는 버튼이 없는 줄 안다.
 * 실제로 390×844 화면에서 대결 문서 높이가 952px 이라 마지막 보기가 잘렸다.
 *
 * 그래서 "요소가 존재하는가"가 아니라 **처음 화면 안에 들어와 있는가**를 본다.
 */

async function readyToPlay(page: Page, label: string, seed: string) {
	const user = makeTestUser(label, seed);
	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');

	await gotoReady(page, '/learn');
	for (let i = 0; i < 4; i++) {
		await page.getByRole('button', { name: '이 한자 배우기' }).click();
		await expect(page.getByTestId('learn-done')).toBeVisible();
		if (i < 3) {
			await page.getByRole('button', { name: '다음 한자 배우기' }).click();
			await expect(page.getByRole('button', { name: '이 한자 배우기' })).toBeVisible();
		}
	}
}

for (const { path, label } of [
	{ path: '/quiz', label: '퀴즈' },
	{ path: '/battle', label: '대결' }
]) {
	test(`${label} 화면은 스크롤 없이 모든 보기를 보여준다`, async ({ page }, testInfo) => {
		await readyToPlay(page, `os${label}`, `${testInfo.project.name}${testInfo.workerIndex}`);

		await gotoReady(page, path);
		await settleAnimations(page);

		const viewport = page.viewportSize();
		expect(viewport).not.toBeNull();
		const height = viewport!.height;

		const options = page.locator('button.option');
		await expect(options.first()).toBeVisible();
		const count = await options.count();
		expect(count).toBeGreaterThan(1);

		// 마지막 보기의 아래끝이 화면 안에 있어야 한다
		const box = await options.nth(count - 1).boundingBox();
		expect(box, '마지막 보기의 위치를 잴 수 없다').not.toBeNull();
		expect(
			Math.round(box!.y + box!.height),
			`${label}: 마지막 보기가 화면(${height}px) 밖에 있다 — 스크롤해야 보인다`
		).toBeLessThanOrEqual(height);
	});

	test(`${label}에서 답을 고르면 다음 버튼이 바로 화면에 있다`, async ({ page }, testInfo) => {
		await readyToPlay(page, `nx${label}`, `${testInfo.project.name}${testInfo.workerIndex}`);

		await gotoReady(page, path);
		await settleAnimations(page);

		await page.locator('button.option').first().click();

		const next = page.getByRole('button', { name: /다음|결과 보기/ });
		await expect(next).toBeVisible();

		const viewport = page.viewportSize()!;
		const box = await next.boundingBox();
		expect(box).not.toBeNull();
		expect(
			Math.round(box!.y + box!.height),
			`${label}: 다음 버튼을 보려면 스크롤해야 한다`
		).toBeLessThanOrEqual(viewport.height);
	});
}
