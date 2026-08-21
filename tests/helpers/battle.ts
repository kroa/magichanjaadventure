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
		// 봉인을 깨면 "무슨 글자였는지" 화면이 뜬다. 넘겨야 판이 다시 보인다
		await dismissReveal(page);
		if (await outcome.isVisible().catch(() => false)) break;

		if ((await page.locator('button.piece').count()) === 0) break;

		// 도움을 누르면 붙는 짝이 빛난다
		const help = page.getByRole('button', { name: '도와줘' });
		if (!(await help.isVisible().catch(() => false))) break;
		await help.click();

		/*
		 * 여기서 `expect(...).toHaveCount()` 로 폴링하면 계속 0 이 나온다.
		 * 판이 다시 그려지는 사이에 힌트가 잠깐 꺼졌다 켜지는데, 폴링이 그 틈만 계속 집어낸다.
		 * 아이 손 속도로 한 박자 쉬었다가 읽으면 그대로 잡힌다 — 그래서 명시적으로 기다린다.
		 */
		await page.waitForTimeout(600);
		const ids = await page
			.locator('button.piece[data-hint]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('data-piece-id') ?? ''));
		expect(ids.length, '도움을 눌러도 붙는 짝이 빛나지 않는다').toBe(2);

		for (const id of ids) {
			await page.locator(`button.piece[data-piece-id="${id}"]`).click();
		}

		// 합체 연출 + 서버 왕복이 끝날 때까지 기다린다
		await page.waitForTimeout(1600);
	}

	await dismissReveal(page);
	await expect(outcome).toBeVisible({ timeout: 20_000 });

	/*
	 * 결과 화면은 서버 응답을 **기다리지 않고** 먼저 뜬다.
	 * 별이 켜지는 것이 정산이 끝났다는 유일한 증거다 — 판을 비웠으면 별이 최소 하나다.
	 */
	await expect(outcome.getByLabel(/별 [1-3]개/)).toBeVisible({ timeout: 15_000 });

	// 승리 보상으로 레벨이 오르면 레벨업 연출이 결과 화면 전체를 덮는다
	await settleLevelUp(page);
}

/** 봉인을 깬 뒤 나오는 "이 글자였어요" 화면을 넘긴다 */
async function dismissReveal(page: Page): Promise<void> {
	const broke = page.getByTestId('seal-broke');
	if (!(await broke.isVisible().catch(() => false))) return;
	await broke.getByRole('button', { name: '좋아!' }).click();
	await expect(broke).toBeHidden({ timeout: 10_000 });
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

		const help = page.getByRole('button', { name: '도와줘' });
		if (!(await help.isVisible().catch(() => false))) break;
		await help.click();

		// 폴링이 아니라 한 박자 기다렸다 읽는다 (대결 헬퍼와 같은 이유)
		await page.waitForTimeout(600);
		const ids = await page
			.locator('button.piece[data-hint]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('data-piece-id') ?? ''));
		if (ids.length !== 2) break;

		for (const id of ids) {
			await page.locator(`button.piece[data-piece-id="${id}"]`).click();
		}
		await page.waitForTimeout(1400);
	}
}
