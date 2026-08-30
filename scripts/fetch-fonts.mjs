#!/usr/bin/env node
/**
 * 폰트 self-host — Google Fonts 의 서브셋을 그대로 내려받아 static/fonts 에 넣는다.
 *
 *   node scripts/fetch-fonts.mjs
 *
 * 왜 이렇게 하나:
 *  - 한국어 폰트는 통짜로 쓰면 수 MB 다. Google 은 unicode-range 로 100개 넘게 쪼개
 *    **필요한 조각만** 받게 해 준다. 그 구조를 그대로 가져오면 서브셋 도구(fonttools 등)
 *    없이도 같은 효율을 얻는다.
 *  - 외부 도메인 의존이 사라진다: 요청이 우리 도메인으로만 가고,
 *    fonts.googleapis.com 이 느리거나 막힌 환경에서도 글자가 제때 나온다.
 *  - 개인정보: 아이 브라우저가 제3자 도메인에 요청을 보내지 않는다.
 *
 * 생성물(static/fonts/*)은 커밋한다. 빌드나 배포 때 네트워크가 필요 없어야 한다.
 */
import {
	mkdirSync,
	writeFileSync,
	readFileSync,
	rmSync,
	existsSync,
	readdirSync,
	statSync
} from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const OUT_DIR = resolve(process.cwd(), 'static', 'fonts');
const CSS_PATH = resolve(OUT_DIR, 'fonts.css');

// 실제 브라우저인 척해야 woff2 서브셋 CSS 를 준다 (아니면 옛 포맷을 준다)
const UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const FAMILIES = [
	{ query: 'Jua', name: 'Jua' },
	{ query: 'Noto+Sans+KR:wght@400..700', name: 'Noto Sans KR' },
	/*
	 * 명조는 **사전 쪽 전용**이다. 게임은 둥근 Jua 를 쓰고 사전은 명조를 쓴다 —
	 * 두 영역이 다른 독자를 만나기 때문이고, 서체가 그 경계를 가장 크게 만든다.
	 */
	{ query: 'Noto+Serif+KR:wght@400..700', name: 'Noto Serif KR' }
];

async function fetchText(url) {
	const response = await fetch(url, { headers: { 'user-agent': UA } });
	if (!response.ok) throw new Error(`${response.status} ${url}`);
	return response.text();
}

async function fetchBinary(url) {
	const response = await fetch(url, { headers: { 'user-agent': UA } });
	if (!response.ok) throw new Error(`${response.status} ${url}`);
	return Buffer.from(await response.arrayBuffer());
}

function slug(text) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/*
 * 폴더를 비우되 **라이선스 원문은 지키고 간다.**
 *
 * SIL OFL 은 폰트를 배포할 때 라이선스 사본을 함께 두라고 요구한다.
 * 그런데 여기서 폴더를 통째로 지우는 바람에 `OFL.txt` 가 조용히 사라졌고,
 * 폰트를 새로 받을 때마다 라이선스만 없는 상태로 배포될 뻔했다.
 * 지우기 전에 읽어 두었다가 다시 쓴다.
 */
const LICENSE = resolve(OUT_DIR, 'OFL.txt');
const keptLicense = existsSync(LICENSE) ? readFileSync(LICENSE) : null;

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

if (keptLicense) {
	writeFileSync(LICENSE, keptLicense);
} else {
	console.warn('[fonts] 경고: OFL.txt 가 없다. SIL OFL 은 라이선스 사본 동봉을 요구한다.');
}

const cssChunks = [
	'/*',
	' * 이 파일은 `node scripts/fetch-fonts.mjs` 가 생성한다. 직접 고치지 말 것.',
	' * 원본: Google Fonts (SIL Open Font License 1.1) — docs/06-ASSETS-LICENSE.md',
	' */',
	''
];

let fileCount = 0;
let totalBytes = 0;

for (const family of FAMILIES) {
	const url = `https://fonts.googleapis.com/css2?family=${family.query}&display=swap`;
	console.log(`[fonts] CSS 요청: ${family.name}`);
	let css = await fetchText(url);

	const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g) ?? [])];
	console.log(`[fonts]   서브셋 ${urls.length}개 내려받는 중...`);

	// 동시에 너무 많이 요청하지 않도록 묶어서 받는다
	const BATCH = 12;
	for (let i = 0; i < urls.length; i += BATCH) {
		const batch = urls.slice(i, i + BATCH);
		await Promise.all(
			batch.map(async (remote) => {
				const index = urls.indexOf(remote);
				const filename = `${slug(family.name)}-${String(index).padStart(3, '0')}.woff2`;
				const bytes = await fetchBinary(remote);
				writeFileSync(resolve(OUT_DIR, filename), bytes);
				fileCount++;
				totalBytes += bytes.length;
				css = css.split(remote).join(`/fonts/${filename}`);
			})
		);
	}

	cssChunks.push(css.trim(), '');
}

writeFileSync(CSS_PATH, cssChunks.join('\n'), 'utf8');

const mb = (totalBytes / 1024 / 1024).toFixed(2);
console.log(`[fonts] 완료 — ${fileCount}개 파일, ${mb} MB → static/fonts/`);
console.log('[fonts] app.html 이 /fonts/fonts.css 를 참조하는지 확인하세요.');

// 생성물 점검
const written = readdirSync(OUT_DIR).filter((f) => f.endsWith('.woff2'));
if (written.length !== fileCount) {
	console.error(`[fonts] 파일 수가 맞지 않습니다: 기대 ${fileCount}, 실제 ${written.length}`);
	process.exit(1);
}
const cssSize = statSync(CSS_PATH).size;
if (cssSize < 500) {
	console.error('[fonts] fonts.css 가 비정상적으로 작습니다.');
	process.exit(1);
}
