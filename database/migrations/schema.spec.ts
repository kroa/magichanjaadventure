import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

/**
 * 코드가 쓰는 표가 마이그레이션에 **전부 있는가.**
 *
 * 이 검사가 생긴 이유: 낱말 놀이를 배포했는데 `user_words` 표는 로컬 D1 에만 있었다.
 * 운영에서는 화면을 열자마자 500 이 났고, 아이에게는 "문제가 생겼어요" 한 줄만 보였다.
 * `scripts/db.mjs` 가 안전을 위해 `--remote` 를 거부해서 운영 스키마를 올릴 길이
 * 어디에도 없었고, 배포 스크립트도 그걸 안 했다.
 *
 * 배포 순서는 `scripts/deploy-pages.mjs` 가 고쳤다(코드보다 표를 먼저 올린다).
 * 여기서는 **애초에 마이그레이션에 없는 표를 코드가 쓰지 않는지**를 본다.
 */

const MIGRATIONS = readdirSync('database/migrations')
	.filter((f) => f.endsWith('.sql'))
	.map((f) => readFileSync(`database/migrations/${f}`, 'utf8'))
	.join('\n');

/** CREATE TABLE 로 만들어진 표 이름 (…_v2 같은 재생성 중간물 포함) */
const CREATED = new Set(
	[...MIGRATIONS.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][\w]*)/gi)].map(
		(m) => m[1].toLowerCase()
	)
);

/** ALTER TABLE … RENAME TO 로 최종 이름이 된 것도 존재하는 표다 */
for (const m of MIGRATIONS.matchAll(/RENAME\s+TO\s+([A-Za-z_][\w]*)/gi)) {
	CREATED.add(m[1].toLowerCase());
}

function serverSources(): string[] {
	return globSync('src/**/*.{ts,svelte}', { exclude: (p) => p.includes('.spec.') });
}

describe('스키마', () => {
	it('코드가 참조하는 표가 전부 마이그레이션에 있다', () => {
		const missing = new Map<string, string>();

		for (const file of serverSources()) {
			const src = readFileSync(file, 'utf8');
			/*
			 * SQL 문자열 안의 표 이름만 본다.
			 *
			 * 앞쪽 `\b` 가 없으면 낱말 **속**의 글자에도 걸린다 — 실제로
			 * 사전 화면의 `buildsInto as b` 에서 `Into as` 가 `INTO <표>` 로 읽혀
			 * `as` 라는 표를 쓴다고 신고했다.
			 */
			for (const m of src.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)\b/gi)) {
				const table = m[1].toLowerCase();
				// SQL 키워드와 서브쿼리는 건너뛴다
				if (['select', 'values', 'set', 'on', 'where'].includes(table)) continue;
				if (CREATED.has(table)) continue;
				if (!missing.has(table)) missing.set(table, file);
			}
		}

		expect(
			[...missing.entries()].map(([t, f]) => `${t} (${f})`),
			'마이그레이션에 없는 표를 코드가 쓴다 — 운영에서 500 이 난다'
		).toEqual([]);
	});

	it('마이그레이션 번호가 빠짐없이 이어진다', () => {
		const nums = readdirSync('database/migrations')
			.filter((f) => f.endsWith('.sql'))
			.map((f) => Number(f.slice(0, 4)))
			.sort((a, b) => a - b);

		expect(nums.length).toBeGreaterThan(0);
		nums.forEach((n, i) => {
			expect(n, `마이그레이션 번호가 건너뛰었다: ${nums.join(', ')}`).toBe(i + 1);
		});
	});
});
