import { expect, test } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';
import { expectHealthyLayout } from '../helpers/layout';
import { breakAllSeals } from '../helpers/battle';

/**
 * 보석을 모아 실제로 사 본다.
 *
 * 여기서 보려는 것은 두 가지다.
 *  1. **모으는 길이 실제로 존재하는가.** 상점은 오랫동안 "보석은 퀴즈 · 대결 · 업적으로
 *     모을 수 있어요" 라고 적어 두고 있었는데, 퀴즈로는 한 개도 안 나온다.
 *     아이가 그 말을 믿고 복습만 반복하면 영원히 아무것도 못 산다.
 *  2. **사는 순간이 사건인가.** 예전에는 숫자가 조용히 줄고 카드가 "보유 중" 이 되는 것이 전부였다.
 *     여러 판을 이겨 모은 것을 쓰는 순간인데 아무 일도 안 일어난 것처럼 보였다.
 */
test('대결로 보석을 모아 장비를 사면 연출이 뜬다', async ({ page }, testInfo) => {
	test.setTimeout(300_000);

	const user = makeTestUser('buy', `${testInfo.project.name}${testInfo.workerIndex}b`);
	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');

	/** 가장 싼 장비가 30 보석. 대결 승리는 5~8 이라 대여섯 판이면 닿는다 */
	const TARGET = 30;

	/** HUD 의 보석 배지는 접근 이름에 개수를 그대로 담는다 */
	async function gems(): Promise<number> {
		await gotoReady(page, '/shop');
		const label =
			(await page
				.getByTestId('top-hud')
				.getByLabel(/보석 \d+개/)
				.getAttribute('aria-label')) ?? '';
		return Number(label.replace(/\D/g, '')) || 0;
	}

	let have = await gems();
	for (let round = 0; round < 8 && have < TARGET; round++) {
		await gotoReady(page, '/battle');
		await breakAllSeals(page);
		await expect(page.getByTestId('battle-outcome')).toContainText('승리');
		have = await gems();
	}

	expect(
		have,
		`대결 여덟 판으로도 ${TARGET} 보석을 못 모았다 — 모으는 길이 막혔다`
	).toBeGreaterThanOrEqual(TARGET);

	// 이제 살 수 있다. 잠금 목표가 사라지고 진짜 구매 버튼이 나타난다
	await gotoReady(page, '/shop');
	await page.getByRole('button', { name: /장비/ }).click();

	const buy = page.locator('button', { hasText: '💎 30' }).first();
	await expect(buy, '보석이 충분한데도 살 수 없다').toBeVisible();
	await buy.click();

	const overlay = page.getByTestId('purchase-overlay');
	await expect(overlay, '샀는데 아무 일도 안 일어난다').toBeVisible({ timeout: 15_000 });
	await expect(overlay).toHaveAttribute('data-anim-state', 'done', { timeout: 15_000 });

	// 보석이 줄어든 것을 화면이 직접 보여 준다
	const shown = Number(
		((await page.getByTestId('purchase-gems').textContent()) ?? '').replace(/\D/g, '')
	);
	expect(shown, '연출이 끝났는데 보석이 줄지 않았다').toBe(have - 30);

	await expectHealthyLayout(page);

	await overlay.getByRole('button', { name: '좋아!' }).click();
	await expect(overlay).toBeHidden();

	// 산 것은 실제로 내 것이 되어 있다
	await expect(page.getByText('보유 중').first()).toBeVisible();
});
