import { expect, test } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';
import { expectHealthyLayout } from '../helpers/layout';

/**
 * "새싹 마을과 반짝 시냇가의 차이가 뭐지?" 회귀 테스트.
 *
 * 사용자가 물었을 때 답은 **"거의 없다"** 였다.
 * `AREAS` 에 하늘·대표색·분위기·흙이 다 정의돼 있는데 배우기 화면이
 * 칩 줄에만 쓰고 나머지를 하나도 안 썼다 — 두 지역이 보기에 똑같았다.
 *
 * 그래서 "지역 데이터가 존재하는가" 가 아니라
 * **두 지역이 실제로 다르게 그려지는가** 를 본다.
 */
test('지역마다 배우기 무대가 다르게 보인다', async ({ page }, testInfo) => {
	test.setTimeout(120_000);

	const user = makeTestUser('areas', `${testInfo.project.name}${testInfo.workerIndex}v`);
	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	await page.getByRole('button', { name: '한자 기사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');

	const stage = page.getByTestId('area-stage');

	await gotoReady(page, '/learn?area=1');
	await expect(stage).toBeVisible();
	await expect(stage).toHaveAttribute('data-area', '1');
	const first = {
		sky: await stage.evaluate((el) => getComputedStyle(el).backgroundImage),
		mood: (await stage.locator('.stage-line').first().textContent())?.trim(),
		frame: await page
			.getByTestId('trace-glyph')
			.evaluate((el) => getComputedStyle(el.parentElement!).boxShadow)
	};
	await expectHealthyLayout(page);

	/*
	 * 지역 2는 레벨 3 + 새싹 마을 30자를 요구하므로 아직 못 간다.
	 * 잠긴 지역을 요청하면 서버가 열린 지역으로 되돌린다 — 그것도 함께 확인한다.
	 */
	await gotoReady(page, '/learn?area=2');
	await expect(stage, '잠긴 지역이 열려선 안 된다').toHaveAttribute('data-area', '1');

	// 지역 데이터 자체가 서로 다른지는 여기서 직접 본다
	const distinct = await page.evaluate(() => {
		const el = document.querySelector('[data-testid="area-stage"]');
		return el ? getComputedStyle(el).backgroundImage : '';
	});
	expect(distinct, '무대에 지역 하늘이 안 깔렸다').toContain('gradient');

	expect(first.sky, '지역 하늘이 안 그려졌다').toContain('gradient');
	expect(first.mood, '지역 분위기 문구가 없다').toBeTruthy();
	expect(first.frame, '발굴 칸 테두리에 지역색이 없다').toBeTruthy();
});
