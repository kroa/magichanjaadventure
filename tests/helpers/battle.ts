import { expect, type Page } from '@playwright/test';
import { settleLevelUp } from './learn';

/**
 * 봉인을 전부 깨고 승리한다.
 *
 * **한자를 한 자도 모르는 로봇이 100% 완주할 수 있어야 한다.**
 * 그게 가능하다는 것 자체가 이 대결의 핵심 계약이다:
 * 도움 버튼을 끝까지 누르면 정답 부품이 빛나고, 그것만 누르면 반드시 깨진다.
 * 이 헬퍼가 막히면 아이도 막힌다는 뜻이다.
 *
 * 조급하게 누르지 않는 것이 중요하다. 합체 연출이 도는 동안 타일이 잠기는데,
 * 잠긴 채로 누르면 `place()` 가 조용히 무시해서 **한참 뒤 엉뚱한 곳에서** 실패한다.
 */
export async function breakAllSeals(page: Page, maxSeals = 6): Promise<void> {
	const outcome = page.getByTestId('battle-outcome');

	for (let i = 0; i < maxSeals; i++) {
		const state = await waitForTurn(page);
		if (state === 'win') break;
		if (state === 'gone') break;

		/*
		 * 봉인을 깨면 "무슨 글자였는지" 를 보여 주는 화면이 뜬다.
		 * **합체 연출이 끝난 뒤에** 뜨므로 waitForTurn 다음에 확인해야 한다.
		 * 앞에서 보면 아직 안 떠 있어 그냥 지나치고, 그 뒤에 떠올라 칸을 가린다.
		 */
		await dismissReveal(page);

		const help = page.getByRole('button', { name: '도와줘' });
		// 사다리 꼭대기까지 올린다 (정답 부품이 빛난다)
		await help.click();
		await help.click();

		const glowing = page.locator('button.part[data-glow]');
		/*
		 * 빛나는 타일이 **하나일 수도 있다.** 木+木=林 처럼 같은 부품을 두 번 쓰는 조합은
		 * 서랍에 그 타일이 하나뿐이라 하나만 빛나고, 그걸 두 번 눌러야 한다.
		 */
		await expect(glowing, '도움을 다 써도 부품이 빛나지 않는다').not.toHaveCount(0);
		/*
		 * **글자로 찾지 않는다.** 타일에는 이제 글자가 없다 — 그림만 있다.
		 * 그게 이 게임의 요점이므로, 테스트는 data-part 속성으로 짚는다.
		 */
		const chars = (
			await glowing.evaluateAll((els) => els.map((el) => el.getAttribute('data-part') ?? ''))
		).filter(Boolean);

		for (let slot = 0; slot < 2; slot++) {
			const ch = chars[Math.min(slot, chars.length - 1)];
			const tile = page.locator(`button.part[data-part="${ch}"]`).first();
			await expect(tile).toBeEnabled({ timeout: 15_000 });
			await tile.click();
			/*
			 * 첫 클릭만 확인한다. 두 번째를 놓는 순간 판정이 돌아 칸이 곧바로 비워지므로,
			 * 거기서 "칸이 2개 찼는가" 를 세면 성공했을 때 오히려 실패한다.
			 */
			if (slot === 0) {
				await expect(page.locator('.cell.filled')).toHaveCount(1, { timeout: 10_000 });
			}
		}
	}

	await dismissReveal(page);
	await expect(outcome).toBeVisible({ timeout: 20_000 });

	/*
	 * 결과 화면은 서버 응답을 **기다리지 않고** 먼저 뜬다.
	 * 별이 켜지는 것이 정산이 끝났다는 유일한 증거다 — 봉인을 다 깼으면 별이 최소 하나다.
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
 * 다음 봉인을 두드릴 수 있을 때까지 기다린다.
 *
 * 셋 중 하나가 나온다: 이겼거나('win'), 부품을 누를 수 있거나('ready'),
 * 화면이 통째로 사라졌거나('gone' — 이 경우 호출한 쪽이 판단한다).
 */
async function waitForTurn(page: Page): Promise<'win' | 'ready' | 'gone'> {
	const outcome = page.getByTestId('battle-outcome');
	const firstTile = page.locator('button.part').first();
	const deadline = Date.now() + 20_000;

	while (Date.now() < deadline) {
		if (await outcome.isVisible().catch(() => false)) return 'win';
		if (await firstTile.isEnabled().catch(() => false)) return 'ready';
		await page.waitForTimeout(150);
	}
	return 'gone';
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
