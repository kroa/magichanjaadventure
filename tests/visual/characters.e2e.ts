import { test } from '@playwright/test';
import { waitForFonts } from '../helpers/screens';
import { gotoReady } from '../helpers/app';

/**
 * 캐릭터 확대 검수.
 *
 * "캐릭터가 귀여운가"는 이 프로젝트의 최우선 요구사항인데,
 * 스타일가이드 전체 스크린샷에서는 캐릭터가 너무 작아 판단할 수 없다.
 * 그래서 캐릭터만 크게 렌더해 따로 남긴다. (실패시키지 않고 수집만 한다)
 */
test.describe('캐릭터 시트', () => {
	test('표정별 캐릭터를 크게 남긴다', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'desktop', 'desktop 에서만 수집한다');

		await gotoReady(page, '/styleguide');
		await waitForFonts(page);

		const moods = ['기본', '신남', '놀람', '시무룩'];

		for (const mood of moods) {
			await page.getByRole('button', { name: mood, exact: true }).click();

			const panel = page.locator('section', { has: page.getByRole('img', { name: '한자 기사' }) });
			await panel.screenshot({
				path: `screenshots/${testInfo.project.name}/character-${mood}.png`,
				scale: 'css',
				animations: 'disabled'
			});
		}
	});
});
