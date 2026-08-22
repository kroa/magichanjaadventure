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
 * 준비가 오래 걸린다: 한 자 한 자가 진짜 서버 왕복이다. 기본 45초로는 준비 도중에 끊긴다.
 * (배우기가 "조합 부품 먼저" 로 바뀐 뒤 日·月 은 3·4번째다. 예전에는 11·12번째였다.)
 */
test.describe.configure({ timeout: 120_000 });

/** 새싹 마을은 조합 부품부터 낸다 — 一 二 日 月 水 木 … 순이다. n자를 배운다. */
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
	// 타일에는 글자가 없다(그림뿐). data-part 로 짚는다
	await page.locator(`button.part[data-part="${character}"]`).first().click();
}

test('부품 두 개를 붙이면 새 한자가 만들어진다', async ({ page }, testInfo) => {
	// 日·月 은 3·4번째지만, 서랍이 여러 타일로 찬 상태의 배치도 함께 보려고 12자를 배운다
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
	 *
	 * **말은 해 주되 채점은 하지 않는다.**
	 * 예전에는 아무 말도 없이 살짝 흔들기만 했는데, 아이에게 그건 관대함이 아니라
	 * "아무 일도 안 일어남" 이었다. 그래서 한 줄을 띄우되 판정어는 쓰지 않는다 —
	 * 주어가 아이가 아니라 부품이어야 한다("네가 틀렸다" 가 아니라 "이 둘은 안 붙는다").
	 */
	await place(page, '一');
	await place(page, '二');
	await page.getByRole('button', { name: '합체!' }).click();

	await expect(page.getByTestId('fusion-reveal')).toBeHidden();
	await expect(page.getByTestId('fusion-nojoin')).toContainText('안 붙어요');
	// 이 단언이 "공방은 시험지가 아니다" 의 마지막 방어선이다
	await expect(page.getByText(/틀렸|실패|아니에요|오답/)).toHaveCount(0);

	// 말풍선이 떴다 사라지는 동안 「합체!」 버튼이 손가락 아래에서 움직이면 안 된다
	await expectHealthyLayout(page);

	// 부품이 되돌아와 바로 다시 시도할 수 있어야 한다
	await expect(page.locator('.cell.filled')).toHaveCount(0, { timeout: 5000 });

	await place(page, '日');
	await place(page, '月');
	await page.getByRole('button', { name: '합체!' }).click();
	await expect(page.getByTestId('fusion-reveal')).toBeVisible();
});

test('두 번 연속 실패해도 매번 반응한다', async ({ page }, testInfo) => {
	/*
	 * `shake` 는 단조 증가 카운터인데 `class:shake={shake > 0}` 로 붙여 놨었다.
	 * 첫 실패에 클래스가 붙은 뒤 안 떨어져서 CSS 애니메이션이 재시작하지 않았고,
	 * **두 번째 실패부터는 아무 반응이 없었다.** 몸이 먼저 말해 주는 자리가 죽어 있었다.
	 */
	await signUpAndLearn(page, 'fusetwice', `${testInfo.project.name}${testInfo.workerIndex}`, 12);
	await gotoReady(page, '/fusion');

	for (const attempt of [1, 2]) {
		await place(page, '一');
		await place(page, '二');
		await page.getByRole('button', { name: '합체!' }).click();
		await expect(
			page.getByTestId('fusion-nojoin'),
			`${attempt}번째 실패에 아무 말도 없다`
		).toBeVisible();
		// 다음 시도 전에 말풍선이 스스로 사라지기를 기다린다
		await expect(page.getByTestId('fusion-nojoin')).toBeHidden({ timeout: 5000 });
	}
});

test('막히면 도움 버튼이 붙는 짝을 짚어 준다', async ({ page }, testInfo) => {
	await signUpAndLearn(page, 'fusehint', `${testInfo.project.name}${testInfo.workerIndex}`, 12);
	await gotoReady(page, '/fusion');
	await expect(page.getByTestId('fusion-board')).toBeVisible();

	await page.getByRole('button', { name: '도와줘' }).click();

	// 짝을 빛낼 뿐 **놓아 주지는 않는다** — 마지막 손가락은 아이 것이다
	const lit = page.locator('button.part[data-hint]');
	await expect(lit).not.toHaveCount(0);
	await expect(page.locator('.cell.filled')).toHaveCount(0);

	// 빛난 것끼리 붙이면 실제로 만들어져야 한다 (죽은 힌트가 아니어야 한다)
	const chars = await lit.evaluateAll((els) => els.map((el) => el.getAttribute('data-part') ?? ''));
	for (const c of chars.length === 1 ? [chars[0], chars[0]] : chars.slice(0, 2)) {
		await place(page, c);
	}
	await page.getByRole('button', { name: '합체!' }).click();
	await expect(page.getByTestId('fusion-reveal')).toBeVisible();

	await expectHealthyLayout(page);
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
