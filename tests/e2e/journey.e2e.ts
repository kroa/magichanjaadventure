import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { expectHealthyLayout } from '../helpers/layout';
import { captureScreen, waitForFonts } from '../helpers/screens';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';
import { breakAllSeals } from '../helpers/battle';
import { settleLevelUp } from '../helpers/learn';

/**
 * 아이가 실제로 걷는 길을 그대로 따라간다.
 *
 * 가입 → 캐릭터 선택 → 모험 지도 → 한자 배우기 → 퀴즈 → EXP 증가 → 도감 확인 → 대결
 *
 * 구현 세부가 아니라 **사용자 행동**을 검증한다 (docs/03-TEST-STRATEGY.md §3).
 */

async function signUp(page: Page, label: string, seed: string, testInfo?: TestInfo) {
	const user = makeTestUser(label, seed);
	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	if (testInfo) {
		await waitForFonts(page);
		await captureScreen(page, testInfo, 'register');
	}
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	return user;
}

async function pickWizard(page: Page) {
	// 카드 자체가 제출 버튼이다 — 한 번 누르면 선택된다 (JS 없이도 동작)
	await page.getByRole('button', { name: '한자 마법사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');
}

/** 한자 n개를 배운다. */
async function learnHanja(page: Page, count: number) {
	await gotoReady(page, '/learn');
	for (let i = 0; i < count; i++) {
		await page.getByRole('button', { name: '이 한자 배우기' }).click();
		await expect(page.getByTestId('learn-done')).toBeVisible();
		if (i < count - 1) {
			await page.getByRole('button', { name: '다음 한자 배우기' }).click();
			await expect(page.getByRole('button', { name: '이 한자 배우기' })).toBeVisible();
		}
	}
}

test.describe('아이의 첫 모험', () => {
	test('가입하고 캐릭터를 고르면 모험 지도에 도착한다', async ({ page }, testInfo) => {
		const user = await signUp(
			page,
			'start',
			`${testInfo.project.name}${testInfo.workerIndex}a`,
			testInfo
		);

		await expect(page.getByRole('heading', { name: '누구와 떠날까?' })).toBeVisible();
		await waitForFonts(page);
		await captureScreen(page, testInfo, 'character-select');
		await expectHealthyLayout(page);

		await pickWizard(page);

		/*
		 * 홈은 이제 섬 지도다. 액션 카드 목록이 아니라 **어디로 갈지 고르는 곳**이다.
		 * 지역 9개가 전부 보이고, 잠긴 곳도 보여야 한다 (갈 곳이 남았다는 감각).
		 */
		await expect(page.getByTestId('adventure-map')).toBeVisible();
		await expect(page.locator('button.island')).toHaveCount(9);
		await expect(page.getByTestId('top-hud')).toContainText(user.nickname);

		// 섬을 고르면 무엇을 할지 묻는다
		await page.locator('button.island[data-area="1"]').click();
		await expect(page.getByTestId('island-sheet')).toBeVisible();
		await page.getByRole('button', { name: '닫기' }).click();
		await expect(page.getByTestId('island-sheet')).toBeHidden();
		await captureScreen(page, testInfo, 'home');
		await expectHealthyLayout(page);
	});

	test('한자를 배우면 EXP 가 오르고 도감에 컬러로 나타난다', async ({ page }, testInfo) => {
		await signUp(page, 'learn', `${testInfo.project.name}${testInfo.workerIndex}b`);
		await pickWizard(page);

		// 배우기 전 EXP
		await gotoReady(page, '/learn');
		await waitForFonts(page);
		/*
		 * 배우기는 이제 **읽는 화면이 아니라 쓰는 화면**이다.
		 * 처음에는 따라 쓰는 칸만 있고, 뜻·음·예시는 다 쓴 **뒤에** 보상으로 나온다.
		 */
		const trace = page.getByTestId('trace-glyph');
		await expect(trace).toBeVisible();
		await expect(page.getByTestId('hanja-reveal'), '쓰기 전에는 답이 안 보여야 한다').toHaveCount(
			0
		);

		await captureScreen(page, testInfo, 'learn');
		await expectHealthyLayout(page);

		await page.getByRole('button', { name: '이 한자 배우기' }).click();
		await expect(page.getByTestId('learn-done')).toBeVisible();
		// 다 쓰고 나면 그때 뜻·음이 나온다
		await expect(page.getByTestId('hanja-reveal')).toBeVisible();
		const firstHanja = (
			await page.getByTestId('hanja-reveal').locator('.hanja').first().textContent()
		)?.trim();
		expect(firstHanja).toBeTruthy();

		// EXP 가 실제로 올랐다 (첫 획득 +20)
		const expBar = page.getByTestId('top-hud').getByRole('progressbar');
		await expect
			.poll(async () => Number(await expBar.getAttribute('aria-valuenow')))
			.toBeGreaterThan(0);

		// 도감에 컬러 카드로 나타난다
		await gotoReady(page, '/collection');
		await expect(page.getByTestId('collection-grid')).toBeVisible();
		const learnedSlot = page.locator('button.slot.learned').first();
		await expect(learnedSlot).toBeVisible();
		await expect(learnedSlot).toContainText(firstHanja!);

		await captureScreen(page, testInfo, 'collection');
		await expectHealthyLayout(page);
	});

	test('배운 한자로 복습할 수 있다', async ({ page }, testInfo) => {
		await signUp(page, 'quiz', `${testInfo.project.name}${testInfo.workerIndex}c`);
		await pickWizard(page);
		await learnHanja(page, 4);

		/*
		 * 배운 개수가 도감에 그대로 반영되는지 확인한다.
		 * '다음 한자'로 넘어갈 때 데이터 갱신 전에 같은 한자를 다시 배워
		 * 4자를 눌렀는데 2자만 들어간 버그가 있었다. 그 회귀를 여기서 막는다.
		 */
		await gotoReady(page, '/collection');
		await expect(page.locator('button.slot.learned')).toHaveCount(4);

		/*
		 * 복습도 대결과 **같은 판, 같은 손동작**이다.
		 * 예전에는 여기만 4지선다였고, 화면마다 규칙이 다르면 아이는 게임이 아니라
		 * 화면 사용법을 배우게 된다.
		 */
		await gotoReady(page, '/quiz');
		await waitForFonts(page);
		await expect(page.getByText(/틀렸|오답|정답입니다/)).toHaveCount(0);

		await captureScreen(page, testInfo, 'quiz');
		await expectHealthyLayout(page);
	});

	test('대결 화면이 뜨고 봉인을 깰 수 있다', async ({ page }, testInfo) => {
		// 봉인 3개를 실제로 깨는 데 시간이 걸린다 (합체 연출 + 보상 화면)
		test.setTimeout(120_000);
		await signUp(page, 'battle', `${testInfo.project.name}${testInfo.workerIndex}d`);
		await pickWizard(page);

		// 합체 대결은 배운 한자를 요구하지 않는다 — 부품 서랍이 봉인에서 유도된다
		await gotoReady(page, '/battle');
		await waitForFonts(page);
		await expect(page.getByTestId('battle-stage')).toBeVisible();
		await expect(page.getByTestId('piece-board')).toBeVisible();

		// PixiJS 이펙트 레이어가 실제로 초기화된다
		await expect(page.getByTestId('battle-canvas')).toHaveAttribute('data-ready', 'true', {
			timeout: 15_000
		});

		await captureScreen(page, testInfo, 'battle');
		await expectHealthyLayout(page);

		// 도움을 끝까지 쓰면 한자를 몰라도 봉인이 깨진다
		await breakAllSeals(page);
		await expect(page.getByTestId('battle-outcome')).toContainText('승리');
	});

	test('로그아웃하고 다시 로그인할 수 있다', async ({ page }, testInfo) => {
		const user = await signUp(page, 'again', `${testInfo.project.name}${testInfo.workerIndex}e`);
		await pickWizard(page);

		// 로그아웃은 지도 왼쪽 아래 "내 카드" 안에 있다 (지도를 어지럽히지 않기 위해서다)
		await page.getByRole('button', { name: '내 정보' }).click();
		await page.getByRole('button', { name: '로그아웃' }).click();
		await page.waitForURL('**/login');
		await waitForHydration(page);
		await waitForFonts(page);
		await captureScreen(page, testInfo, 'login');
		await expectHealthyLayout(page);

		await page.getByLabel('닉네임').fill(user.nickname);
		await page.getByLabel('비밀번호').fill(user.password);
		await page.getByRole('button', { name: '모험 이어하기' }).click();

		await page.waitForURL((url) => url.pathname === '/');
		await expect(page.getByTestId('top-hud')).toContainText(user.nickname);
	});

	test('배우고 난 뒤의 놀이 버튼은 지킬 수 있는 약속만 한다', async ({ page }, testInfo) => {
		/*
		 * 예전 버튼은 무조건 "방금 배운 걸로 복습" 이라 쓰고 `/quiz?focus=` 로 보냈다.
		 * 그 약속이 실제로 지켜지는 글자는 1000자 중 26자뿐이라, 나머지 974번은
		 * 상관없는 판을 내주면서 "방금 배운 걸로" 라고 말한 셈이었다.
		 * 사용자가 場 을 배우고 나서 곧바로 잡아낸 어긋남이 이것이다.
		 *
		 * 새싹 마을은 조합 부품부터 내므로 네 자(一 二 日 月)면 明 이 열린다.
		 */
		const user = await signUp(page, 'promise', `${testInfo.project.name}${testInfo.workerIndex}p`);
		expect(user.nickname).toBeTruthy();
		await pickWizard(page);
		await learnHanja(page, 4);

		/*
		 * 네 자면 레벨 2가 된다(20 EXP × 4).
		 * 형제 테스트들은 곧바로 다른 화면으로 넘어가서 이 오버레이를 안 만나지만,
		 * 이 테스트는 배우기 화면에 남아 버튼을 누르므로 반드시 걷어내야 한다.
		 */
		await settleLevelUp(page);

		// 붙일 짝이 실제로 있으니 그 짝을 이름으로 불러 준다
		const play = page.getByRole('link', { name: /붙여 보기/ });
		await expect(play, '네 자를 배웠는데 붙일 짝을 못 찾았다').toBeVisible();
		await play.click();

		// 그리고 정말로 붙일 것이 깔려 있어야 한다 — 이게 약속의 이행이다
		await page.waitForURL(/\/quiz/);
		await waitForHydration(page);
		await expect(page.locator('button.piece').first()).toBeVisible();
	});

	test('로그인하지 않으면 게임 화면에 들어갈 수 없다', async ({ page }) => {
		for (const path of ['/', '/learn', '/quiz', '/collection', '/battle']) {
			await page.goto(path);
			await expect(page).toHaveURL(/\/login$/);
		}
	});

	test('틀린 비밀번호로는 로그인되지 않는다', async ({ page }, testInfo) => {
		const user = await signUp(page, 'wrongpw', `${testInfo.project.name}${testInfo.workerIndex}f`);
		await pickWizard(page);
		// 로그아웃은 지도 왼쪽 아래 "내 카드" 안에 있다 (지도를 어지럽히지 않기 위해서다)
		await page.getByRole('button', { name: '내 정보' }).click();
		await page.getByRole('button', { name: '로그아웃' }).click();
		await page.waitForURL('**/login');
		await waitForHydration(page);

		await page.getByLabel('닉네임').fill(user.nickname);
		await page.getByLabel('비밀번호').fill('CompletelyWrong999!');
		await page.getByRole('button', { name: '모험 이어하기' }).click();

		await expect(page.getByRole('alert')).toContainText('맞지 않아요');
		await expect(page).toHaveURL(/\/login$/);
	});
});
