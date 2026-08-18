import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';

const PORT = 4173;
const CI = !!process.env.CI;

/**
 * 마법한자탐험대 E2E 설정.
 *
 * webServer 로 `npm run build && npm run preview`(= wrangler dev)를 쓴다.
 * vite dev 보다 느리지만 **실제 workerd 런타임 + 로컬 D1**에서 검증하므로
 * "로컬에선 되는데 배포하면 안 되는" 문제를 배포 전에 잡는다.
 */
export default defineConfig({
	testDir: 'tests',
	testMatch: '**/*.e2e.ts',

	fullyParallel: true,
	forbidOnly: CI,
	retries: CI ? 2 : 0,
	workers: CI ? 2 : undefined,

	timeout: 45_000,
	expect: { timeout: 10_000 },

	globalSetup: './tests/global-setup.ts',

	reporter: CI
		? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
		: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'off',
		locale: 'ko-KR',
		timezoneId: 'Asia/Seoul'
	},

	// 사양서 33번 항목의 3개 viewport.
	// 셋 다 chromium 을 쓴다 — 브라우저 엔진 차이가 아니라 **레이아웃**을 검증하는 것이 목적이고,
	// 브라우저를 하나만 설치하면 CI 가 훨씬 빨라진다.
	projects: [
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }
		},
		{
			name: 'tablet',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1024, height: 768 },
				hasTouch: true
			}
		},
		{
			name: 'mobile',
			use: { ...devices['iPhone 13'], browserName: 'chromium' } // 390 x 844
		}
	],

	webServer: {
		command: 'npm run build && npm run preview',
		port: PORT,
		reuseExistingServer: !CI,
		timeout: 180_000,
		stdout: 'pipe',
		stderr: 'pipe'
	}
});
