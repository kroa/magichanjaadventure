import { expect, test, type Page } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';
import { expectHealthyLayout } from '../helpers/layout';
import { learnHanja } from '../helpers/learn';
import { captureScreen, waitForFonts } from '../helpers/screens';

/**
 * 합체 공방 — 이 게임의 핵심 화면.
 *
 * 검증의 초점이 퀴즈와 다르다. 퀴즈는 "정답을 골랐는가" 를 보지만
 * 여기서는 **아이가 부품을 붙여 새 한자를 만들어 냈는가** 를 본다.
 * 그리고 틀린 조합에 **벌을 주지 않는지** 를 함께 확인한다 —
 * 그게 무너지면 이 화면은 그냥 다른 모양의 시험지가 된다.
 *
 * 준비가 오래 걸린다: 日(11번째)·月(12번째)을 재료로 쓰려면 12자를 실제로 배워야 하고,
 * 그 한 자 한 자가 진짜 서버 왕복이다. 기본 45초로는 준비 도중에 끊긴다.
 */
test.describe.configure({ timeout: 120_000 });

/** 8급부터 순서대로 배우면 日·月 이 앞쪽에 나온다. n자를 배운다. */
async function signUpAndLearn(page: Page, label: string, seed: string, count: number) {
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

	await learnHanja(page, count);
	return user;
}

/** 부품 서랍에서 한자 하나를 골라 합체판에 올린다. */
async function place(page: Page, character: string) {
	await page.locator('button.part').filter({ hasText: character }).first().click();
}

test('부품 두 개를 붙이면 새 한자가 만들어진다', async ({ page }, testInfo) => {
	// 日(11번째)·月(12번째) 을 가지려면 딱 12자가 필요하다
	await signUpAndLearn(page, 'fuse', `${testInfo.project.name}${testInfo.workerIndex}`, 12);

	await gotoReady(page, '/fusion');
	await waitForFonts(page);
	await expect(page.getByTestId('fusion-board')).toBeVisible();

	await captureScreen(page, testInfo, 'fusion');
	await expectHealthyLayout(page);

	await place(page, '日');
	await place(page, '月');

	await page.getByRole('button', { name: '합체!' }).click();

	// 日 + 月 = 明 (밝을 명)
	const reveal = page.getByTestId('fusion-reveal');
	await expect(reveal).toBeVisible();
	await expect(reveal).toContainText('明');
	await expect(reveal).toContainText('밝을');
	// 왜 그런 뜻이 되는지가 함께 나와야 한다. 이게 학습의 알맹이다
	await expect(reveal).toContainText('해와 달');

	await captureScreen(page, testInfo, 'fusion-made');
	await expectHealthyLayout(page);

	await page.getByRole('button', { name: '좋아!' }).click();
	await expect(reveal).toBeHidden();
});

test('만든 한자는 도감에 들어간다', async ({ page }, testInfo) => {
	await signUpAndLearn(page, 'fusedex', `${testInfo.project.name}${testInfo.workerIndex}`, 12);

	/*
	 * 지역별 칸이 아니라 **전체 수집 수**로 센다.
	 * 明 은 6급II라 아직 못 간 지역에 속한다 — 합체는 앞선 지역의 한자도 손에 넣게 해 준다.
	 * 지역 칸만 세면 늘어난 것을 놓친다.
	 */
	const total = page.getByRole('progressbar', { name: /전체 수집/ });
	await gotoReady(page, '/collection');
	const before = Number(await total.getAttribute('aria-valuenow'));

	await gotoReady(page, '/fusion');
	await place(page, '日');
	await place(page, '月');
	await page.getByRole('button', { name: '합체!' }).click();
	await expect(page.getByTestId('fusion-reveal')).toBeVisible();
	await page.getByRole('button', { name: '좋아!' }).click();

	// 합체로 얻은 한자도 그냥 "배운 한자" 다 — 도감 총계가 하나 늘어야 한다
	await gotoReady(page, '/collection');
	await expect.poll(async () => Number(await total.getAttribute('aria-valuenow'))).toBe(before + 1);
});

test('안 되는 조합에도 벌을 주지 않는다', async ({ page }, testInfo) => {
	await signUpAndLearn(page, 'fusefail', `${testInfo.project.name}${testInfo.workerIndex}`, 12);

	await gotoReady(page, '/fusion');

	/*
	 * 一 + 二 는 조합표에 없다.
	 * "틀렸어요" 라는 말도, 점수가 깎이는 일도 없어야 한다.
	 * 아이가 마음 놓고 아무거나 붙여 볼 수 있어야 발견이 일어난다.
	 */
	await place(page, '一');
	await place(page, '二');
	await page.getByRole('button', { name: '합체!' }).click();

	await expect(page.getByTestId('fusion-reveal')).toBeHidden();
	await expect(page.getByText(/틀렸|실패|아니에요|오답/)).toHaveCount(0);

	// 부품이 되돌아와 바로 다시 시도할 수 있어야 한다
	await expect(page.locator('.slot.filled')).toHaveCount(0, { timeout: 5000 });

	await place(page, '日');
	await place(page, '月');
	await page.getByRole('button', { name: '합체!' }).click();
	await expect(page.getByTestId('fusion-reveal')).toBeVisible();
});

test('배우지 않은 부품으로는 서버가 합체를 거절한다', async ({ page, request }, testInfo) => {
	await signUpAndLearn(page, 'fuseapi', `${testInfo.project.name}${testInfo.workerIndex}`, 2);

	/*
	 * 화면에 없는 부품이라도 요청은 만들 수 있다.
	 * 서버가 "정말 배운 한자인지" 다시 확인하는지 직접 두드려 본다.
	 * 여기가 뚫리면 아무 한자나 가질 수 있다.
	 */
	const cookies = await page.context().cookies();
	const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
	const baseURL = new URL(page.url()).origin;

	const response = await request.post(`${baseURL}/fusion?/fuse`, {
		headers: {
			cookie: cookieHeader,
			origin: baseURL,
			'content-type': 'application/x-www-form-urlencoded'
		},
		// 魚 + 羊 = 鮮. 2자만 배운 계정은 둘 다 가지고 있지 않다
		data: 'part=%E9%AD%9A&part=%E7%BE%8A'
	});

	const body = await response.text();
	expect(body, '안 배운 부품으로 합체가 성공하면 안 된다').toContain('missing-parts');
	expect(body).not.toContain('鮮');
});
