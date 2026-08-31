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
import { prepareGameCopy } from './game-build.mjs';

const OUTPUT_DIR = '.svelte-kit/cloudflare';
const PRODUCTION_BRANCH = 'main';

/*
 * **한 산출물, 두 사이트.**
 *
 * 게임과 한자사전은 같은 코드에서 나오지만 다른 독자를 만난다. 도메인을 나눈 이유는
 * `src/lib/sites.ts` 에 적었다 — 요약하면 광고 대상 판정과 AdSense 심사 때문이다.
 * 어느 경로가 어느 도메인에서 열리는지는 `hooks.server.ts` 가 호스트를 보고 가른다.
 *
 * 둘을 **같은 명령으로 함께** 올린다. 한쪽만 올리면 두 도메인의 코드가 어긋나
 * 리다이렉트가 서로를 물고 도는 상황이 생긴다.
 */
const PROJECTS = [
	{ name: 'hanjasajeon', dir: OUTPUT_DIR, keepDict: true },
	{ name: 'magichanjaadventure', dir: '.svelte-kit/cloudflare-game', keepDict: false }
];

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

/*
 * **코드보다 표를 먼저 올린다.**
 *
 * 이걸 안 해서 실제로 사고가 났다. 낱말 놀이를 배포했는데 `user_words` 표는
 * 로컬 D1 에만 있었다 — 운영에서는 화면을 열자마자 500 이 났고,
 * 아이에게는 "문제가 생겼어요" 한 줄만 보였다.
 *
 * `scripts/db.mjs` 는 안전을 위해 `--remote` 를 거부한다. 그래서 운영 스키마를
 * 올릴 길이 어디에도 없었다. 배포가 그 자리를 맡는다.
 *
 * 순서가 중요하다: **배포 전에** 적용해야 새 코드가 뜨는 순간 표가 이미 있다.
 * 반대로 하면 그 사이에 접속한 아이가 깨진 화면을 본다.
 */
console.log('[deploy-pages] 운영 D1 마이그레이션 적용...');
run(wranglerBin, ['d1', 'migrations', 'apply', 'DB', '--remote']);

for (const project of PROJECTS) {
	if (!project.keepDict) prepareGameCopy(OUTPUT_DIR, project.dir);

	console.log(`[deploy-pages] ${project.name} 배포...`);
	run(
		wranglerBin,
		['pages', 'project', 'create', project.name, '--production-branch', PRODUCTION_BRANCH],
		{ allowFailure: true } // 이미 있으면 실패한다 — 정상이다
	);
	run(wranglerBin, [
		'pages',
		'deploy',
		project.dir,
		'--project-name',
		project.name,
		'--branch',
		PRODUCTION_BRANCH,
		'--commit-dirty=true'
	]);
}

console.log('[deploy-pages] 완료.');
