#!/usr/bin/env node
/**
 * 로컬 D1 관리 스크립트.
 *
 * 안전 규칙:
 *  - 이 스크립트는 **로컬 D1만** 다룬다. `--remote` 는 명시적으로 거부한다.
 *  - 운영 DB에 대한 파괴적 작업은 여기서 절대 수행하지 않는다(PHASE 20에서 수동 절차).
 *
 * 사용법:
 *   node scripts/db.mjs migrate            로컬 D1에 마이그레이션 적용
 *   node scripts/db.mjs status             적용 대기중인 마이그레이션 확인
 *   node scripts/db.mjs reset              로컬 D1 상태 삭제 후 재적용
 *   node scripts/db.mjs query "SELECT 1"   로컬 D1에 SQL 실행
 */
import { spawnSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BINDING = 'DB';
const LOCAL_STATE_DIR = resolve(process.cwd(), '.wrangler', 'state', 'v3', 'd1');

const [, , rawCommand, ...rest] = process.argv;
const command = rawCommand ?? 'help';

// --- 안전 가드: 원격 조작 시도를 전면 차단한다 ---------------------------------
const forbidden = [...rest, command].find((arg) =>
	/--remote|--env[= ]?production|production/i.test(String(arg))
);
if (forbidden) {
	console.error(
		`\n[db.mjs] 거부됨: 이 스크립트는 로컬 D1 전용입니다. (발견된 인자: "${forbidden}")\n` +
			`운영 DB 작업은 wrangler CLI로 직접, 의도를 확인한 뒤 수행하세요.\n`
	);
	process.exit(1);
}

/**
 * wrangler 를 로컬 모드로 실행한다.
 *
 * `npx wrangler` 대신 wrangler 의 JS 엔트리를 node 로 직접 실행한다.
 * Windows 에서 `.cmd` 를 shell 없이 spawn 하면 EINVAL 이 나고(Node 의 보안 변경),
 * `shell: true` 로 우회하면 인자가 셸 해석을 거쳐 SQL 문자열이 깨질 수 있기 때문이다.
 */
function wrangler(args, { allowFailure = false } = {}) {
	const bin = resolve(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js');
	if (!existsSync(bin)) {
		console.error('[db.mjs] wrangler 를 찾을 수 없습니다. `npm install` 을 먼저 실행하세요.');
		process.exit(1);
	}
	const result = spawnSync(process.execPath, [bin, ...args], { stdio: 'inherit', shell: false });
	if (result.error) {
		console.error(`[db.mjs] wrangler 실행 실패: ${result.error.message}`);
		process.exit(1);
	}
	if (result.status !== 0 && !allowFailure) process.exit(result.status ?? 1);
	return result.status ?? 0;
}

function migrate() {
	console.log('[db.mjs] 로컬 D1 마이그레이션 적용...');
	wrangler(['d1', 'migrations', 'apply', BINDING, '--local']);
}

function status() {
	wrangler(['d1', 'migrations', 'list', BINDING, '--local'], { allowFailure: true });
}

function reset() {
	if (existsSync(LOCAL_STATE_DIR)) {
		console.log(`[db.mjs] 로컬 D1 상태 삭제: ${LOCAL_STATE_DIR}`);
		rmSync(LOCAL_STATE_DIR, { recursive: true, force: true });
	} else {
		console.log('[db.mjs] 삭제할 로컬 D1 상태가 없습니다.');
	}
	migrate();
	console.log('[db.mjs] 로컬 D1 초기화 완료.');
}

/**
 * 테스트 계정을 지운다 (로컬 전용).
 *
 * E2E 는 매 실행마다 계정을 새로 만든다. 정리하지 않으면 다음 실행에서
 * 같은 닉네임이 중복되어 가입이 실패하고, 원인이 "닉네임 중복"이 아니라
 * "화면이 안 뜬다"로 보여서 진단이 어려워진다. 실제로 그 함정에 빠졌다.
 *
 * 테스트 닉네임은 전부 `t_` 로 시작한다 (tests/fixtures/users.ts).
 * GLOB 에서 `_` 는 리터럴이라 LIKE 의 와일드카드 문제를 피할 수 있다.
 */
function cleanTest() {
	console.log('[db.mjs] 테스트 계정 정리...');
	const sql = [
		"DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE nickname_key GLOB 't_*')",
		"DELETE FROM user_hanja_progress WHERE user_id IN (SELECT id FROM users WHERE nickname_key GLOB 't_*')",
		"DELETE FROM user_achievements WHERE user_id IN (SELECT id FROM users WHERE nickname_key GLOB 't_*')",
		"DELETE FROM quiz_results WHERE user_id IN (SELECT id FROM users WHERE nickname_key GLOB 't_*')",
		"DELETE FROM battle_records WHERE user_id IN (SELECT id FROM users WHERE nickname_key GLOB 't_*')",
		"DELETE FROM characters WHERE user_id IN (SELECT id FROM users WHERE nickname_key GLOB 't_*')",
		"DELETE FROM users WHERE nickname_key GLOB 't_*'"
	].join('; ');
	wrangler(['d1', 'execute', BINDING, '--local', '--command', sql]);
}

function query() {
	const sql = rest.join(' ').trim();
	if (!sql) {
		console.error('[db.mjs] SQL 을 지정하세요. 예: node scripts/db.mjs query "SELECT 1"');
		process.exit(1);
	}
	wrangler(['d1', 'execute', BINDING, '--local', '--command', sql]);
}

switch (command) {
	case 'migrate':
		migrate();
		break;
	case 'status':
		status();
		break;
	case 'reset':
		reset();
		break;
	case 'query':
		query();
		break;
	case 'clean-test':
		cleanTest();
		break;
	default:
		console.log(
			[
				'사용법:',
				'  node scripts/db.mjs migrate            로컬 D1 마이그레이션 적용',
				'  node scripts/db.mjs status             마이그레이션 상태 확인',
				'  node scripts/db.mjs reset              로컬 D1 초기화 후 재적용',
				'  node scripts/db.mjs query "SELECT 1"   로컬 D1 SQL 실행',
				'  node scripts/db.mjs clean-test        테스트 계정(t_*) 정리'
			].join('\n')
		);
		process.exit(command === 'help' ? 0 : 1);
}
