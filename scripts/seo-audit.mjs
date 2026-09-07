#!/usr/bin/env node
/**
 * 구운 사전을 **전수 검사**한다.
 *
 *   npm run audit:seo          # 빌드된 산출물을 검사
 *
 * ── 왜 표본이 아니라 전수인가 ────────────────────────────────────────
 * 몇 장 열어 보고 "괜찮네" 하는 것으로는 안 잡힌다. 실제로 그렇게 놓쳤다:
 * 1,843장에는 구조화 데이터가 다 있는데 **목차 한 장만** 빠져 있었다.
 * 크롤러가 가장 먼저 닿는 문 앞이 비어 있던 것이고, 표본 검사로는 영영 안 보였다.
 *
 * 색인에서 페이지가 통째로 빠지는 사유는 대개 전수로만 드러난다 —
 * 제목이 겹치거나, 설명이 같거나, canonical 이 남을 가리키거나, 내용이 얇은 것.
 *
 * ── 무엇이 실패이고 무엇이 경고인가 ──────────────────────────────────
 * 실패는 **고칠 수 있는 사실**만 잡는다(빠짐·겹침·잘못 가리킴). 본문이 얇은 것은
 * 판단이 필요한 문제라 숫자만 알리고 막지 않는다 — 낱말 사전은 원래 짧다.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ROOT = process.argv[2] ?? '.svelte-kit/cloudflare';
const ORIGIN = 'https://hanjasajeon.pages.dev';
/** 이보다 짧으면 얇다고 본다 (본문 글자 수) */
const THIN = 300;

if (!existsSync(join(ROOT, 'hanja.html'))) {
	console.error(`[seo-audit] ${ROOT} 에 구운 사전이 없습니다. \`npm run build\` 를 먼저 하세요.`);
	process.exit(1);
}

function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (name.endsWith('.html')) out.push(p);
	}
	return out;
}

const files = walk(join(ROOT, 'hanja'));
files.push(join(ROOT, 'hanja.html'));

const pick = (html, re) => (html.match(re) || [])[1];

const rows = files.map((p) => {
	const html = readFileSync(p, 'utf8');
	// 본문만 — 태그와 스크립트를 걷어 낸 글자 수가 실제 내용의 양이다
	const body = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) || ['', ''])[1]
		.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return {
		path: p.slice(ROOT.length + 1).replace(/\\/g, '/'),
		title: pick(html, /<title>([\s\S]*?)<\/title>/),
		desc: pick(html, /<meta name="description" content="([^"]*)"/),
		canonical: pick(html, /<link rel="canonical" href="([^"]*)"/),
		noindex: /noindex/i.test(html),
		ld: (html.match(/application\/ld\+json/g) || []).length,
		lang: pick(html, /<html lang="([^"]*)"/),
		chars: body.length
	};
});

const problems = [];
const fail = (label, bad, show) => {
	if (!bad.length) {
		console.log(`  OK   ${label} (${rows.length}장)`);
		return;
	}
	problems.push(`${label}: ${bad.length}장`);
	console.log(`  실패 ${label}: ${bad.length}장`);
	for (const b of bad.slice(0, 5)) console.log(`         ${show(b)}`);
	if (bad.length > 5) console.log(`         … 외 ${bad.length - 5}장`);
};

const byPath = (r) => r.path;

console.log(`[seo-audit] ${rows.length}장 검사\n`);

fail(
	'제목 없음',
	rows.filter((r) => !r.title),
	byPath
);
fail(
	'설명 없음',
	rows.filter((r) => !r.desc),
	byPath
);
fail(
	'canonical 없음',
	rows.filter((r) => !r.canonical),
	byPath
);
fail(
	'구조화 데이터 없음',
	rows.filter((r) => r.ld === 0),
	byPath
);
fail(
	'noindex 가 섞임',
	rows.filter((r) => r.noindex),
	byPath
);
fail(
	'lang 이 ko 가 아님',
	rows.filter((r) => r.lang !== 'ko'),
	(r) => `${r.path} (${r.lang})`
);

/** 같은 값을 두 장 이상이 쓰고 있는가 — 겹치면 검색엔진이 한 장만 남기고 버린다 */
const dupes = (key) => {
	const m = new Map();
	for (const r of rows) {
		if (!r[key]) continue;
		m.set(r[key], [...(m.get(r[key]) ?? []), r.path]);
	}
	return [...m.entries()].filter(([, ps]) => ps.length > 1);
};

const showDupe = ([v, ps]) => `"${v.slice(0, 40)}" ← ${ps.slice(0, 3).join(', ')}`;
fail('제목이 겹침', dupes('title'), showDupe);
fail('설명이 겹침', dupes('desc'), showDupe);
fail('canonical 이 겹침', dupes('canonical'), showDupe);

/*
 * canonical 이 제 주소를 가리키는가.
 * 남을 가리키면 그 페이지는 **스스로 색인을 포기한다** — 가장 조용한 사고다.
 */
const wrongCanon = rows.filter((r) => {
	if (!r.canonical) return false;
	const want = `${ORIGIN}/${r.path.replace(/\.html$/, '')}`;
	return decodeURIComponent(r.canonical) !== decodeURIComponent(want);
});
fail('canonical 이 제 주소가 아님', wrongCanon, (r) => `${r.path} → ${r.canonical}`);

// ── 여기부터는 막지 않고 알리기만 한다 ────────────────────────────────
const thin = rows.filter((r) => r.chars < THIN).sort((a, b) => a.chars - b.chars);
const lens = rows.map((r) => r.chars).sort((a, b) => a - b);
const mid = (a) => a[Math.floor(a.length / 2)];

console.log('');
console.log(`  본문  최소 ${lens[0]}자 · 중앙 ${mid(lens)}자 · 최대 ${lens.at(-1)}자`);
if (thin.length) {
	console.log(
		`  알림 본문 ${THIN}자 미만: ${thin.length}장 (가장 짧은 것 ${thin[0].path} ${thin[0].chars}자)`
	);
	console.log(`         얇은 페이지가 많으면 '긁었지만 색인하지 않음' 으로 남기 쉽다.`);
}

const tLens = rows.map((r) => (r.title ?? '').length).sort((a, b) => a - b);
console.log(
	`  제목  최소 ${tLens[0]}자 · 중앙 ${mid(tLens)}자 · 최대 ${tLens.at(-1)}자 (검색결과는 30~35자에서 잘린다)`
);

console.log('');
if (problems.length) {
	console.error(`[seo-audit] FAIL — ${problems.join(' / ')}`);
	process.exit(1);
}
console.log('[seo-audit] PASS');
