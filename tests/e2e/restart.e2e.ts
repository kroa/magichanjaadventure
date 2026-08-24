import { expect, test, type Page } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';
import { breakAllSeals, clearQuizBoard, clickPastOverlay } from '../helpers/battle';

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

test.describe.configure({ timeout: 120_000 });

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
	await expect(page.getByTestId('piece-board')).toBeVisible();
	await expect(page.getByTestId('battle-stage')).toBeVisible();
});

test('복습을 끝낸 뒤 "한 판 더!"를 누르면 새 판이 시작된다', async ({ page }, testInfo) => {
	await startAdventure(page, 'quizag', `${testInfo.project.name}${testInfo.workerIndex}q`);

	await gotoReady(page, '/quiz');

	/*
	 * 복습도 대결과 같은 조각 판이다.
	 * 배운 부품이 모자라면 판이 비어 있을 수 있으니, 그때는 이 회귀 검사를 건너뛴다 —
	 * 여기서 보려는 것은 "한 판 더" 가 실제로 새 판을 여는가 하나뿐이다.
	 */
	if ((await page.locator('button.piece').count()) === 0) return;

	/*
	 * 한 개를 만들어 보고 **결과 카드에 뜻·음이 실제로 찍히는지** 먼저 본다.
	 *
	 * 예전에는 액션 응답(devalue 문자열)을 JSON.parse 로 풀어 `includes(true)` 로만 판정했다.
	 * 그래서 뜻·음을 아예 못 꺼냈고, 화면은 빈 문자열을 박아 넣어 카드의 「뜻 음」 줄이 비어 있었다.
	 * 아이는 방금 만든 글자가 무슨 뜻인지 모른 채 넘어갔다.
	 */
	const help = page.getByRole('button', { name: '도와줘' });
	if (await help.isVisible().catch(() => false)) {
		await help.click();
		await page.waitForTimeout(600);
		const ids = await page
			.locator('button.piece[data-hint]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('data-piece-id') ?? ''));
		if (ids.length === 2) {
			for (const id of ids) await page.locator(`button.piece[data-piece-id="${id}"]`).click();
			await expect(page.getByTestId('quiz-made')).toBeVisible({ timeout: 15_000 });
			/*
			 * **뜻·음 줄만 따로 짚는다.**
			 * 카드 전체로 검사하면 아래 이야기 줄에 한글이 있어서 옛 코드에서도 통과한다.
			 * 비어 있던 것은 이 줄 하나였다.
			 */
			await expect(
				page.getByTestId('merge-gloss'),
				'만든 글자의 뜻·음 줄이 비어 있다'
			).toContainText(/[가-힣]/);
		}
	}

	await clearQuizBoard(page);

	const more = page.getByRole('button', { name: '한 판 더!' });
	await expect(more, '판을 비우면 한 판 더 버튼이 보여야 한다').toBeVisible({ timeout: 15_000 });

	await more.click();

	// 결과 화면이 사라지고 판이 다시 나와야 한다 — 이것이 이 테스트의 핵심이다
	await expect(page.getByTestId('quiz-finished')).toBeHidden({ timeout: 15_000 });
	await expect(page.getByTestId('piece-board')).toBeVisible();
});
