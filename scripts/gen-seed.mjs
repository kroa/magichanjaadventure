#!/usr/bin/env node
/**
 * 한자 500자 + 업적 시드를 마이그레이션 SQL 로 생성한다.
 *
 *   node scripts/gen-seed.mjs
 *
 * TS 로 데이터를 쓰고 SQL 을 생성하는 이유:
 *  - 데이터를 **단위 테스트로 검증**한 뒤에만 SQL 이 나온다
 *    (database/seed/hanja.spec.ts — 중복/개수/형식 검사)
 *  - SQL 을 손으로 관리하면 500행의 따옴표 이스케이프를 사람이 감당해야 한다
 *
 * 생성 파일은 커밋한다. 배포 환경에서 TS 를 실행할 필요가 없어야 하기 때문이다.
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

const OUTPUT = 'database/migrations/0002_seed_content.sql';

/** SQL 문자열 리터럴로 안전하게 감싼다. */
function sql(value) {
	if (value === null || value === undefined) return 'NULL';
	if (typeof value === 'number') return String(value);
	return `'${String(value).replace(/'/g, "''")}'`;
}

// vite 로 TS 모듈을 그대로 불러온다 (별도 빌드 단계 없이)
const server = await createServer({
	server: { middlewareMode: true },
	appType: 'custom',
	logLevel: 'error'
});

const { HANJA_SEED } = await server.ssrLoadModule(
	pathToFileURL(resolve('database/seed/hanja.ts')).href
);
const { ACHIEVEMENTS } = await server.ssrLoadModule(
	pathToFileURL(resolve('database/seed/achievements.ts')).href
);
await server.close();

if (HANJA_SEED.length !== 500) {
	console.error(`[gen-seed] 한자가 500자가 아닙니다: ${HANJA_SEED.length}`);
	process.exit(1);
}

const lines = [
	'-- ============================================================================',
	'-- 콘텐츠 시드 — 한자 500자 + 업적',
	'--',
	'-- ⚠️ 이 파일은 `node scripts/gen-seed.mjs` 가 생성한다. 직접 고치지 말 것.',
	'--    데이터는 database/seed/*.ts 에서 고치고 다시 생성한다.',
	'--    (그래야 database/seed/hanja.spec.ts 의 무결성 검사를 거친다)',
	'-- ============================================================================',
	'',
	'DELETE FROM hanjas;',
	''
];

for (const h of HANJA_SEED) {
	lines.push(
		'INSERT INTO hanjas (id, character, reading, meaning, difficulty, grade_label, ' +
			'level_required, area_id, category, stroke_count, example_words, description, sort_order) VALUES (' +
			[
				h.id,
				sql(h.character),
				sql(h.reading),
				sql(h.meaning),
				h.difficulty,
				sql(h.gradeLabel),
				h.levelRequired,
				h.areaId,
				sql(h.category),
				h.strokeCount,
				sql(JSON.stringify(h.exampleWords)),
				sql(h.description),
				h.sortOrder
			].join(', ') +
			');'
	);
}

lines.push('', 'DELETE FROM achievements;', '');

for (const a of ACHIEVEMENTS) {
	lines.push(
		'INSERT INTO achievements (id, title, description, icon, condition_type, ' +
			'condition_value, exp_reward, gem_reward, sort_order) VALUES (' +
			[
				sql(a.id),
				sql(a.title),
				sql(a.description),
				sql(a.icon),
				sql(a.conditionType),
				a.conditionValue,
				a.expReward,
				a.gemReward,
				a.sortOrder
			].join(', ') +
			');'
	);
}

writeFileSync(OUTPUT, lines.join('\n') + '\n', 'utf8');
console.log(
	`[gen-seed] ${OUTPUT} 생성 — 한자 ${HANJA_SEED.length}자, 업적 ${ACHIEVEMENTS.length}개`
);
