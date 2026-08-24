import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { STROKES } from '../src/lib/game/stroke-data.ts';
import { GLYPH_EM, GLYPH_SHIFT, resample } from '../src/lib/game/stroke.ts';

/**
 * 획순 좌표를 **찍기 위한 자**. `npm run stroke:atlas [글자...]`
 *
 * 검사는 `tests/e2e/strokes.e2e.ts` 가 한다 — 이건 그 검사를 통과할 좌표를 **만드는** 도구다.
 * 인자로 글자를 주면 그 글자를 터미널에 격자로 찍어 준다: `#` 이 잉크,
 * 숫자는 통로가 잉크 위에 놓인 자리, 소문자(a=1획, b=2획…)는 **벗어난** 자리다.
 * 격자를 보고 좌표를 고친 뒤 인자 없이 돌리면 글자마다 최악 이탈 거리가 나온다.
 *
 * 캔버스 fillText 로 재면 안 된다 — 브라우저가 span 을 앉히는 자리와 다르다.
 * 그래서 진짜 DOM 을 스크린샷 찍어 그 픽셀을 읽는다. (앱 서버는 필요 없다.
 * static/ 의 폰트를 라우트 가로채기로 직접 물려 준다.)
 */
const CHARS = Object.keys(STROKES);
const EM = GLYPH_EM;
const DY = GLYPH_SHIFT;
const CELL = 400;
const ascii = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: CELL + 40 } });
await page.route('**/*', async (route) => {
	const url = new URL(route.request().url());
	if (url.pathname === '/') {
		await route.fulfill({ contentType: 'text/html', body: '<body></body>' });
		return;
	}
	try {
		const body = await readFile(path.join(process.cwd(), 'static', url.pathname));
		await route.fulfill({
			body,
			contentType: url.pathname.endsWith('.css') ? 'text/css' : 'font/woff2'
		});
	} catch {
		await route.fulfill({ status: 404, body: '' });
	}
});
await page.goto('http://localhost:9/');

const maps = {};
for (const ch of CHARS) {
	await page.evaluate(
		({ ch, em, dy, cell }) => {
			document.head.innerHTML = '<link rel="stylesheet" href="/fonts/fonts.css">';
			document.body.style.cssText = 'margin:0;background:#fff';
			document.body.innerHTML =
				`<div id="cell" style="position:relative;width:${cell}px;height:${cell}px;background:#fff">` +
				`<span style="position:absolute;inset:0;display:grid;place-items:center;line-height:1;` +
				`translate:0 ${dy}%;font-family:'Noto Sans KR';font-size:${cell * em}px;color:#000">${ch}</span></div>`;
		},
		{ ch, em: EM, dy: DY, cell: CELL }
	);
	await page.evaluate(() => document.fonts.ready);
	const shot = (await page.locator('#cell').screenshot()).toString('base64');
	maps[ch] = await page.evaluate(
		async ({ shot, cell }) => {
			const img = new Image();
			img.src = 'data:image/png;base64,' + shot;
			await img.decode();
			const c = document.createElement('canvas');
			c.width = cell;
			c.height = cell;
			const ctx = c.getContext('2d', { willReadFrequently: true });
			ctx.drawImage(img, 0, 0);
			const d = ctx.getImageData(0, 0, cell, cell).data;
			const bits = new Uint8Array(cell * cell);
			for (let i = 0; i < cell * cell; i++) bits[i] = d[i * 4] < 140 ? 1 : 0;
			return Array.from(bits);
		},
		{ shot, cell: CELL }
	);
}
await browser.close();

const ink = (m, x, y) =>
	x >= 0 && y >= 0 && x < CELL && y < CELL && m[(y | 0) * CELL + (x | 0)] === 1;

let bad = 0;
for (const ch of CHARS) {
	const m = maps[ch];
	const per = STROKES[ch].map((stroke) => {
		let worst = 0;
		let at = null;
		for (const [ux, uy] of resample(stroke, 24)) {
			const px = (ux / 100) * CELL;
			const py = (uy / 100) * CELL;
			let best = Infinity;
			for (let r = 0; r <= 48 && best === Infinity; r += 2) {
				for (let a = 0; a < 64; a++) {
					const t = (a / 64) * Math.PI * 2;
					if (ink(m, px + Math.cos(t) * r, py + Math.sin(t) * r)) {
						best = r;
						break;
					}
				}
			}
			const u = (best / CELL) * 100;
			if (u > worst) {
				worst = u;
				at = [Math.round(ux), Math.round(uy)];
			}
		}
		return { worst, at };
	});
	const worst = Math.max(...per.map((p) => p.worst));
	if (worst > 3) bad++;
	console.log(
		`${ch}  최악 ${worst.toFixed(1)}  ` +
			per
				.map((p, i) => `${i + 1}:${p.worst.toFixed(1)}${p.worst > 3 ? `@${p.at}` : ''}`)
				.join('  ') +
			(worst > 3 ? '   <<<' : '')
	);
}
console.log(`\n3단위 넘는 글자: ${bad} / ${CHARS.length}   (em=${EM}, dy=${DY}%)`);

const N = 50;
const unit = 100 / N;
for (const ch of ascii) {
	const m = maps[ch];
	const rows = [];
	const cellPx = CELL / N;
	for (let r = 0; r < N; r++) {
		let line = '';
		for (let q = 0; q < N; q++) {
			let hit = 0;
			for (let y = Math.floor(r * cellPx); y < (r + 1) * cellPx; y++)
				for (let x = Math.floor(q * cellPx); x < (q + 1) * cellPx; x++) if (ink(m, x, y)) hit++;
			line += hit > cellPx * cellPx * 0.3 ? '#' : hit > 0 ? '+' : '.';
		}
		rows.push(line.split(''));
	}
	STROKES[ch].forEach((stroke, i) => {
		for (const [ux, uy] of resample(stroke, 30)) {
			const q = Math.min(N - 1, Math.max(0, Math.round(ux / unit - 0.5)));
			const r = Math.min(N - 1, Math.max(0, Math.round(uy / unit - 0.5)));
			rows[r][q] = rows[r][q] === '.' ? String.fromCharCode(97 + i) : String(i + 1);
		}
	});
	console.log(`\n=== ${ch} (${STROKES[ch].length}획) ===`);
	rows.forEach((r, i) => console.log(String(Math.round(i * unit)).padStart(3) + ' ' + r.join('')));
}
