import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

/**
 * E2E 실행 전 로컬 D1 을 알려진 상태로 만든다.
 *
 * 안전: **로컬 전용**이다. 원격 D1 을 건드리는 경로가 존재하지 않는다.
 * (scripts/db.mjs 자체가 --remote 를 거부한다)
 */
export default async function globalSetup(): Promise<void> {
	if (!existsSync('database/migrations')) {
		console.log('[e2e] database/migrations 없음 — DB 준비 건너뜀');
		return;
	}

	const hasMigrations = spawnSync(
		process.platform === 'win32' ? 'cmd.exe' : 'sh',
		process.platform === 'win32'
			? ['/c', 'dir /b database\\migrations\\*.sql']
			: ['-c', 'ls database/migrations/*.sql'],
		{ encoding: 'utf8' }
	);

	if (hasMigrations.status !== 0 || !hasMigrations.stdout.trim()) {
		console.log('[e2e] 적용할 마이그레이션 없음 — DB 준비 건너뜀');
		return;
	}

	console.log('[e2e] 로컬 D1 마이그레이션 적용...');
	const result = spawnSync(process.execPath, ['scripts/db.mjs', 'migrate'], { stdio: 'inherit' });

	if (result.status !== 0) {
		throw new Error('[e2e] 로컬 D1 마이그레이션 실패 — E2E 를 시작할 수 없습니다.');
	}
}
