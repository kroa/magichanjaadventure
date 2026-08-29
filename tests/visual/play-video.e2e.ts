import { expect, test, type Page } from '@playwright/test';
import process from 'node:process';
import { gotoReady, waitForHydration } from '../helpers/app';
import { waitForFonts } from '../helpers/screens';
import { makeTestUser } from '../fixtures/users';

import { dismissLevelUp, settleLevelUp } from '../helpers/learn';
import { breakAllSeals } from '../helpers/battle';

/**
 * 플레이 영상을 녹화한다.
 *
 * 평소 매트릭스에서는 **건너뛴다** — 검증이 아니라 문서용이다.
 * `npm run video:play` 로 webm 을 남기고 `npm run video:gif` 로 GIF 를 만든다.
 *
 * **짧게 두 편으로 나눈다.** 한 편으로 길게 찍으면 (1) 로컬 서버가 오래 버티지 못해
 * 중간에 끊기고 (2) GIF 로 바꿀 수 없을 만큼 커진다.
 * 한 편에 하나씩만 보여 준다: 획순으로 배우기 / 조각을 붙여 봉인 깨기.
 *
 * 계정은 언제나 가짜 데이터(`test_*`)라 영상에 개인정보가 들어가지 않는다.
 */
const ON = process.env.PLAY_VIDEO === '1';

async function start(page: Page, label: string) {
	const user = makeTestUser('vid', label);
	await gotoReady(page, '/register');
	await page.getByLabel('닉네임').fill(user.nickname);
	await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
	await page.getByLabel('비밀번호 확인').fill(user.password);
	await page.getByRole('button', { name: '모험 시작하기' }).click();
	await page.waitForURL('**/character');
	await waitForHydration(page);
	await page.getByRole('button', { name: '한자 마법사 선택하기' }).click();
	await page.waitForURL((url) => url.pathname === '/');
	await waitForHydration(page);
}

/** 지금 그어야 할 획을 화면에서 읽어 그대로 따라 긋는다 */
async function traceActiveStroke(page: Page) {
	const lane = page.locator('.guide .lane').first();
	const points = await lane.getAttribute('points').catch(() => null);
	if (!points) return false;

	const box = await page.getByTestId('trace-glyph').boundingBox();
	if (!box) return false;

	// "14,50 86,50" → 상자 좌표로
	const path = points
		.trim()
		.split(/\s+/)
		.map((p) => {
			const [x, y] = p.split(',').map(Number);
			return { x: box.x + (x / 100) * box.width, y: box.y + (y / 100) * box.height };
		});

	await page.mouse.move(path[0].x, path[0].y);
	await page.mouse.down();
	// 사람 손처럼 잘게 나눠 움직여야 영상에서 획이 그어지는 게 보인다
	for (let i = 1; i < path.length; i++) {
		const from = path[i - 1];
		const to = path[i];
		for (let t = 0.12; t <= 1.0001; t += 0.12) {
			await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
			await page.waitForTimeout(14);
		}
	}
	await page.mouse.up();
	return true;
}

// `video` 는 워커를 새로 띄우므로 describe 안에 둘 수 없다 — 파일 맨 위여야 한다
test.use({
	video: { mode: 'on', size: { width: 1280, height: 800 } },
	viewport: { width: 1280, height: 800 }
});

test.describe('플레이 영상', () => {
	test.skip(!ON, 'PLAY_VIDEO=1 일 때만 녹화한다');

	test('learn — 획순으로 한 글자 배우기', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'desktop', '영상은 한 뷰포트면 된다');
		test.setTimeout(150_000);

		const t0 = Date.now();
		// 재시도 때 같은 닉네임을 다시 쓰면 "이미 있는 닉네임" 으로 가입이 막힌다
		await start(page, `learn${testInfo.retry}`);

		/*
		 * 첫 글자 一 은 획이 하나뿐이라 영상으로는 심심하다.
		 * 획이 여럿인 글자가 나올 때까지 몇 자 먼저 배워 둔다.
		 *
		 * **화면을 떠나지 않고 "다음 한자 배우기" 로 넘긴다.** 매번 /learn 을 새로 열면
		 * 한 바퀴에 수 초씩 걸려 준비만 하다 시간이 다 간다(실제로 그래서 두 번 실패했다).
		 * 이 앞부분을 잘라낼 지점은 아래 RECORD_FROM 이 찍어 준다.
		 */
		await gotoReady(page, '/learn');
		for (let i = 0; i < 4; i++) {
			const n = Number(await page.locator('[data-intro]').getAttribute('data-strokes'));
			if (n >= 4) break;
			await dismissLevelUp(page);
			await page.getByRole('button', { name: '이 한자 배우기' }).click();
			await expect(page.getByTestId('learn-done')).toBeVisible({ timeout: 20_000 });
			await settleLevelUp(page, 800);
			await page.getByRole('button', { name: '다음 한자 배우기' }).click();
			await expect(page.getByRole('button', { name: '이 한자 배우기' })).toBeVisible();
		}

		// ── 여기서부터가 영상에 쓸 부분 ────────────────────────────
		// 앞의 준비 과정을 잘라낼 지점(초). `npm run video:gif` 의 --from 에 쓴다
		console.log(`RECORD_FROM learn ${((Date.now() - t0) / 1000).toFixed(1)}`);

		/*
		 * **녹화 구간 전체를 시간으로 감싼다.**
		 *
		 * 이건 검증이 아니라 영상을 만드는 도구다 — 획순 따라쓰기가 실제로 동작하는지는
		 * `journey.e2e.ts` 의 "첫 글자는 획을 따라 그어서 배운다" 가 이미 지킨다.
		 * 그런데 여기서 어딘가 한 군데라도 늘어지면 테스트가 통째로 시간 초과로 죽고,
		 * **그때 이미 잘 찍힌 앞부분 영상까지 함께 버려진다.** 실제로 세 번 그랬다.
		 * 그래서 무엇이 느리든 정해진 시간에 손을 떼고 영상을 남긴다.
		 */
		const record = async () => {
			await waitForFonts(page);
			const stage = page.locator('[data-intro]');
			// 시범이 도는 동안 그대로 둔다 — 이게 영상의 앞부분이다
			await expect(stage).toHaveAttribute('data-intro', 'done', { timeout: 20_000 });

			// 아이가 한 획씩 따라 긋는다
			for (let i = 0; i < 24; i++) {
				if (
					await page
						.getByTestId('learn-done')
						.isVisible()
						.catch(() => false)
				)
					break;
				if (!(await traceActiveStroke(page))) break;
				await page.waitForTimeout(160);
			}
			// 다 그으면 뜻·음이 보상으로 나온다 — 그 화면도 잠깐 담는다
			await page.waitForTimeout(2600);
		};
		const stop = new Promise((r) => setTimeout(r, 70_000));
		await Promise.race([record().catch(() => undefined), stop]);
		console.log(`RECORD_TO learn ${((Date.now() - t0) / 1000).toFixed(1)}`);
	});

	test('battle — 조각을 붙여 봉인을 깬다', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'desktop', '영상은 한 뷰포트면 된다');
		test.setTimeout(240_000);

		await start(page, `battle${testInfo.retry}`);
		await gotoReady(page, '/battle');
		await waitForFonts(page);
		await expect(page.getByTestId('battle-stage')).toBeVisible();
		await expect(page.getByTestId('battle-canvas')).toHaveAttribute('data-ready', 'true', {
			timeout: 20_000
		});
		await page.waitForTimeout(1400);

		await breakAllSeals(page);
		await expect(page.getByTestId('battle-outcome')).toContainText('승리');
		await page.waitForTimeout(3000);
	});
});
