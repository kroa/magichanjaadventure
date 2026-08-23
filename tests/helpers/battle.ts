import { expect, type Page } from '@playwright/test';
import { settleLevelUp } from './learn';

/**
 * 판을 비워 승리한다.
 *
 * **한자를 한 자도 모르는 로봇이 100% 완주할 수 있어야 한다.**
 * 그게 가능하다는 것 자체가 이 대결의 핵심 계약이다:
 * 도움 버튼을 누르면 붙는 짝이 빛나고, 그 둘을 차례로 누르면 반드시 붙는다.
 * 이 헬퍼가 막히면 아이도 막힌다는 뜻이다.
 *
 * 드래그가 아니라 탭 두 번(고르기 → 붙이기)을 쓴다. 끌기가 서툰 아이도 쓰는 경로이고,
 * 테스트에서 훨씬 안정적이다.
 */
export async function breakAllSeals(page: Page, maxRounds = 8): Promise<void> {
	const outcome = page.getByTestId('battle-outcome');

	for (let round = 0; round < maxRounds; round++) {
		if (await outcome.isVisible().catch(() => false)) break;
		if (!(await joinOnce(page))) break;
	}

	await expect(outcome).toBeVisible({ timeout: 20_000 });

	/*
	 * 결과 화면은 서버 응답을 **기다리지 않고** 먼저 뜬다.
	 * 별이 켜지는 것이 정산이 끝났다는 유일한 증거다 — 판을 비웠으면 별이 최소 하나다.
	 */
	await expect(outcome.getByLabel(/별 [1-3]개/)).toBeVisible({ timeout: 15_000 });

	/*
	 * 승리 연출이 끝날 때까지 기다린다.
	 *
	 * 이 줄이 없으면 스크린샷이 **중간 프레임**을 찍고, 레이아웃 검사가 아직 커져 있는
	 * 별이나 아래에서 올라오는 중인 한자를 잰다. `LevelUpOverlay` 와 같은 규약이다.
	 */
	await expect(outcome).toHaveAttribute('data-anim-state', 'done', { timeout: 15_000 });

	// 승리 보상으로 레벨이 오르면 레벨업 연출이 결과 화면 전체를 덮는다
	await settleLevelUp(page);
}

/**
 * 판에서 짝 하나를 붙인다. 붙였으면 true.
 *
 * **도움에 예산이 생겼다.** 예전에는 매 라운드 `?` 를 누르고 짝 두 개가 빛나기를
 * 하드 단언했는데, 이제 판당 두 번뿐이라 3봉인 판의 셋째 라운드에서 반드시 깨진다.
 *
 * 계약은 그대로다 — **한자를 한 자도 모르는 로봇이 100% 완주한다.**
 * 수단만 "무한 힌트" 에서 "판이 구조적으로 항상 풀린다" 로 옮긴다.
 * 아이가 예산을 다 쓰고도 끝낼 수 있어야 한다는 뜻이고, 그걸 여기서 증명한다.
 */
async function joinOnce(page: Page): Promise<boolean> {
	const pieces = page.locator('button.piece');
	const before = await pieces.count();
	if (before === 0) return false;

	const help = page.getByRole('button', { name: /도와줘/ });
	if (!(await help.isVisible().catch(() => false))) return false;
	if (await help.isDisabled().catch(() => false)) {
		await page.waitForTimeout(600);
	}

	const left = Number((await help.getAttribute('data-hint-left')) ?? '0');
	await help.click();

	// 강한 도움이 남아 있다 — 짝 두 개가 빛난다
	if (left > 0) {
		const lit = page.locator('button.piece[data-hint]');
		await expect(lit, '도움이 남았는데 붙는 짝이 빛나지 않는다').toHaveCount(2, {
			timeout: 8000
		});
		const ids = await lit.evaluateAll((els) =>
			els.map((el) => el.getAttribute('data-piece-id') ?? '')
		);
		for (const id of ids) await page.locator(`button.piece[data-piece-id="${id}"]`).click();
		await page.waitForTimeout(2400);
		return true;
	}

	/*
	 * 예산이 떨어졌다. 버튼은 **죽지 않고 약해진다** — 짝 중 한 조각만 빛난다.
	 * 그 조각을 기준으로 나머지를 차례로 대 본다. 6조각 판이라 최악 5회이고,
	 * 안 붙는 시도는 서버 왕복 없이 340ms 튕김뿐이다.
	 */
	const weak = page.locator('button.piece[data-hint-weak]');
	await expect(weak, '예산이 0인데 약한 도움도 안 나온다 — 죽은 버튼이다').toHaveCount(1, {
		timeout: 8000
	});
	const anchor = await weak.getAttribute('data-piece-id');
	const others = (
		await pieces.evaluateAll((els) => els.map((el) => el.getAttribute('data-piece-id') ?? ''))
	).filter((id) => id !== anchor);

	for (const id of others) {
		await page.locator(`button.piece[data-piece-id="${anchor}"]`).click();
		await page.locator(`button.piece[data-piece-id="${id}"]`).click();
		await page.waitForTimeout(2400);
		if ((await pieces.count()) < before) return true;
	}

	// 조용히 넘어가지 않는다. 여기서 막히면 아이도 막힌다는 뜻이다
	expect(false, '약한 도움을 끝까지 따라가도 판이 줄지 않는다').toBe(true);
	return false;
}

/**
 * 레벨업 연출이 가로채도 결국 눌러 내는 클릭.
 *
 * 보상 응답이 늦으면 연출이 **한참 뒤에** 떠올라 버튼을 덮는다.
 * 병렬로 돌 때만 재현되어서, 한 번 고쳤다고 안심하면 CI 에서만 빨간불이 뜬다.
 */
export async function clickPastOverlay(page: Page, name: string): Promise<void> {
	const button = page.getByRole('button', { name });
	for (let attempt = 0; attempt < 3; attempt++) {
		await settleLevelUp(page, 6000);
		try {
			await button.click({ timeout: 8000 });
			return;
		} catch {
			// 연출이 또 떠올랐다. 걷어내고 다시 시도한다
		}
	}
	await settleLevelUp(page, 6000);
	await button.click();
}

/**
 * 복습 판을 비운다.
 *
 * 대결과 같은 조작이므로 절차도 같다 — 도움을 눌러 짝을 빛내고, 그 둘을 누른다.
 * 다른 점은 보스가 없어 "봉인" 대신 "다 풀었어요" 로 끝난다는 것뿐이다.
 */
export async function clearQuizBoard(page: Page, maxRounds = 6): Promise<void> {
	const done = page.getByTestId('quiz-finished');

	for (let round = 0; round < maxRounds; round++) {
		const made = page.getByTestId('quiz-made');
		if (await made.isVisible().catch(() => false)) {
			await made.getByRole('button', { name: '좋아!' }).click();
			await expect(made).toBeHidden({ timeout: 10_000 });
		}
		if (await done.isVisible().catch(() => false)) break;
		if ((await page.locator('button.piece').count()) === 0) break;

		/*
		 * 대결과 **같은 3단 폴백**을 쓴다.
		 *
		 * 예전에는 짝이 두 개로 안 빛나면 조용히 `break` 했다. 그건 막힌 판을
		 * 통과시키는 구멍이었다 — 그래서 그 뒤 "한 판 더!" 를 못 찾아 실패하고,
		 * 실패 메시지는 엉뚱한 곳을 가리켰다.
		 * 이제 판은 구조적으로 항상 비워지므로(목표가 아닌 조합을 서버가 거절한다)
		 * 여기서 막히면 그것은 진짜 결함이다.
		 */
		if (!(await joinOnce(page))) break;
	}
}
