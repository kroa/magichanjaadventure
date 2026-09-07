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
					/*
					 * IndexNow 키 파일은 **반드시 여기 있어야 한다.**
					 *
					 * 없으면 워커를 타고, 워커는 사전 도메인의 비(非)사전 경로를 게임 도메인으로
					 * 308 넘긴다 — 검색엔진은 키를 못 읽고 403(키 무효)을 돌려주므로 통보가
					 * 통째로 무시된다. 실제로 `/favicon.png` 가 308 로 나가는 것을 보고 알았다.
					 * hooks 쪽에도 예외를 두었지만 그건 안전망이고, 정답은 워커를 아예 안 타는 것이다.
					 */
					exclude: [
						'<build>',
						'/fonts/*',
						'/hanja',
						'/hanja/*',
						'/sitemap.xml',
						'/9dda83b0a5957e29009a4ea9ebd272b0.txt'
					]
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
