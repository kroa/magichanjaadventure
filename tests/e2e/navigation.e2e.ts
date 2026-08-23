import { expect, test } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';

/**
 * "이 화면에서 어떻게 나가지?" 회귀 테스트.
 *
 * 하단 네비게이션이 `sm:hidden` 이라 **데스크톱에서는 메뉴가 아예 없었다.**
 * 상점이나 도감에 들어가면 뒤로가기 말고는 빠져나올 방법이 없었다.
 * 아이는 브라우저 뒤로가기를 잘 쓰지 않는다 — 화면 안에 길이 보여야 한다.
 *
 * 그래서 "네비 요소가 DOM 에 있는가"가 아니라
 * **모든 뷰포트에서 실제로 눌러서 나갈 수 있는가**를 확인한다.
 */

const EXITABLE = ['/shop', '/collection', '/learn'];

test('모든 화면에서 주요 메뉴로 빠져나갈 수 있다', async ({ page }, testInfo) => {
	const user = makeTestUser('exit', `${testInfo.project.name}${testInfo.workerIndex}n`);

	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');

	for (const path of EXITABLE) {
		await gotoReady(page, path);

		// 이 뷰포트에서 실제로 보이는 메뉴 (모바일=하단 / 데스크톱=상단)
		const menu = page.getByRole('navigation', { name: '주요 메뉴' }).filter({ visible: true });
		await expect(menu, `${path} 에서 나갈 메뉴가 보이지 않는다`).toHaveCount(1);

		const home = menu.getByRole('link', { name: /모험/ });
		await expect(home).toBeVisible();
		await home.click();

		await page.waitForURL((url) => url.pathname === '/');
	}
});

test('집중 모드 화면은 메뉴 대신 나가기 버튼으로 빠져나간다', async ({ page }, testInfo) => {
	const user = makeTestUser('qexit', `${testInfo.project.name}${testInfo.workerIndex}s`);

	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');

	// 문제가 있어야 진짜 퀴즈 화면(나가기 버튼이 있는 화면)이 나온다
	await gotoReady(page, '/learn');
	await page.getByRole('button', { name: '이 한자 배우기' }).click();
	await expect(page.getByTestId('learn-done')).toBeVisible();

	/*
	 * 퀴즈와 대결은 집중을 위해 메뉴를 숨긴다. 대신 나가기 버튼이 **반드시** 있어야 한다.
	 * 메뉴를 끈 화면에 나가기 버튼도 없으면 갇힌다.
	 */
	// 복습(/quiz)은 메뉴에 없다 — 지도의 섬 차림표에 있다
	for (const path of ['/quiz', '/battle', '/word']) {
		await gotoReady(page, path);

		const menu = page.getByRole('navigation', { name: '주요 메뉴' }).filter({ visible: true });
		await expect(menu, `${path} 는 집중 모드라 메뉴가 없어야 한다`).toHaveCount(0);

		const exit = page.getByRole('link', { name: '모험 지도로 나가기' });
		await expect(exit, `${path} 에 나가기 버튼이 없다`).toBeVisible();
		await exit.click();
		await page.waitForURL((url) => url.pathname === '/');
	}
});

/**
 * 지도의 시트(섬 차림표 / 내 정보)는 **한 번에 하나만** 떠야 한다.
 *
 * 둘 다 화면 아래에 고정으로 붙는데, 같이 열리면 완전히 포개진다.
 * 섬을 먼저 누른 뒤 "내 정보 → 로그아웃" 을 누르면 위에 덮인 섬 시트의
 * `합체 공방` 이 대신 눌려서 **로그아웃이 아예 안 됐다.**
 *
 * 기존 로그아웃 테스트는 섬을 누르지 않고 바로 눌렀기 때문에 이걸 놓쳤다.
 */
test('섬 차림표를 열어 둔 채로도 로그아웃할 수 있다', async ({ page }, testInfo) => {
	const user = makeTestUser('sheet', `${testInfo.project.name}${testInfo.workerIndex}h`);

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

	await page.locator('.island').first().click();
	await expect(page.getByTestId('island-sheet')).toBeVisible();

	await page.getByRole('button', { name: '내 정보' }).click();
	await expect(page.getByTestId('me-sheet')).toBeVisible();
	await expect(page.getByTestId('island-sheet'), '시트는 하나만 떠야 한다').toHaveCount(0);

	await page.getByRole('button', { name: '로그아웃' }).click();
	await page.waitForURL('**/login');
});

/**
 * 시트 안의 버튼이 시트 밖으로 삐져나오면 안 된다.
 *
 * 데스크톱에서 버튼 넉 장을 네 칸으로 잘랐더니 한 칸이 버튼보다 좁아서
 * 버튼 줄이 통째로 흰 카드 밖으로 튀어나왔다. **화면 밖으로는 안 나가서**
 * 가로 넘침 검사에는 걸리지 않았다 — 그래서 부모 상자 기준으로 따로 본다.
 */
test('섬 차림표 버튼이 시트 안에 들어 있다', async ({ page }, testInfo) => {
	const user = makeTestUser('fitin', `${testInfo.project.name}${testInfo.workerIndex}i`);

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

	for (const open of [
		async () => page.locator('.island').first().click(),
		async () => page.getByRole('button', { name: '내 정보' }).click()
	]) {
		await open();
		const sheet = page.locator('[data-testid$="-sheet"]');
		await expect(sheet).toBeVisible();
		// 올라오는 연출이 끝난 뒤에 잰다
		await page.waitForTimeout(400);

		const box = await sheet.boundingBox();
		expect(box).not.toBeNull();

		const buttons = sheet.locator('a.game-btn, button.game-btn');
		const count = await buttons.count();
		expect(count).toBeGreaterThan(0);

		for (let i = 0; i < count; i++) {
			const btn = buttons.nth(i);
			const label = (await btn.textContent())?.trim() ?? `${i}`;
			const b = await btn.boundingBox();
			expect(b, `${label} 의 위치를 잴 수 없다`).not.toBeNull();
			if (!b || !box) continue;

			// 반올림 오차만 허용한다
			expect(b.x, `"${label}" 이 시트 왼쪽으로 삐져나왔다`).toBeGreaterThanOrEqual(box.x - 1);
			expect(b.x + b.width, `"${label}" 이 시트 오른쪽으로 삐져나왔다`).toBeLessThanOrEqual(
				box.x + box.width + 1
			);
			expect(b.y + b.height, `"${label}" 이 시트 아래로 삐져나왔다`).toBeLessThanOrEqual(
				box.y + box.height + 1
			);
		}
	}
});
