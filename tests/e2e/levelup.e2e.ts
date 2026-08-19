import { expect, test } from '@playwright/test';
import { expectHealthyLayout } from '../helpers/layout';
import { captureScreen, waitForFonts } from '../helpers/screens';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';

/**
 * 레벨업 연출 (PHASE 13).
 *
 * 레벨 1 → 2 는 100 EXP 가 필요하고 한자 최초 획득은 20 EXP 다.
 * 첫 한자에는 'first_hanja' 업적(+20)이 붙으므로 4~5자를 배우면 반드시 레벨업한다.
 */
test.describe('레벨업 연출', () => {
	test('한자를 모으면 레벨업 연출이 뜨고 끝까지 재생된다', async ({ page }, testInfo) => {
		const user = makeTestUser('lvup', `${testInfo.project.name}${testInfo.workerIndex}`);

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

		await gotoReady(page, '/learn');

		const overlay = page.getByTestId('levelup-overlay');

		// 레벨업이 뜰 때까지 한자를 배운다 (넉넉히 8회 시도)
		for (let i = 0; i < 8; i++) {
			await page.getByRole('button', { name: '이 한자 배우기' }).click();
			await expect(page.getByTestId('learn-done')).toBeVisible();

			if (await overlay.isVisible().catch(() => false)) break;

			await page.getByRole('button', { name: '다음 한자 배우기' }).click();
			await expect(page.getByRole('button', { name: '이 한자 배우기' })).toBeVisible();
		}

		await expect(overlay).toBeVisible();

		// GSAP 타임라인이 끝까지 재생된다
		await expect(overlay).toHaveAttribute('data-anim-state', 'done', { timeout: 15_000 });

		// 연출이 끝난 뒤 표시되는 레벨은 실제로 2 이상이다
		const shown = Number(await page.getByTestId('levelup-number').textContent());
		expect(shown).toBeGreaterThanOrEqual(2);

		await waitForFonts(page);
		await captureScreen(page, testInfo, 'levelup', { fullPage: false });
		await expectHealthyLayout(page);

		// 닫으면 게임으로 돌아간다
		await page.getByRole('button', { name: '계속 모험하기' }).click();
		await expect(overlay).toBeHidden();

		// HUD 의 레벨 표시도 함께 올라가 있다
		await expect(page.getByTestId('top-hud')).toContainText(String(shown));
	});
});
