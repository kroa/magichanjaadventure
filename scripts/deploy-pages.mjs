#!/usr/bin/env node
/**
 * Cloudflare **Pages** 배포.
 *
 *   node scripts/deploy-pages.mjs [--dry]
 *
 * 왜 스크립트인가:
 *  - 빌드와 배포를 한 묶음으로 강제한다. 낡은 산출물을 올리는 사고가 가장 흔하다.
 *  - `wrangler pages deploy` 는 커스텀 설정 경로를 받지 못하므로
 *    프로젝트 이름·브랜치를 CLI 인자로 명시한다.
 *  - D1/R2 바인딩은 루트 wrangler.jsonc(pages_build_output_dir 포함)에서 함께 올라간다.
 *
 * 주의: 이 스크립트는 **운영 배포**다. 실행 전 `npm run verify` 를 통과시킬 것.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const OUTPUT_DIR = '.svelte-kit/cloudflare';
const PROJECT_NAME = 'magichanjaadventure';
const PRODUCTION_BRANCH = 'main';
const dryRun = process.argv.includes('--dry');

const wranglerBin = resolve(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const viteBin = resolve(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');

if (!existsSync(wranglerBin) || !existsSync(viteBin)) {
	console.error('[deploy-pages] 의존성을 찾을 수 없습니다. `npm install` 을 먼저 실행하세요.');
	process.exit(1);
}

/** @param {string} bin @param {string[]} args @param {{allowFailure?: boolean}} [opts] */
function run(bin, args, opts = {}) {
	const result = spawnSync(process.execPath, [bin, ...args], { stdio: 'inherit' });
	if (result.status !== 0 && !opts.allowFailure) process.exit(result.status ?? 1);
	return result.status ?? 0;
}

// 낡은 산출물이 섞이지 않도록 지우고 새로 빌드한다
const outputPath = resolve(process.cwd(), OUTPUT_DIR);
if (existsSync(outputPath)) rmSync(outputPath, { recursive: true, force: true });

console.log('[deploy-pages] 빌드...');
run(viteBin, ['build']);

if (dryRun) {
	console.log(`[deploy-pages] --dry 이므로 배포하지 않고 종료합니다. 산출물: ${OUTPUT_DIR}`);
	process.exit(0);
}

console.log('[deploy-pages] Pages 프로젝트 확인...');
run(
	wranglerBin,
	['pages', 'project', 'create', PROJECT_NAME, '--production-branch', PRODUCTION_BRANCH],
	{ allowFailure: true } // 이미 있으면 실패한다 — 정상이다
);

console.log('[deploy-pages] Cloudflare Pages 로 배포...');
run(wranglerBin, [
	'pages',
	'deploy',
	OUTPUT_DIR,
	'--project-name',
	PROJECT_NAME,
	'--branch',
	PRODUCTION_BRANCH,
	'--commit-dirty=true'
]);

console.log('[deploy-pages] 완료.');
