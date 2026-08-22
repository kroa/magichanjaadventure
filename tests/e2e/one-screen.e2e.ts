import { expect, test, type Page } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';
import { expectHealthyLayout, settleAnimations } from '../helpers/layout';

/**
 * "한 화면에 다 담기는가" 회귀 테스트.
 *
 * 퀴즈와 대결은 답을 고르는 화면이다. 마지막 보기나 '다음' 버튼을 보려고
 * 스크롤을 내려야 하면 리듬이 끊기고, 아이는 버튼이 없는 줄 안다.
 * 실제로 390×844 화면에서 대결 문서 높이가 952px 이라 마지막 보기가 잘렸다.
 *
 * 그래서 "요소가 존재하는가"가 아니라 **처음 화면 안에 들어와 있는가**를 본다.
 */

async function readyToPlay(page: Page, label: string, seed: string) {
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

	await gotoReady(page, '/learn');
	for (let i = 0; i < 4; i++) {
		await page.getByRole('button', { name: '이 한자 배우기' }).click();
		await expect(page.getByTestId('learn-done')).toBeVisible();
		if (i < 3) {
			await page.getByRole('button', { name: '다음 한자 배우기' }).click();
			await expect(page.getByRole('button', { name: '이 한자 배우기' })).toBeVisible();
		}
	}
}

for (const { path, label, tile } of [
	// 앞 두 화면은 조각 판이다 — 같은 조작, 같은 셀렉터
	{ path: '/quiz', label: '복습', tile: 'button.piece' },
	{ path: '/battle', label: '대결', tile: 'button.piece' },
	/*
	 * 공방은 서랍 방식이라 셀렉터가 다르지만, 세로로 넘칠 위험은 오히려 더 크다 —
	 * 머리글에 도움 버튼(48px)이 붙고 판 안에 실패 문구 자리가 생겼다.
	 */
	{ path: '/fusion', label: '공방', tile: 'button.part' }
]) {
	test(`${label} 화면은 스크롤 없이 모든 보기를 보여준다`, async ({ page }, testInfo) => {
		await readyToPlay(page, `os${label}`, `${testInfo.project.name}${testInfo.workerIndex}`);

		await gotoReady(page, path);
		await settleAnimations(page);

		const viewport = page.viewportSize();
		expect(viewport).not.toBeNull();
		const height = viewport!.height;

		const options = page.locator(tile);
		const count = await options.count();
		if (count === 0) {
			/*
			 * 복습 판은 만들 수 있는 조합이 없으면 비어 있다 (막 시작한 아이).
			 * 그 화면도 한 화면에 담겨야 하므로 레이아웃만 확인하고 넘어간다.
			 */
			await expectHealthyLayout(page);
			return;
		}
		await expect(options.first()).toBeVisible();
		expect(count).toBeGreaterThan(1);

		// 마지막 보기의 아래끝이 화면 안에 있어야 한다
		const box = await options.nth(count - 1).boundingBox();
		expect(box, '마지막 보기의 위치를 잴 수 없다').not.toBeNull();
		expect(
			Math.round(box!.y + box!.height),
			`${label}: 마지막 보기가 화면(${height}px) 밖에 있다 — 스크롤해야 보인다`
		).toBeLessThanOrEqual(height);
	});
}

/*
 * '다음' 버튼은 퀴즈에만 있다.
 * 대결은 부품 두 개를 놓는 순간 바로 판정하므로 누를 버튼이 없다 —
 * 아이가 한 번 더 눌러야 하는 단계를 없앤 것이 의도다.
 */
