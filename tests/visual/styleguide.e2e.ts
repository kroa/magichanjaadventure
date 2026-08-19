import { expect, test } from '@playwright/test';
import { expectHealthyLayout } from '../helpers/layout';
import { captureScreen, waitForFonts } from '../helpers/screens';
import { gotoReady } from '../helpers/app';

/**
 * PHASE 2 디자인 시스템 검수.
 *
 * 스타일가이드는 모든 컴포넌트를 한 화면에 모아둔 곳이므로,
 * 여기서 레이아웃 규칙을 통과하면 개별 화면에서도 대체로 통과한다.
 */
test.describe('디자인 시스템', () => {
	test.beforeEach(async ({ page }) => {
		await gotoReady(page, '/styleguide');
		await waitForFonts(page);
	});

	test('모든 섹션이 렌더된다', async ({ page }) => {
		await expect(page.getByRole('heading', { name: '디자인 시스템', level: 1 })).toBeVisible();

		for (const title of ['캐릭터', '색상', '글자', '버튼', '진행바와 배지', '효과']) {
			await expect(page.getByRole('heading', { name: title, level: 2 })).toBeVisible();
		}
	});

	test('캐릭터 두 종이 모두 그려진다', async ({ page }) => {
		await expect(page.getByRole('img', { name: '한자 기사' }).first()).toBeVisible();
		await expect(page.getByRole('img', { name: '한자 마법사' }).first()).toBeVisible();
	});

	test('레이아웃 규칙을 위반하지 않는다', async ({ page }, testInfo) => {
		await expectHealthyLayout(page);
		await captureScreen(page, testInfo, 'styleguide');
	});

	test('토스트가 뜨고 사라진다', async ({ page }) => {
		await page.getByRole('button', { name: '정답 토스트' }).click();
		await expect(page.getByText('정답이에요! +10 EXP')).toBeVisible();
		await expect(page.getByText('정답이에요! +10 EXP')).toBeHidden({ timeout: 8000 });
	});

	test('모달이 열리고 ESC 로 닫힌다', async ({ page }) => {
		await page.getByRole('button', { name: '모달 열기' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(page.getByRole('heading', { name: '모험을 그만할까요?' })).toBeVisible();

		// 모달이 열린 상태에서도 레이아웃이 깨지지 않아야 한다
		await expectHealthyLayout(page);

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
	});

	test('EXP 진행바가 실제로 차오른다', async ({ page }) => {
		const bar = page.getByRole('progressbar', { name: /경험치/ }).first();
		const before = Number(await bar.getAttribute('aria-valuenow'));

		await page.getByRole('button', { name: '+40 EXP' }).click();

		await expect
			.poll(async () => Number(await bar.getAttribute('aria-valuenow')))
			.toBe(before + 40);
	});

	test('표정을 바꾸면 캐릭터가 반응한다', async ({ page }) => {
		const surprised = page.getByRole('button', { name: '놀람' });
		await surprised.click();
		await expect(surprised).toHaveAttribute('aria-pressed', 'true');
	});
});
