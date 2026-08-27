import { expect, test } from '@playwright/test';
import process from 'node:process';
import { gotoReady, waitForHydration } from '../helpers/app';
import { waitForFonts } from '../helpers/screens';
import { makeTestUser } from '../fixtures/users';
import { dismissLevelUp, settleLevelUp } from '../helpers/learn';

/**
 * README 에 넣을 화면을 찍는다.
 *
 * 평소 매트릭스에서는 **건너뛴다** — 이건 검증이 아니라 문서용 그림이고,
 * 세 뷰포트마다 돌 이유가 없다. 필요할 때만 `npm run shots:readme` 로 돌린다.
 *
 * 결과는 `docs/screens/` 에 커밋된다(테스트 산출물인 `screenshots/` 와 달리).
 * 계정은 언제나 가짜 데이터(`test_*`)를 쓰므로 그림에 개인정보가 들어가지 않는다.
 */
const ON = process.env.README_SHOTS === '1';

test.describe('README 화면', () => {
	test.skip(!ON, 'README_SHOTS=1 일 때만 찍는다');
	test.slow();

	test('주요 화면을 모은다', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'desktop', '문서용 그림은 한 뷰포트면 된다');
		test.setTimeout(300_000);

		const shot = async (name: string) => {
			await waitForFonts(page);
			await page.screenshot({ path: `docs/screens/${name}.png`, animations: 'disabled' });
		};

		// ── 로그인 ────────────────────────────────────────────────
		await gotoReady(page, '/login');
		await shot('login');

		// ── 캐릭터 선택 ───────────────────────────────────────────
		const user = makeTestUser('readme', 'shots');
		await gotoReady(page, '/register');
		await page.getByLabel('닉네임').fill(user.nickname);
		await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
		await page.getByLabel('비밀번호 확인').fill(user.password);
		await page.getByRole('button', { name: '모험 시작하기' }).click();
		await page.waitForURL('**/character');
		await waitForHydration(page);
		await shot('character');

		await page.getByRole('button', { name: '한자 마법사 선택하기' }).click();
		await page.waitForURL((url) => url.pathname === '/');
		await waitForHydration(page);

		// ── 배우기: 획순 시범 ─────────────────────────────────────
		/*
		 * `animations: 'disabled'` 는 애니메이션을 **끝 프레임에 앉힌다.**
		 * 그래서 시범 중에 찍으면 획이 순서대로 다 그어진 글자가 남는다 —
		 * 번호까지 함께 보이므로 문서용으로는 이 편이 낫다.
		 */
		await gotoReady(page, '/learn');
		const stage = page.locator('[data-intro]');
		if ((await stage.getAttribute('data-intro')) !== 'none') {
			await shot('learn-strokes');
			await expect(stage).toHaveAttribute('data-intro', 'done', { timeout: 15_000 });
			await shot('learn-trace');
		}

		// ── 배우고 나면 뜻·음이 보상으로 나온다 ────────────────────
		await page.getByRole('button', { name: '이 한자 배우기' }).click();
		await expect(page.getByTestId('learn-done')).toBeVisible();
		await shot('learn-done');

		/*
		 * 도감이 비어 보이지 않도록 몇 자 더 배운다.
		 * 도중에 레벨이 오르면 오버레이가 화면을 덮어 버튼을 가린다 — 걷어내야 한다.
		 * 그 오버레이 자체가 좋은 그림이라 걷어내기 전에 한 장 찍는다.
		 */
		let levelShot = false;
		for (let i = 0; i < 11; i++) {
			const overlay = page.getByTestId('levelup-overlay');
			if (!levelShot && (await overlay.isVisible().catch(() => false))) {
				await expect(overlay).toHaveAttribute('data-anim-state', 'done', { timeout: 15_000 });
				await shot('levelup');
				levelShot = true;
			}
			await dismissLevelUp(page);
			await page.getByRole('button', { name: '다음 한자 배우기' }).click();
			await expect(page.getByRole('button', { name: '이 한자 배우기' })).toBeVisible();
			await page.getByRole('button', { name: '이 한자 배우기' }).click();
			await expect(page.getByTestId('learn-done')).toBeVisible();
			await settleLevelUp(page, 1200);
		}

		/*
		 * 획순 시범은 **획이 여럿인 글자**로 다시 찍는다.
		 * 새 계정의 첫 글자는 一 이라 획이 하나뿐이고, 그림으로는 아무것도 안 보인다.
		 */
		await gotoReady(page, '/learn');
		const later = page.locator('[data-intro]');
		if (Number(await later.getAttribute('data-strokes')) >= 3) {
			await shot('learn-strokes');
			await expect(later).toHaveAttribute('data-intro', 'done', { timeout: 15_000 });
			await shot('learn-trace');
		}

		// ── 모험 지도 ─────────────────────────────────────────────
		await gotoReady(page, '/');
		await expect(page.getByTestId('adventure-map')).toBeVisible();
		await shot('map');

		// ── 도감 ──────────────────────────────────────────────────
		await gotoReady(page, '/collection');
		await expect(page.getByTestId('collection-grid')).toBeVisible();
		await shot('collection');

		// ── 합체 대결 ─────────────────────────────────────────────
		await gotoReady(page, '/battle');
		await expect(page.getByTestId('battle-stage')).toBeVisible();
		await expect(page.getByTestId('battle-canvas')).toHaveAttribute('data-ready', 'true', {
			timeout: 15_000
		});
		// 조각이 깔리기 전에 찍으면 판이 텅 비어 보인다
		await expect(page.locator('button.piece').first()).toBeVisible({ timeout: 15_000 });
		await shot('battle');

		// ── 획순 확인용 스타일가이드 ──────────────────────────────
		await gotoReady(page, '/styleguide/strokes');
		await shot('strokes-atlas');

		// ── 모바일 한 장 ──────────────────────────────────────────
		await page.setViewportSize({ width: 390, height: 844 });
		await gotoReady(page, '/');
		await expect(page.getByTestId('adventure-map')).toBeVisible();
		await shot('map-mobile');
	});
});
