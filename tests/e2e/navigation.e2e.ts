import { expect, test } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';

/**
 * "이 화면에서 어떻게 나가지?" 회귀 테스트.
 *
 * 하단 네비게이션이 `sm:hidden` 이라 **데스크톱에서는 메뉴가 아예 없었다.**
 * 상점이나 도감에 들어가면 뒤로가기 말고는 빠져나올 방법이 없었다.
 * 아이는 브라우저 뒤로가기를 잘 쓰지 않는다 — 화면 안에 길이 보여야 한다.
 *
 * 그래서 "네비 요소가 DOM 에 있는가"가 아니라
 * **모든 뷰포트에서 실제로 눌러서 나갈 수 있는가**를 확인한다.
 */

const EXITABLE = ['/shop', '/collection', '/learn'];

test('모든 화면에서 주요 메뉴로 빠져나갈 수 있다', async ({ page }, testInfo) => {
	const user = makeTestUser('exit', `${testInfo.project.name}${testInfo.workerIndex}n`);

	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');

	for (const path of EXITABLE) {
		await gotoReady(page, path);

		// 이 뷰포트에서 실제로 보이는 메뉴 (모바일=하단 / 데스크톱=상단)
		const menu = page.getByRole('navigation', { name: '주요 메뉴' }).filter({ visible: true });
		await expect(menu, `${path} 에서 나갈 메뉴가 보이지 않는다`).toHaveCount(1);

		const home = menu.getByRole('link', { name: /모험/ });
		await expect(home).toBeVisible();
		await home.click();

		await page.waitForURL((url) => url.pathname === '/');
	}
});

test('집중 모드 화면은 메뉴 대신 나가기 버튼으로 빠져나간다', async ({ page }, testInfo) => {
	const user = makeTestUser('qexit', `${testInfo.project.name}${testInfo.workerIndex}s`);

	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');

	// 문제가 있어야 진짜 퀴즈 화면(나가기 버튼이 있는 화면)이 나온다
	await gotoReady(page, '/learn');
	await page.getByRole('button', { name: '이 한자 배우기' }).click();
	await expect(page.getByTestId('learn-done')).toBeVisible();

	/*
	 * 퀴즈와 대결은 집중을 위해 메뉴를 숨긴다. 대신 나가기 버튼이 **반드시** 있어야 한다.
	 * 메뉴를 끈 화면에 나가기 버튼도 없으면 갇힌다.
	 */
	// 복습(/quiz)은 메뉴에 없다 — 지도의 섬 차림표에 있다
	for (const path of ['/quiz', '/battle']) {
		await gotoReady(page, path);

		const menu = page.getByRole('navigation', { name: '주요 메뉴' }).filter({ visible: true });
		await expect(menu, `${path} 는 집중 모드라 메뉴가 없어야 한다`).toHaveCount(0);

		const exit = page.getByRole('link', { name: '모험 지도로 나가기' });
		await expect(exit, `${path} 에 나가기 버튼이 없다`).toBeVisible();
		await exit.click();
		await page.waitForURL((url) => url.pathname === '/');
	}
});
