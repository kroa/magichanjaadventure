import { expect, test } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';
import { expectHealthyLayout } from '../helpers/layout';
import { learnHanja, settleLevelUp } from '../helpers/learn';

/**
 * 낱말 만들기 — **배운 글자가 실제로 쓰이는 자리.**
 *
 * 이 화면이 생긴 이유: 사용자가 場 과 室 로 **두 번** 신고했다.
 * 한자를 파냈는데 놀이에는 아무 상관 없는 글자가 나온다는 것이다.
 * 조합표가 1000자 중 58자만 건드리기 때문이고, 室 은 조합으로는 영원히 못 만든다
 * (至·宀 이 우리 1000자에 없다). 낱말은 955자를 덮는다.
 */
test.describe.configure({ timeout: 120_000 });

test('배운 글자 두 개로 낱말을 만든다', async ({ page }, testInfo) => {
	const user = makeTestUser('word', `${testInfo.project.name}${testInfo.workerIndex}w`);
	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');

	// 낱말이 열리려면 글자가 좀 있어야 한다
	await learnHanja(page, 12);
	await settleLevelUp(page);

	await gotoReady(page, '/word');

	// 판이 비어 있으면(글자가 모자라면) 갈 곳을 알려 준다 — 갇히지 않는다
	if ((await page.locator('button.char').count()) === 0) {
		await expect(page.getByRole('link', { name: '한자 배우러 가기' })).toBeVisible();
		return;
	}

	await expectHealthyLayout(page);

	// 도움을 받아 앞 글자와 뒤 글자를 짚는다
	await page.getByRole('button', { name: /도와줘/ }).click();
	const lit = page.locator('button.char[data-hint]');
	await expect(lit, '도움을 눌렀는데 아무것도 안 빛난다').toHaveCount(2, { timeout: 8000 });

	const ids = await lit.evaluateAll((els) =>
		els.map((el) => el.getAttribute('data-piece-id') ?? '')
	);
	for (const id of ids) {
		await page.locator(`button.char[data-piece-id="${id}"]`).click();
	}

	await page.getByRole('button', { name: '낱말 만들기!' }).click();

	const made = page.getByTestId('word-made');
	await expect(made, '두 글자를 제자리에 놓았는데 낱말이 안 됐다').toBeVisible({ timeout: 15_000 });
	// 낱말·읽기·뜻이 다 나와야 한다. 글자만 주면 배우는 것이 없다
	await expect(made).toContainText(/[가-힣]/);

	await expectHealthyLayout(page);
});

test('낱말이 아닌 짝에는 순서가 틀렸다고 혼내지 않는다', async ({ page }, testInfo) => {
	const user = makeTestUser('wordno', `${testInfo.project.name}${testInfo.workerIndex}x`);
	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');

	await learnHanja(page, 12);
	await settleLevelUp(page);
	await gotoReady(page, '/word');

	const chars = page.locator('button.char');
	if ((await chars.count()) < 2) return;

	/*
	 * 아무 둘이나 놓아 본다. 안 되는 짝이어도 **"순서가 틀렸어요" 라고 말하지 않는다** —
	 * 그 순간 이 화면은 시험지가 된다. 자리를 비워 다시 놓게 할 뿐이다.
	 */
	const ids = await chars.evaluateAll((els) =>
		els.map((el) => el.getAttribute('data-piece-id') ?? '')
	);
	await page.locator(`button.char[data-piece-id="${ids[0]}"]`).click();
	await page.locator(`button.char[data-piece-id="${ids[ids.length - 1]}"]`).click();
	await page.getByRole('button', { name: '낱말 만들기!' }).click();

	await expect(page.getByText(/틀렸|실패|오답|순서가/)).toHaveCount(0);
	// 자리가 비어 바로 다시 놓을 수 있어야 한다
	await expect(page.locator('.cell.filled')).toHaveCount(0, { timeout: 8000 });
});
