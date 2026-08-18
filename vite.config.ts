import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import process from 'node:process';

/*
 * 배포 타깃 전환.
 *
 * 기본은 Workers 다 — 로컬 개발과 Playwright 가 실제 workerd 런타임을 쓰기 때문이다.
 * `CF_TARGET=pages` 이면 Pages 용 설정으로 빌드한다 (npm run deploy:pages).
 *
 * 두 타깃은 출력 형태가 다르다. Workers 는 wrangler 가 배포 시점에 번들하지만,
 * Pages 는 `_worker.js` 하나가 **자체 완결**이어야 한다.
 */
const wranglerConfig = process.env.CF_TARGET === 'pages' ? 'wrangler.pages.jsonc' : undefined;

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ config: wranglerConfig })
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
