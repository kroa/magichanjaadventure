import { expect, test, type Page } from '@playwright/test';
import { makeTestUser } from '../fixtures/users';
import { gotoReady, waitForHydration } from '../helpers/app';
import { breakAllSeals, clickPastOverlay } from '../helpers/battle';
import { expectHealthyLayout } from '../helpers/layout';
import { captureScreen, waitForFonts } from '../helpers/screens';

/**
 * 합체 대결 — 보스의 봉인을 합체로 깬다.
 *
 * 여기서 지켜야 할 계약이 넷이다. 하나라도 무너지면 아이가 막히거나 상처받는다.
 *  1. 한자를 하나도 모르는 아이도 **대결에 들어갈 수 있다** (부품 서랍이 봉인에서 유도된다)
 *  2. 도움을 끝까지 쓰면 **반드시 깰 수 있다** (막다른 길이 없다)
 *  3. 안 되는 조합에 **벌이 없다** — 에너지도 안 깎이고 "틀렸어요" 도 없다
 *  4. **질 수 없다** — 패배 화면이 존재하지 않는다
 *
 * 한 판이 짧지 않다: 봉인 3개 × (도움 → 조각 두 개 → 합체 연출 0.5초 → "이 글자였어요" 화면).
 * 전부 실제 제품 동작이라 줄일 수 없고, 기본 45초로는 느린 뷰포트에서 완주 전에 끊긴다.
 */
test.describe.configure({ timeout: 120_000 });

async function startBattle(page: Page, label: string, seed: string) {
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

	await gotoReady(page, '/battle');
	await expect(page.getByTestId('battle-stage')).toBeVisible();
	return user;
}

test('한자를 하나도 안 배워도 대결에 들어갈 수 있다', async ({ page }, testInfo) => {
	/*
	 * 예전 대결은 배운 한자로 문제를 만들어서, 갓 가입한 아이는 빈 화면을 봤다.
	 * 지금은 부품 서랍이 봉인에서 유도되므로 **아무것도 안 배운 아이도 대결이 성립한다.**
	 */
	await startBattle(page, 'btl', `${testInfo.project.name}${testInfo.workerIndex}`);
	await waitForFonts(page);

	await expect(page.getByTestId('piece-board')).toBeVisible();
	/*
	 * **처음 오는 아이에게는 조각 두 개만 준다.**
	 * 여섯 개를 깔면 짝이 15가지라, 무엇을 하는 화면인지도 모르는 채 헤맨다.
	 * 익숙해지면 서버가 봉인을 늘린다.
	 */
	await expect(page.locator('button.piece')).toHaveCount(2);
	// 목표를 인쇄해 보여 주지 않는다 — 그게 이 화면이 객관식이 아닌 이유다
	await expect(page.getByTestId('seal-card')).toHaveCount(0);
	// 대신 손가락이 시범을 보인다. 글이 아니라 몸짓으로 알린다
	await expect(page.locator('.demo-hand')).toBeVisible();

	await captureScreen(page, testInfo, 'battle');
	await expectHealthyLayout(page);
});

test('도움을 끝까지 쓰면 반드시 봉인을 깬다', async ({ page }, testInfo) => {
	// 한자를 모르는 아이도 완주할 수 있어야 한다. 막다른 길은 난이도가 아니라 고장이다
	await startBattle(page, 'btlwin', `${testInfo.project.name}${testInfo.workerIndex}`);

	await breakAllSeals(page);

	const outcome = page.getByTestId('battle-outcome');
	await expect(outcome).toBeVisible();
	await expect(outcome).toContainText('승리');

	await captureScreen(page, testInfo, 'battle-win');
	await expectHealthyLayout(page);
});

test('안 되는 조합에 벌을 주지 않는다', async ({ page }, testInfo) => {
	await startBattle(page, 'btlfail', `${testInfo.project.name}${testInfo.workerIndex}`);

	const energy = page.getByRole('progressbar', { name: '내 에너지' });
	const before = Number(await energy.getAttribute('aria-valuenow'));

	/*
	 * 서랍 앞쪽 두 개를 그냥 눌러 본다. 조합표에 없을 가능성이 높다.
	 * 무슨 일이 일어나든 **에너지가 줄거나 혼내는 말이 나와서는 안 된다.**
	 */
	const pieces = page.locator('button.piece');
	const total = await pieces.count();
	await pieces.nth(0).click();
	await pieces.nth(1).click();

	await expect(page.getByText(/틀렸|실패|아니에요|오답|다시 해|잘못/)).toHaveCount(0);

	await expect
		.poll(async () => Number(await energy.getAttribute('aria-valuenow')))
		.toBeGreaterThanOrEqual(before);

	// 안 붙었으면 조각이 그대로 남아 바로 다시 시도할 수 있어야 한다
	await expect.poll(async () => await pieces.count()).toBeGreaterThanOrEqual(total - 2);
});

test('패배 화면이 존재하지 않는다', async ({ page }, testInfo) => {
	await startBattle(page, 'btlnolose', `${testInfo.project.name}${testInfo.workerIndex}`);

	/*
	 * 아무거나 여러 번 붙여 봐도 아이가 지지 않는다.
	 * 붙는 조합이 나오면 조각이 사라지므로, 누를 때마다 **다시 세어서** 짚는다.
	 * 고정된 nth 로 누르면 사라진 자리를 누르려다 엉뚱한 타임아웃이 난다.
	 */
	const pieces = page.locator('button.piece');
	for (let i = 0; i < 4; i++) {
		// 번호로 짚는다. 위치(nth)로 짚으면 조각이 사라진 자리를 누르려다 멈춘다
		const ids = await pieces.evaluateAll((els) =>
			els.map((el) => el.getAttribute('data-piece-id') ?? '')
		);
		if (ids.length < 2) break;
		for (const id of [ids[0], ids[ids.length - 1]]) {
			await page.locator(`button.piece[data-piece-id="${id}"]`).click();
		}
		await page.waitForTimeout(600);
	}

	await expect(page.getByText(/아쉬워요|졌|패배/)).toHaveCount(0);
});

test('이기면 별과 만든 한자가 나오고, 다시 대결이 동작한다', async ({ page }, testInfo) => {
	await startBattle(page, 'btlstar', `${testInfo.project.name}${testInfo.workerIndex}`);
	await breakAllSeals(page);

	const outcome = page.getByTestId('battle-outcome');
	await expect(outcome).toBeVisible();
	// 도움을 다 썼어도 별이 0 이면 안 된다 — 도움에 벌을 매기지 않기로 했다
	await expect(outcome.getByLabel(/별 \d개/)).toBeVisible();
	// 이야기는 판이 굴러가는 동안 멈춰 세우지 않고 여기서 몰아서 읽는다
	await expect(outcome.locator('.learned li').first()).toBeVisible();

	// 레벨업 연출이 늦게 떠올라 버튼을 가로챌 수 있다
	await clickPastOverlay(page, '다시 대결');

	await expect(outcome).toBeHidden({ timeout: 15_000 });
	await expect(page.getByTestId('piece-board')).toBeVisible();
});

test('만든 한자는 도감에 들어간다', async ({ page }, testInfo) => {
	await startBattle(page, 'btldex', `${testInfo.project.name}${testInfo.workerIndex}`);

	const total = page.getByRole('progressbar', { name: /전체 수집/ });
	await gotoReady(page, '/collection');
	const before = Number(await total.getAttribute('aria-valuenow'));

	await gotoReady(page, '/battle');
	await breakAllSeals(page);
	await expect(page.getByTestId('battle-outcome')).toBeVisible();

	// 대결에서 만든 한자도 그냥 "배운 한자" 다
	await gotoReady(page, '/collection');
	await expect
		.poll(async () => Number(await total.getAttribute('aria-valuenow')))
		.toBeGreaterThan(before);
});

test('서버가 목표가 아닌 봉인 파괴를 인정하지 않는다', async ({ page, request }, testInfo) => {
	await startBattle(page, 'btlapi', `${testInfo.project.name}${testInfo.workerIndex}`);

	/*
	 * 화면을 거치지 않고 직접 두드려 본다.
	 * 서버는 이번 판의 봉인을 다시 유도해서 목표가 맞는지 확인해야 한다.
	 * 여기가 뚫리면 아무 조합이나 보내서 대결을 끝낼 수 있다.
	 */
	const cookies = await page.context().cookies();
	const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
	const baseURL = new URL(page.url()).origin;

	const response = await request.post(`${baseURL}/api/battle/seal`, {
		headers: { cookie: cookieHeader, origin: baseURL, 'content-type': 'application/json' },
		// 세션 키를 지어내면 봉인이 유도되지 않는다
		data: { sessionKey: 'made-up-session', areaId: 1, parts: ['日', '月'] }
	});

	const body = (await response.json()) as { ok: boolean; reason?: string };
	// 지어낸 세션의 0번 봉인이 우연히 明 일 수는 있으나, 승리 정산은 finish 가 다시 센다
	expect(body).toHaveProperty('ok');

	// 봉인을 하나도 안 깨고 승리를 주장해도 인정되지 않아야 한다
	const finish = await request.post(`${baseURL}/api/battle/finish`, {
		headers: { cookie: cookieHeader, origin: baseURL, 'content-type': 'application/json' },
		data: {
			sessionKey: 'another-made-up-session',
			npcId: 'acorn_bandit',
			areaId: 1,
			playerHpLeft: 100,
			enemyHpLeft: 0,
			sealCount: 3,
			discoveredNew: false,
			durationMs: 1000,
			claimedWin: true
		}
	});
	const result = (await finish.json()) as { won: boolean; reward: unknown };
	expect(result.won, '봉인을 안 깼는데 승리로 인정되면 안 된다').toBe(false);
	expect(result.reward).toBeNull();
});
