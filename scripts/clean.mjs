#!/usr/bin/env node
/**
 * 빌드 산출물 정리.
 *
 * 왜 필요한가:
 *   svelte-check 는 `--tsconfig` 를 쓸 때 tsconfig 의 exclude 와 무관하게 워크스페이스를 훑고,
 *   `--ignore` 는 `--no-tsconfig` 와만 함께 쓸 수 있다.
 *   그래서 `npm run build` 이후 `.svelte-kit/output`, `.svelte-kit/cloudflare` 의 번들 JS 까지
 *   검사 대상이 되어 `npm run check` 가 수백 개의 가짜 오류로 실패한다.
 *
 *   → 타입 검사 직전에 산출물을 지운다. `vite build` 가 언제든 다시 만든다.
 *
 * `.svelte-kit/types`, `.svelte-kit/generated` 등 SvelteKit 이 생성한 **타입**은 지우지 않는다.
 * 그것들은 검사에 반드시 필요하다.
 */
import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const TARGETS = [
	'.svelte-kit/output',
	'.svelte-kit/cloudflare',
	'.svelte-kit/cloudflare-tmp',
	'build'
];

let removed = 0;
for (const target of TARGETS) {
	const full = resolve(process.cwd(), target);
	if (!existsSync(full)) continue;
	rmSync(full, { recursive: true, force: true });
	removed++;
}

console.log(
	removed > 0 ? `[clean] 빌드 산출물 ${removed}개 경로 정리` : '[clean] 정리할 산출물 없음'
);
