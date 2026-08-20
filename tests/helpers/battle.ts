import { expect, type Page } from '@playwright/test';
import { settleLevelUp } from './learn';

/**
 * 봉인을 전부 깨고 승리한다.
 *
 * **한자를 한 자도 모르는 로봇이 100% 완주할 수 있어야 한다.**
 * 그게 가능하다는 것 자체가 이 대결의 핵심 계약이다:
 * 도움 버튼을 끝까지 누르면 정답 부품이 빛나고, 그것만 누르면 반드시 깨진다.
 * 이 헬퍼가 막히면 아이도 막힌다는 뜻이다.
 */
export async function breakAllSeals(page: Page, maxSeals = 6): Promise<void> {
	const outcome = page.getByTestId('battle-outcome');

	for (let i = 0; i < maxSeals; i++) {
		if (await outcome.isVisible().catch(() => false)) return;

		const help = page.getByRole('button', { name: '도와줘' });
		if (!(await help.isVisible().catch(() => false))) return;

		// 사다리 꼭대기까지 올린다 (부품 둘 다 빛난다)
		await help.click();
		await help.click();

		const glowing = page.locator('button.part[data-glow]');
		/*
		 * 빛나는 타일이 **하나일 수도 있다.** 木+木=林 처럼 같은 부품을 두 번 쓰는 조합은
		 * 서랍에 그 타일이 하나뿐이라 하나만 빛나고, 그걸 두 번 눌러야 한다.
		 * 그래서 "빛나는 타일 수" 가 아니라 **빈 칸이 다 찰 때까지** 누른다.
		 */
		await expect(glowing, '도움을 다 써도 부품이 빛나지 않는다').not.toHaveCount(0);

		const chars = (await glowing.allTextContents()).map((raw) => raw.trim().charAt(0));
		for (let slot = 0; slot < 2; slot++) {
			const ch = chars[Math.min(slot, chars.length - 1)];
			await page.locator('button.part').filter({ hasText: ch }).first().click();
		}

		// 봉인이 깨지거나 승리 화면이 뜰 때까지 기다린다
		await expect
			.poll(
				async () => {
					if (await outcome.isVisible().catch(() => false)) return 'win';
					return await page.locator('button.part[data-glow]').count();
				},
				{ timeout: 15_000 }
			)
			.not.toBe(2);
	}

	await expect(outcome).toBeVisible({ timeout: 15_000 });

	/*
	 * 결과 화면은 서버 응답을 **기다리지 않고** 먼저 뜬다.
	 * 별이 켜지는 것이 정산이 끝났다는 유일한 증거다 — 봉인을 다 깼으면 별이 최소 하나다.
	 * 이걸 안 기다리면 그 뒤에 레벨업 연출이 떠올라 다음 클릭을 가로챈다.
	 */
	await expect(outcome.getByLabel(/별 [1-3]개/)).toBeVisible({ timeout: 15_000 });

	// 승리 보상으로 레벨이 오르면 레벨업 연출이 결과 화면 전체를 덮는다
	await settleLevelUp(page);
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
