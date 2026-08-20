import { expect, type Page } from '@playwright/test';
import { gotoReady } from './app';

/**
 * 한자를 n자 배운다.
 *
 * **레벨업 연출을 반드시 걷어내야 한다.**
 * 10자를 넘게 배우면 레벨이 오르고, 레벨업 오버레이가 화면 전체를 덮어
 * "다음 한자 배우기" 버튼을 가린다. 그러면 클릭이 조용히 타임아웃 나는데,
 * 실패 메시지는 "버튼을 못 눌렀다" 라고만 나와서 원인을 찾기가 아주 어렵다.
 * (4자만 배우는 테스트들은 레벨이 안 올라서 이 함정을 안 밟는다.)
 */
export async function learnHanja(page: Page, count: number): Promise<void> {
	await gotoReady(page, '/learn');

	for (let i = 0; i < count; i++) {
		await dismissLevelUp(page);
		await page.getByRole('button', { name: '이 한자 배우기' }).click();
		await expect(page.getByTestId('learn-done')).toBeVisible();

		if (i < count - 1) {
			await dismissLevelUp(page);
			await page.getByRole('button', { name: '다음 한자 배우기' }).click();
			await expect(page.getByRole('button', { name: '이 한자 배우기' })).toBeVisible();
		}
	}

	await dismissLevelUp(page);
}

/**
 * 레벨업 오버레이가 **나타날 수도 있는** 상황에서 잠깐 기다렸다가 닫는다.
 *
 * 보상이 서버 응답 뒤에 도착하므로, 곧바로 확인하면 아직 안 떠 있어서 그냥 지나친다.
 * 그리고 그 직후에 떠올라 다음 클릭을 가로챈다 — 원인 불명의 타임아웃으로 보인다.
 */
export async function settleLevelUp(page: Page, wait = 4000): Promise<void> {
	const overlay = page.getByTestId('levelup-overlay');
	try {
		await overlay.waitFor({ state: 'visible', timeout: wait });
	} catch {
		return; // 레벨이 안 올랐다. 정상이다
	}
	await dismissLevelUp(page);
}

/** 레벨업 오버레이가 떠 있으면 연출이 끝나기를 기다렸다가 닫는다. */
export async function dismissLevelUp(page: Page): Promise<void> {
	const overlay = page.getByTestId('levelup-overlay');
	if (!(await overlay.isVisible().catch(() => false))) return;

	// 연출 중에는 닫기 버튼이 아직 안 보인다
	await expect(overlay).toHaveAttribute('data-anim-state', 'done', { timeout: 15_000 });
	await page.getByRole('button', { name: '계속 모험하기' }).click();
	await expect(overlay).toBeHidden();
}
