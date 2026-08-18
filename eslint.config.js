import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			/*
			 * svelte/no-navigation-without-resolve 를 끈다.
			 *
			 * 이유 2가지:
			 *  1) resolve() 는 **이미 존재하는 라우트**만 받는다. 이 프로젝트는 PHASE 단위로
			 *     화면을 늘려가므로, 하단 네비게이션이 아직 만들어지지 않은 /learn · /quiz ·
			 *     /collection 을 먼저 가리킨다. resolve() 를 쓰면 타입 생성이 깨진다.
			 *  2) Button / IconButton 은 호출자가 넘긴 임의의 href(외부 URL 포함)를 받는
			 *     범용 컴포넌트다. 여기에 resolve() 를 적용하는 것은 의미상 틀렸다.
			 *
			 * 이 앱은 base path 없이 도메인 루트에 배포하므로 실질적 위험이 없다.
			 * PHASE 16(전체 통합)에서 모든 라우트가 생기면 다시 켜는 것을 검토한다.
			 */
			'svelte/no-navigation-without-resolve': 'off'
		}
	}
);
