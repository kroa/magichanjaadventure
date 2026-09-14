#!/usr/bin/env node
/**
 * `src/lib/game/word-list.ts` 를 시드에서 다시 만든다.
 *
 *   npm run words:gen
 *
 * ── 왜 생겼나 ────────────────────────────────────────────────────────
 * 이 목록은 **생성물인데 생성기가 없었다.** 규칙이 `words.spec.ts` 의 `derive()`
 * 안에만 있어서, 시드가 바뀌면 사람이 손으로 맞춰야 했다. 공식 배정한자를 마저
 * 담으며 글자가 28자 늘자 곧바로 어긋났고(815 ≠ 849), 검사는 "다시 생성해야 한다"
 * 고만 말할 뿐 그 방법을 아무 데도 두지 않았다. 그래서 규칙을 여기로 옮겼다.
 *
 * `words.spec.ts` 는 여전히 매번 다시 계산해 대조한다 — 생성기와 검사가 서로를 지킨다.
 *
 * ── 입력을 왜 SQL 에서 읽나 ──────────────────────────────────────────
 * 시드 `.ts` 를 정규식으로 긁는 방식은 **여러 줄로 접힌 행을 놓친다.** 실제로 그렇게
 * 두 번 틀린 자수를 냈다(1,028자를 1,014자로, 8급 50자를 45자로). 시드에서 생성된
 * `0002_seed_content.sql` 은 한 줄에 한 글자씩이라 해석의 여지가 없다.
 * 그러므로 `npm run gen:seed` 를 먼저 돌려 SQL 을 최신으로 만들어 두어야 한다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const SQL = 'database/migrations/0002_seed_content.sql';
const OUT = 'src/lib/game/word-list.ts';

/** `VALUES (...)` 한 줄에서 값을 차례대로 뽑는다. SQL 은 작은따옴표를 '' 로 이스케이프한다 */
function fields(line) {
	const out = [];
	let i = line.indexOf('VALUES (') + 'VALUES ('.length;
	while (i < line.length) {
		while (line[i] === ' ' || line[i] === ',') i++;
		if (line[i] === ')') break;
		if (line[i] === "'") {
			let s = '';
			i++;
			while (i < line.length) {
				if (line[i] === "'" && line[i + 1] === "'") {
					s += "'";
					i += 2;
				} else if (line[i] === "'") {
					i++;
					break;
				} else s += line[i++];
			}
			out.push(s);
		} else {
			let s = '';
			while (i < line.length && !',)'.includes(line[i])) s += line[i++];
			out.push(s.trim());
		}
	}
	return out;
}

// 컬럼 차례: id, character, reading, meaning, difficulty, grade_label,
//            level_required, area_id, category, stroke_count, example_words, description, sort_order
const rows = readFileSync(SQL, 'utf8')
	.split('\n')
	.filter((l) => l.startsWith('INSERT INTO hanjas'))
	.map(fields);

if (!rows.length) {
	console.error(
		`[gen-words] ${SQL} 에서 한자를 찾지 못했습니다. \`npm run gen:seed\` 를 먼저 돌리세요.`
	);
	process.exit(1);
}

const ALL = new Set(rows.map((f) => f[1]));

/** 뜻이 부품보다 얕아 배울 것이 없는 낱말 — words.spec.ts 의 SHALLOW 와 같아야 한다 */
const SHALLOW = new Set(['男子', '洞里', '文字', '土地', '女子', '男女']);

const seen = new Map();
for (const f of rows) {
	let words;
	try {
		words = JSON.parse(f[10]);
	} catch {
		continue;
	}
	for (const w of words) {
		if (!w?.word || [...w.word].length !== 2) continue;
		if (!/^[一-鿿]{2}$/.test(w.word)) continue;
		if (![...w.word].every((c) => ALL.has(c))) continue;
		if (SHALLOW.has(w.word)) continue;
		if (!seen.has(w.word)) seen.set(w.word, { reading: w.reading, meaning: w.meaning });
	}
}

// 읽는 소리 가나다 순 — 사전 쪽 검사가 이 순서를 못 박고 있다
const list = [...seen.entries()].sort((a, b) => a[1].reading.localeCompare(b[1].reading, 'ko'));

const covered = new Set();
for (const [word] of list) for (const c of word) covered.add(c);

const header = `/**
 * 두 글자 낱말 풀 — **자동 생성. 손으로 고치지 말 것.** (\`npm run words:gen\`)
 *
 * \`database/seed\` 의 예시 낱말에서 뽑았다. 두 글자가 **모두** ${ALL.size}자 안에 있는 것만 남겼고,
 * 뜻이 부품보다 얕아 배울 것이 없는 낱말(男子=사내 등)은 뺐다.
 *
 * 여기에 두는 이유: \`words.ts\` 가 씨드를 직접 import 하면 한자 ${ALL.size}자가 통째로
 * 브라우저 번들에 들어간다. 화면에 필요한 것은 이 문자열뿐이다.
 *
 * 형식: \`낱말|읽기|뜻\`
 * 씨드와 어긋나지 않는지는 \`words.spec.ts\` 가 매번 다시 계산해 확인한다.
 */
export const WORD_ROWS: readonly string[] = [
`;

writeFileSync(
	OUT,
	header + list.map(([w, v]) => `\t'${w}|${v.reading}|${v.meaning}'`).join(',\n') + '\n];\n',
	'utf8'
);

console.log(
	`[gen-words] ${OUT} 생성 — 글자 ${ALL.size}자에서 낱말 ${list.length}개 (${covered.size}자를 덮는다)`
);
