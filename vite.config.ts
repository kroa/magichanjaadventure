import { readdirSync } from 'node:fs';
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
					 * `static/` 루트의 파일은 **하나도 빠짐없이** 여기 들어가야 한다.
					 *
					 * 빠지면 워커를 타고, 워커는 사전 도메인의 비(非)사전 경로를 게임 도메인으로
					 * 308 넘긴다 — 파일이 있는데도 남의 도메인에서 404 가 난다.
					 * `/favicon.png` 와 `/ads.txt` 가 실제로 그렇게 새고 있었고,
					 * IndexNow 키도 하마터면 같은 이유로 통보가 통째로 무시될 뻔했다.
					 *
					 * 그때는 파일 이름을 손으로 적어 막았는데, 그 방식은 **다음 파일에서 또 터진다.**
					 * 소유확인 파일이든 ads.txt 든 새로 놓을 때마다 여기를 고쳐야 한다는 것을
					 * 아무도 기억하지 못한다. 그래서 폴더를 읽어 자동으로 채운다.
					 *
					 * 글꼴은 337개라 하나씩 적으면 100줄 상한을 넘긴다. 폴더째 와일드카드로 접는다.
					 */
					exclude: [
						'<build>',
						...readdirSync('static', { withFileTypes: true }).map((f) =>
							f.isDirectory() ? `/${f.name}/*` : `/${f.name}`
						),
						'/hanja',
						'/hanja/*',
						'/sitemap.xml'
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
