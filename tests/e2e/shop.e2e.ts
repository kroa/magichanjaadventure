import { expect, test } from '@playwright/test';
import { expectHealthyLayout } from '../helpers/layout';
import { captureScreen, waitForFonts } from '../helpers/screens';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';

/**
 * 상점 — 캐릭터와 장비를 보석으로 산다.
 *
 * 보석은 게임으로만 벌 수 있으므로, 갓 가입한 계정은 아무것도 살 수 없어야 한다.
 * "돈이 없어도 사진다"는 서버 검증이 뚫린 것이므로 반드시 막혀야 한다.
 */
test.describe('상점', () => {
	test('캐릭터와 장비가 보이고, 보석이 없으면 살 수 없다', async ({ page }, testInfo) => {
		const user = makeTestUser('shop', `${testInfo.project.name}${testInfo.workerIndex}`);

		await gotoReady(page, '/register');
		await page.getByLabel('닉네임').fill(user.nickname);
		await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
		await page.getByLabel('비밀번호 확인').fill(user.password);
		await page.getByRole('button', { name: '모험 시작하기' }).click();
		await page.waitForURL('**/character');
		await waitForHydration(page);
		await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
		await page.waitForURL((url) => url.pathname === '/');
		await waitForHydration(page);

		await gotoReady(page, '/shop');
		await waitForFonts(page);

		// 캐릭터 5종
		await expect(page.getByRole('heading', { name: '한자 기사' })).toBeVisible();
		await expect(page.getByRole('heading', { name: '한자 여우' })).toBeVisible();
		await expect(page.getByText('사용 중')).toBeVisible();

		await captureScreen(page, testInfo, 'shop-character');
		await expectHealthyLayout(page);

		// 보석 0 이면 구매 버튼이 잠겨 있다
		const buyFox = page.locator('button', { hasText: '💎 200' });
		await expect(buyFox).toBeDisabled();

		// 장비 탭
		await page.getByRole('button', { name: /장비/ }).click();
		await expect(page.getByRole('heading', { name: '나무 검' })).toBeVisible();
		await expect(page.getByRole('heading', { name: '수호 부적' })).toBeVisible();

		await captureScreen(page, testInfo, 'shop-item');
		await expectHealthyLayout(page);
	});

	test('보석이 모자라면 서버가 구매를 거절한다', async ({ page, request }, testInfo) => {
		const user = makeTestUser('shopapi', `${testInfo.project.name}${testInfo.workerIndex}`);

		await gotoReady(page, '/register');
		await page.getByLabel('닉네임').fill(user.nickname);
		await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
		await page.getByLabel('비밀번호 확인').fill(user.password);
		await page.getByRole('button', { name: '모험 시작하기' }).click();
		await page.waitForURL('**/character');
		await waitForHydration(page);
		await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
		await page.waitForURL((url) => url.pathname === '/');

		/*
		 * 화면의 버튼이 비활성이어도 요청 자체는 만들 수 있다.
		 * 서버가 잔액을 다시 확인하는지 직접 두드려 본다 — 여기가 뚫리면 게임이 무너진다.
		 */
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
		const baseURL = new URL(page.url()).origin;

		const response = await request.post(`${baseURL}/shop?/buyCharacter`, {
			headers: {
				cookie: cookieHeader,
				origin: baseURL,
				'content-type': 'application/x-www-form-urlencoded'
			},
			data: 'class=fox'
		});

		const body = await response.text();
		expect(body, '보석이 없는데 구매가 성공하면 안 된다').toContain('failure');
		expect(body).toContain('보석이 모자라요');
	});
});
