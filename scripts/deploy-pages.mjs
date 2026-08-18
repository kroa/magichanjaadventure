#!/usr/bin/env node
/**
 * Cloudflare **Pages** 배포.
 *
 *   node scripts/deploy-pages.mjs [--dry]
 *
 * 왜 스크립트인가:
 *  - `CF_TARGET=pages vite build` 형태의 인라인 환경변수는 Windows 셸에서 동작하지 않는다.
 *    cross-env 같은 의존성을 더하는 대신 여기서 process.env 를 세팅해 넘긴다.
 *  - 빌드와 배포가 **같은 설정 파일**(wrangler.pages.jsonc)을 보도록 강제한다.
 *    빌드는 Workers 설정으로, 배포는 Pages 설정으로 하는 실수가 가장 흔한 사고다.
 *
 * 주의: 이 스크립트는 **운영 배포**다. 실행 전 `npm run verify` 를 통과시킬 것.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const PAGES_CONFIG = 'wrangler.pages.jsonc';
const OUTPUT_DIR = '.svelte-kit/cloudflare';
const dryRun = process.argv.includes('--dry');

const wranglerBin = resolve(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const viteBin = resolve(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');

if (!existsSync(wranglerBin) || !existsSync(viteBin)) {
	console.error('[deploy-pages] 의존성을 찾을 수 없습니다. `npm install` 을 먼저 실행하세요.');
	process.exit(1);
}

/** @param {string} bin @param {string[]} args @param {NodeJS.ProcessEnv} [env] */
function run(bin, args, env) {
	const result = spawnSync(process.execPath, [bin, ...args], {
		stdio: 'inherit',
		env: { ...process.env, ...env }
	});
	if (result.status !== 0) process.exit(result.status ?? 1);
}

// 이전 타깃(Workers)의 산출물이 섞이지 않도록 지우고 새로 빌드한다.
if (existsSync(resolve(process.cwd(), OUTPUT_DIR))) {
	rmSync(resolve(process.cwd(), OUTPUT_DIR), { recursive: true, force: true });
}

console.log('[deploy-pages] Pages 타깃으로 빌드...');
run(viteBin, ['build'], { CF_TARGET: 'pages' });

if (dryRun) {
	console.log(`[deploy-pages] --dry 이므로 배포하지 않고 종료합니다. 산출물: ${OUTPUT_DIR}`);
	process.exit(0);
}

console.log('[deploy-pages] Cloudflare Pages 로 배포...');
run(wranglerBin, ['pages', 'deploy', '--config', PAGES_CONFIG]);

console.log('[deploy-pages] 완료.');
