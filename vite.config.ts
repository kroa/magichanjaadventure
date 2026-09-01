import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			/*
			 * `_routes.json` 의 exclude 를 **손으로 적는다.**
			 *
			 * 기본값은 정적 파일을 하나씩 나열하는데, 그 목록에 상한(100줄)이 있다.
			 * 글꼴 조각만 337개라 그것으로 이미 넘치고, 사전 1,844장은 한 줄도 못 들어간다
			 * (빌드가 "Dropping 2085 exclude rules" 라고 알려 주었다).
			 * 그러면 정적 파일인 사전이 요청마다 워커를 깨우게 된다 — 느리고, 무엇보다
			 * 무료 한도의 호출 수를 그냥 태운다.
			 *
			 * 와일드카드로 적으면 다섯 줄이면 된다. 대신 `/hanja/*` 아래 없는 주소는
			 * 우리가 만든 404 대신 Pages 의 기본 404 를 받는다 — 어차피 404 이므로 감수한다.
			 * `/robots.txt` 는 호스트마다 답이 달라야 하므로 **일부러 빼지 않는다.**
			 */
			adapter: adapter({
				routes: {
					include: ['/*'],
					exclude: ['<build>', '/fonts/*', '/hanja', '/hanja/*', '/sitemap.xml']
				}
			})
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
					include: [
						'src/**/*.{test,spec}.{js,ts}',
						'database/**/*.{test,spec}.{js,ts}',
						// 배포 스크립트에도 지켜야 할 규칙이 있다 (게임 배포본에 사전이 섞이지 않는가)
						'scripts/**/*.{test,spec}.{js,ts}',
						// E2E 는 *.e2e.ts 라서 겹치지 않는다
						'tests/**/*.{test,spec}.{js,ts}'
					],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
