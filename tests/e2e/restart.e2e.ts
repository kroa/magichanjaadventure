import { expect, test, type Page } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';
import { breakAllSeals, clickPastOverlay } from '../helpers/battle';

/**
 * "다시 대결 / 한 판 더" 회귀 테스트.
 *
 * 이 버튼들은 원래 `<a href="/battle">` 링크였는데 **아무 반응이 없었다.** 원인이 둘이었다.
 *  1. Button 컴포넌트의 <a> 분기가 `{...rest}` 를 펼치지 않아 넘긴 속성이 조용히 사라졌다
 *  2. 이미 같은 URL 에 있으면 SvelteKit 이 컴포넌트를 다시 만들지 않아 결과 화면이 그대로 남았다
 *
 * 그래서 "링크가 있는지"가 아니라 **눌렀을 때 실제로 새 문제가 나오는지**를 본다.
 * 링크만 확인하는 테스트였다면 이 버그를 그대로 통과시켰을 것이다.
 */

async function startAdventure(page: Page, label: string, seed: string) {
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

	// 문제를 내려면 배운 한자가 있어야 한다
	await gotoReady(page, '/learn');
	for (let i = 0; i < 4; i++) {
		await page.getByRole('button', { name: '이 한자 배우기' }).click();
		await expect(page.getByTestId('learn-done')).toBeVisible();
		if (i < 3) {
			await page.getByRole('button', { name: '다음 한자 배우기' }).click();
			await expect(page.getByRole('button', { name: '이 한자 배우기' })).toBeVisible();
		}
	}
	return user;
}

test('대결이 끝난 뒤 "다시 대결"을 누르면 새 대결이 시작된다', async ({ page }, testInfo) => {
	await startAdventure(page, 'again', `${testInfo.project.name}${testInfo.workerIndex}r`);

	await gotoReady(page, '/battle');
	await expect(page.getByTestId('battle-stage')).toBeVisible();

	await breakAllSeals(page);

	const restart = page.getByRole('button', { name: '다시 대결' });
	await expect(restart, '대결이 끝나면 다시 대결 버튼이 보여야 한다').toBeVisible();

	await clickPastOverlay(page, '다시 대결');

	// 결과 화면이 사라지고 다시 봉인이 나와야 한다 — 이것이 이 테스트의 핵심이다
	await expect(page.getByTestId('battle-outcome')).toBeHidden({ timeout: 15_000 });
	await expect(page.getByTestId('seal-card')).toBeVisible();
	await expect(page.getByTestId('battle-stage')).toBeVisible();
});

test('퀴즈가 끝난 뒤 "한 판 더!"를 누르면 새 퀴즈가 시작된다', async ({ page }, testInfo) => {
	await startAdventure(page, 'quizag', `${testInfo.project.name}${testInfo.workerIndex}q`);

	await gotoReady(page, '/quiz');
	await expect(page.getByTestId('quiz-question')).toBeVisible();

	const more = page.getByRole('button', { name: '한 판 더!' });
	for (let i = 0; i < 40 && !(await more.isVisible()); i++) {
		const option = page.locator('button.option').first();
		if (await option.isVisible()) {
			await option.click();
			await expect(page.getByTestId('quiz-result')).toBeVisible();
		}
		const next = page.getByRole('button', { name: /다음 문제|결과 보기/ });
		if (await next.isVisible()) await next.click();
		await page.waitForTimeout(120);
	}

	await expect(more, '퀴즈가 끝나면 한 판 더 버튼이 보여야 한다').toBeVisible();

	await more.click();

	await expect(more).toBeHidden({ timeout: 15_000 });
	await expect(page.getByTestId('quiz-question')).toBeVisible();
});
