import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { STROKES } from '../src/lib/game/stroke-data.ts';
import { GLYPH_EM, GLYPH_SHIFT, resample, strokeLength } from '../src/lib/game/stroke.ts';

/**
 * 획순 좌표를 **만들고 재는 자**.
 *
 *   npm run stroke:atlas                       커밋된 데이터를 잰다
 *   npm run stroke:atlas -- --grid 學 校        글자를 격자로 찍는다 (데이터 없어도 됨)
 *   npm run stroke:atlas -- --in a.json --fit b.json --sheet b.png
 *
 * 검사는 `tests/e2e/strokes.e2e.ts` 가 한다 — 이건 그 검사를 통과할 좌표를 **만드는** 도구다.
 *
 * ── 왜 자동으로 붙이는가 ──────────────────────────────────────────────
 * 손으로 찍으면 획의 **위치**가 늘 몇 단위씩 어긋난다. 처음 16자를 찍었을 때
 * 절반이 글자를 벗어나 있었고, 그걸 눈으로 하나씩 맞추느라 15자에서 멈췄다.
 *
 * 그런데 어긋나는 건 위치뿐이다. **어떤 획이 몇 번째인가는 사람이 알고,
 * 그 획이 정확히 어디 있는가는 글꼴이 안다.** 그래서 대충 그린 선을 받아
 * 잉크 능선으로 끌어다 붙인다(`--fit`). 사람은 순서만 맞추면 된다.
 *
 * 붙일 수 없는 획은 조용히 넘기지 않고 신고한다 — 획 하나가 글자에 없다는 뜻이고,
 * 그건 분해가 틀렸다는 신호다.
 *
 * 캔버스 fillText 로 재면 안 된다 — 브라우저가 span 을 앉히는 자리와 다르다.
 * 그래서 진짜 DOM 을 스크린샷 찍어 그 픽셀을 읽는다. (앱 서버는 필요 없다.
 * static/ 의 폰트를 라우트 가로채기로 직접 물려 준다.)
 */

const argv = process.argv.slice(2);
function flag(name) {
	const i = argv.indexOf(name);
	return i < 0 ? null : (argv[i + 1] ?? '');
}
const inFile = flag('--in');
const fitOut = flag('--fit');
const sheetOut = flag('--sheet');
const gridArg = argv.indexOf('--grid');
const gridChars =
	gridArg < 0
		? []
		: argv
				.slice(gridArg + 1)
				.filter((a) => !a.startsWith('--'))
				.flatMap((a) => [...a]);

// `--grid` 만 주면 격자만 보고 싶다는 뜻이다 — 커밋된 15자를 다시 재느라 기다리게 하지 않는다
const data = inFile ? JSON.parse(await readFile(inFile, 'utf8')) : gridChars.length ? {} : STROKES;
const chars = [...new Set([...Object.keys(data), ...gridChars])];

const CELL = 400;
/** 잉크를 찾아 옆으로 훑는 거리 (단위) */
const SEARCH = 13;
/** 이보다 두꺼운 잉크 덩어리는 획이 아니라 교차점으로 본다 — 거기서는 점을 안 옮긴다 */
const MAX_THICK = 11;

// ── 글꼴을 실제로 렌더해 잉크 지도를 만든다 ─────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: CELL + 20, height: CELL + 20 } });
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
for (const ch of chars) {
	await page.evaluate(
		({ ch, em, dy, cell }) => {
			document.head.innerHTML = '<link rel="stylesheet" href="/fonts/fonts.css">';
			document.body.style.cssText = 'margin:0;background:#fff';
			document.body.innerHTML =
				`<div id="cell" style="position:relative;width:${cell}px;height:${cell}px;background:#fff">` +
				`<span style="position:absolute;inset:0;display:grid;place-items:center;line-height:1;` +
				`translate:0 ${dy}%;font-family:'Noto Sans KR';font-size:${cell * em}px;color:#000">${ch}</span></div>`;
		},
		{ ch, em: GLYPH_EM, dy: GLYPH_SHIFT, cell: CELL }
	);
	/*
	 * **그 글자의 서브셋이 실릴 때까지 기다린다.** 한자 폰트는 unicode-range 로 쪼개져 있어
	 * 화면에 없던 글자는 조각을 받아오지 않는다. 안 기다리면 대체 글꼴을 재게 된다.
	 */
	await page.evaluate(
		async ({ ch, px }) => {
			await document.fonts.load(`400 ${px}px "Noto Sans KR"`, ch);
			await document.fonts.ready;
		},
		{ ch, px: Math.round(CELL * GLYPH_EM) }
	);
	const shot = (await page.locator('#cell').screenshot()).toString('base64');
	maps[ch] = await page.evaluate(
		async ({ shot, cell, INK }) => {
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
			for (let i = 0; i < cell * cell; i++) bits[i] = d[i * 4] < Number(INK) ? 1 : 0;
			return Array.from(bits);
		},
		{ shot, cell: CELL, INK: process.env.INK ?? 140 }
	);
}

const inkAt = (m, ux, uy) => {
	const x = Math.round((ux / 100) * CELL);
	const y = Math.round((uy / 100) * CELL);
	return x >= 0 && y >= 0 && x < CELL && y < CELL && m[y * CELL + x] === 1;
};

/** 이 점에서 잉크까지의 거리 (단위). 못 찾으면 Infinity */
function awayFromInk(m, ux, uy, limit = 12) {
	for (let r = 0; r <= limit; r += 0.5) {
		if (r === 0) {
			if (inkAt(m, ux, uy)) return 0;
			continue;
		}
		for (let a = 0; a < 48; a++) {
			const t = (a / 48) * Math.PI * 2;
			if (inkAt(m, ux + Math.cos(t) * r, uy + Math.sin(t) * r)) return r;
		}
	}
	return Infinity;
}

// ── 대충 그린 선을 잉크 능선으로 끌어다 붙인다 ──────────────────────────

/**
 * 한 점을 획의 **한가운데**로 옮긴다.
 *
 * 획을 가로지르는 방향(법선)으로 훑어 잉크가 이어지는 구간을 찾고 그 중심으로 보낸다.
 * 교차점(가로획이 세로획을 지나는 자리)에서는 이어지는 구간이 획 두께보다 훨씬 길다 —
 * 그때 중심을 잡으면 엉뚱한 데로 끌려가므로 **그대로 둔다.**
 */
function centerOnRidge(m, px, py, nx, ny, reach = SEARCH) {
	const hits = [];
	for (let t = -reach; t <= reach; t += 0.25) {
		if (inkAt(m, px + nx * t, py + ny * t)) hits.push(t);
	}
	if (hits.length === 0) return null;

	// t=0 을 품거나 가장 가까운 연속 구간
	let best = null;
	let runStart = hits[0];
	let prev = hits[0];
	const runs = [];
	for (let i = 1; i <= hits.length; i++) {
		const h = hits[i];
		if (h === undefined || h - prev > 0.6) {
			runs.push([runStart, prev]);
			runStart = h;
		}
		prev = h;
	}
	for (const [a, b] of runs) {
		const d = a <= 0 && b >= 0 ? 0 : Math.min(Math.abs(a), Math.abs(b));
		if (best === null || d < best.d) best = { d, a, b };
	}
	if (!best) return null;
	if (best.b - best.a > MAX_THICK) return { keep: true };
	return { t: (best.a + best.b) / 2 };
}

/**
 * 획 하나를 **꺾이는 자리에서 잘라** 조각별로 붙인다.
 *
 * 꺾임(𠃍 의 90°)과 휨(丿 의 완만한 곡선)은 다르게 다뤄야 한다. 꺾이는 자리에서는
 * 법선 방향이 정의되지 않아 한 번에 붙이면 모서리가 엉뚱한 데로 끌려간다.
 * 그래서 50° 넘게 꺾이면 거기서 자르고, 조각마다 따로 붙인 뒤 **접선을 만나게 해**
 * 모서리를 되찾는다. 완만한 휨은 자르지 않고 그대로 따라간다.
 */
const CORNER = 50;

function legsOf(stroke) {
	if (stroke.length <= 2) return [stroke.map((p) => [p[0], p[1]])];
	const cut = [0];
	for (let i = 1; i < stroke.length - 1; i++) {
		const [ax, ay] = stroke[i - 1];
		const [bx, by] = stroke[i];
		const [cx, cy] = stroke[i + 1];
		const a1 = Math.atan2(by - ay, bx - ax);
		const a2 = Math.atan2(cy - by, cx - bx);
		let d = Math.abs(((a2 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
		d = ((Math.PI - d) * 180) / Math.PI;
		if (d > CORNER) cut.push(i);
	}
	cut.push(stroke.length - 1);
	const out = [];
	for (let k = 0; k < cut.length - 1; k++) {
		out.push(stroke.slice(cut[k], cut[k + 1] + 1).map((p) => [p[0], p[1]]));
	}
	return out;
}

/** 원래 자리에서 이만큼 넘게는 못 옮긴다 — 옆 획으로 끌려가는 것을 막는다 */
const MAX_MOVE = 9;

/**
 * 한 조각을 잉크 능선으로 끌어다 붙인다.
 *
 * **가로지르는 방향은 처음에 한 번만 정한다.** 판마다 다시 재면 끝점이 스스로 돌아가면서
 * 옆 획으로 흘러간다 — 그 탓에 母 의 점이 윗 가로줄로, 弟 의 가로획 머리가 세로획으로
 * 9단위나 끌려갔다. 사람이 그린 방향은 위치가 좀 어긋나도 믿을 만하므로 그걸 고정하고
 * **자리만** 되풀이해 다듬는다. 원래 자리에서 너무 멀어지는 것도 막는다.
 */
function fitLeg(m, leg, passes = 3) {
	const orig = resample(leg, 21);
	/*
	 * 짧은 획일수록 **덜 움직이고 덜 멀리 본다.**
	 *
	 * 점획(丶)은 길이가 15단위쯤인데 통로를 13단위나 훑게 두면 옆 획으로 건너뛴다 —
	 * 水·金·校·前 의 점이 그렇게 제 획을 벗어나 빈 곳을 건넜다.
	 * 긴 가로획은 멀리 봐도 헷갈릴 것이 없으므로 그대로 둔다.
	 */
	const legLen = strokeLength(leg);
	const reach = Math.max(4, Math.min(SEARCH, legLen * 0.5));
	const limit = Math.max(3, Math.min(MAX_MOVE, legLen * 0.35));
	// 가로지르는 방향은 사람이 그린 선에서 한 번 정한다
	const normal = orig.map((_, i) => {
		const a = orig[Math.max(0, i - 1)];
		const b = orig[Math.min(orig.length - 1, i + 1)];
		const dx = b[0] - a[0];
		const dy = b[1] - a[1];
		const len = Math.hypot(dx, dy) || 1;
		return [-dy / len, dx / len];
	});

	const last = orig.length - 1;
	/** 각 점을 법선 방향으로 얼마나 옮겼는가 */
	let shift = orig.map(() => 0);
	let live = orig.map(() => true);
	const at = (i) => [orig[i][0] + normal[i][0] * shift[i], orig[i][1] + normal[i][1] * shift[i]];

	for (let pass = 0; pass < passes; pass++) {
		const next = shift.slice();
		const alive = live.slice();
		for (let i = 0; i <= last; i++) {
			/*
			 * **끝점은 스스로 찾지 않는다.**
			 *
			 * 획 끝은 이웃 획에 닿아 있기 마련이라, 혼자 훑게 두면 남의 획으로 끌려간다 —
			 * 國 의 가로획 머리가 囗 윗변으로, 金 의 가로획 양끝이 삐침·파임 다리로,
			 * 母 의 점이 윗 가로줄로 올라갔던 게 전부 이것이다.
			 * 끝점은 몸통이 옮겨간 만큼만 따라간다.
			 */
			if (i === 0 || i === last) continue;
			if (!live[i]) continue;
			const p = at(i);
			const [nx, ny] = normal[i];
			const r = centerOnRidge(m, p[0], p[1], nx, ny, reach);
			if (r === null) {
				alive[i] = false;
				continue;
			}
			if (r.keep) continue;
			// 한 판에 조금씩만 움직여 매끄럽게 수렴시킨다
			const step = Math.max(-4, Math.min(4, r.t));
			next[i] = Math.max(-limit, Math.min(limit, shift[i] + step));
		}
		next[0] = next[1] ?? 0;
		next[last] = next[last - 1] ?? 0;
		shift = next;
		live = alive;
	}

	// 끝점은 몸통을 따라 옮긴 뒤, 잉크 밖이면 잘려 나간다
	live[0] = inkAt(m, ...at(0));
	live[last] = inkAt(m, ...at(last));
	let pts = orig.map((_, i) => at(i));
	let unfit;

	// 양 끝에서 못 붙인 점을 잘라낸다 — 사람이 획을 너무 길게 그린 것이다
	let lo = 0;
	let hi = live.length - 1;
	while (lo <= hi && !live[lo]) lo++;
	while (hi >= lo && !live[hi]) hi--;
	if (hi - lo < 1) return { points: orig, unfit: orig.length };
	unfit = live.slice(lo, hi + 1).filter((v) => !v).length;

	// 남은 흔들림을 다듬는다 — 한 획은 매끈해야 한다
	let kept = pts.slice(lo, hi + 1);
	for (let s = 0; s < 2; s++) {
		kept = kept.map((p, i) => {
			if (i === 0 || i === kept.length - 1) return p;
			const a = kept[i - 1];
			const b = kept[i + 1];
			return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
		});
	}
	return { points: kept, unfit };
}

/** 두 조각의 끝 접선이 만나는 자리 — 꺾임 모서리를 되찾는다 */
function meet(endA, endB) {
	const [a1, a2] = endA;
	const [b1, b2] = endB;
	const d1x = a2[0] - a1[0];
	const d1y = a2[1] - a1[1];
	const d2x = b2[0] - b1[0];
	const d2y = b2[1] - b1[1];
	const den = d1x * d2y - d1y * d2x;
	if (Math.abs(den) < 1e-6) return null;
	const t = ((b1[0] - a2[0]) * d2y - (b1[1] - a2[1]) * d2x) / den;
	return [a2[0] + d1x * t, a2[1] + d1y * t];
}

function fitStroke(m, stroke) {
	// 점획은 붙이지 않는다 — 방향이 없어 법선을 못 잡는다
	if (strokeLength(stroke) < 12) {
		const pts = resample(stroke, 5);
		return { points: pts.map(round1), unfit: pts.filter((p) => !inkAt(m, p[0], p[1])).length };
	}

	const legs = legsOf(stroke).map((leg) => fitLeg(m, leg));
	const unfit = legs.reduce((n, l) => n + l.unfit, 0);
	if (legs.some((l) => l.points.length < 2)) {
		return { points: resample(stroke, 5).map(round1), unfit: 99 };
	}

	/*
		거의 곧은 조각은 **완전히 곧게** 편다.

		잉크 능선은 획이 만나는 자리에서 조금씩 흔들린다(金 의 가로획은 삐침·파임 다리와
		합쳐지는 자리에서 y 가 37~41 사이를 오갔다). 잉크 안이라 판정은 통과하지만,
		시범에서 가로획이 굼실거리며 그어지면 보기 싫고 획을 잘못 배운다.
	*/
	const parts = legs.map((l) => {
		const p = l.points;
		const [ax, ay] = p[0];
		const [bx, by] = p[p.length - 1];
		const len = Math.hypot(bx - ax, by - ay) || 1;
		const off = Math.max(
			...p.map((q) => Math.abs((bx - ax) * (ay - q[1]) - (ax - q[0]) * (by - ay)) / len)
		);
		return off <= 2.5 ? [p[0], p[p.length - 1]] : simplify(p, 1.6);
	});
	for (let i = 0; i < parts.length - 1; i++) {
		const a = parts[i];
		const b = parts[i + 1];
		const corner = meet([a[a.length - 2], a[a.length - 1]], [b[0], b[1]]);
		// 엉뚱한 데서 만나면(거의 평행) 두 끝의 가운데를 쓴다
		const fallback = [(a[a.length - 1][0] + b[0][0]) / 2, (a[a.length - 1][1] + b[0][1]) / 2];
		const use =
			corner && Math.hypot(corner[0] - fallback[0], corner[1] - fallback[1]) < 10
				? corner
				: fallback;
		a[a.length - 1] = use;
		b[0] = use;
	}

	let joined = parts.flatMap((p, i) => (i === 0 ? p : p.slice(1)));

	/*
	 * **가늘어지는 꼬리는 통로에서 뺀다.**
	 *
	 * 붓끝이 빠지는 자리(丿 의 끝, 획머리)는 잉크가 반 픽셀씩 옅어져 사실상 비어 있다.
	 * 통로가 거기까지 뻗으면 아이는 아무것도 없는 자리를 긋게 된다 — 先 의 1획이 그랬다.
	 * 양 끝에서 잉크를 만날 때까지 조금씩 물러난다.
	 */
	{
		const fine = resample(joined, 41);
		let lo = 0;
		let hi = fine.length - 1;
		while (lo < hi && !inkAt(m, fine[lo][0], fine[lo][1])) lo++;
		while (hi > lo && !inkAt(m, fine[hi][0], fine[hi][1])) hi--;
		if (hi - lo >= 2 && (lo > 0 || hi < fine.length - 1)) {
			joined = simplify(fine.slice(lo, hi + 1), 1.2);
		}
	}

	/*
	 * **보정이 원본보다 나쁘면 원본을 쓴다.**
	 *
	 * 사람이 이미 제자리에 그은 획을 붙이려 들다가 오히려 밀어낼 때가 있다 —
	 * 國 의 口 는 획이 촘촘해서 잉크 능선이 어디인지 애매하고, 金 의 점은 짧아서
	 * 조금만 밀려도 제 획을 벗어난다. 도구는 도움이지 권위가 아니므로,
	 * 통로가 빈 곳을 더 많이 건너게 되었으면 손대지 않은 쪽을 남긴다.
	 */
	const holesOf = (pts) => {
		const s = resample(pts, 40);
		return s.filter(([x, y]) => !inkAt(m, x, y)).length;
	};
	if (holesOf(joined) > holesOf(stroke)) {
		return { points: stroke.map(round1), unfit };
	}

	return { points: joined.map(round1), unfit };
}

/** 꺾이는 자리만 남기고 점을 줄인다 (Douglas–Peucker) */
function simplify(pts, eps) {
	if (pts.length < 3) return pts;
	let worst = 0;
	let at = 0;
	const [ax, ay] = pts[0];
	const [bx, by] = pts[pts.length - 1];
	const len = Math.hypot(bx - ax, by - ay) || 1;
	for (let i = 1; i < pts.length - 1; i++) {
		const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
		if (d > worst) {
			worst = d;
			at = i;
		}
	}
	if (worst <= eps) return [pts[0], pts[pts.length - 1]];
	return [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)];
}

const round1 = ([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10];

/**
 * 통로가 글자 잉크를 얼마나 덮는가.
 *
 * "통로가 잉크 위에 있는가" 만으로는 **획을 빠뜨린 분해**를 못 잡는다 —
 * 남은 획들이 전부 글자 위에 있으면 통과해 버리기 때문이다.
 * 반대로 재면 잡힌다: 획이 빠지면 그 자리 잉크가 안 덮인다.
 */
function coverage(m, strokes) {
	const R = Math.round((4.5 / 100) * CELL);
	const hit = new Uint8Array(CELL * CELL);
	for (const s of strokes) {
		for (const [ux, uy] of resample(s, 80)) {
			const cx = Math.round((ux / 100) * CELL);
			const cy = Math.round((uy / 100) * CELL);
			for (let dy = -R; dy <= R; dy++) {
				const y = cy + dy;
				if (y < 0 || y >= CELL) continue;
				const w = Math.floor(Math.sqrt(R * R - dy * dy));
				for (let dx = -w; dx <= w; dx++) {
					const x = cx + dx;
					if (x >= 0 && x < CELL) hit[y * CELL + x] = 1;
				}
			}
		}
	}
	let ink = 0;
	let both = 0;
	for (let i = 0; i < m.length; i++) {
		if (m[i] === 1) {
			ink++;
			if (hit[i] === 1) both++;
		}
	}
	return ink ? both / ink : 0;
}

// ── 재고, 붙이고, 알린다 ────────────────────────────────────────────────
const fitted = {};
let bad = 0;
/** 넣은 좌표 자체가 어긋난 글자 수 — 붙이면 나아지지만 커밋된 값은 고쳐야 한다 */
let stale = 0;
for (const ch of Object.keys(data)) {
	const m = maps[ch];
	/*
	 * **넣은 것 그대로도 잰다.**
	 *
	 * 예전에는 붙인 결과만 재서 보고했는데, 그러면 커밋된 좌표가 어긋나 있어도
	 * 도구가 "0%" 라고 말한다 — 실제로 十 의 가로획이 4단위 아래에 있었는데
	 * 붙인 뒤를 재는 바람에 못 봤고, E2E 게이트가 뒤늦게 잡았다.
	 */
	const inHole = Math.max(
		...data[ch].map((s) => {
			const pts = resample(s, 40);
			return pts.filter(([x, y]) => !inkAt(m, x, y)).length / pts.length;
		})
	);
	const out = data[ch].map((s) => fitStroke(m, s));
	fitted[ch] = out.map((o) => o.points.map(([x, y]) => [x, y]));
	const after = fitted[ch].map((s) =>
		Math.max(...resample(s, 24).map(([x, y]) => awayFromInk(m, x, y)))
	);
	const worst = Math.max(...after);
	/*
	 * **통로가 빈 곳을 건너지는 않는가.**
	 *
	 * "잉크에서 얼마나 떨어졌나" 만 재면 좁은 틈을 못 잡는다 — 틈 한가운데서도
	 * 사방 2~3단위면 잉크가 잡히기 때문이다. 金 의 가로획을 글자 전폭으로 그었을 때
	 * 통로가 삐침·파임 다리 사이의 빈 곳을 두 번 건넜는데도 이탈은 1.5 로 통과했다.
	 * 그래서 **표본이 잉크 위에 있는가** 를 따로 센다.
	 */
	const holes = fitted[ch].map((s) => {
		const pts = resample(s, 40);
		return pts.filter(([x, y]) => !inkAt(m, x, y)).length / pts.length;
	});
	const hole = Math.max(...holes);
	const cover = coverage(m, fitted[ch]);
	const broken = out
		.map((o, i) => ({ i, o }))
		.filter(({ o }) => o.unfit > 0 || o.points.length < 2);
	const ng = worst > 3 || broken.length > 0 || cover < 0.85 || hole > 0.08;
	if (ng) bad++;
	if (inHole > 0.08) stale++;
	console.log(
		`${ch}  넣은것 구멍 ${(inHole * 100).toFixed(0)}%${inHole > 0.08 ? ' ⚠' : ''}` +
			`  →  이탈 ${after.map((v) => (v === Infinity ? '∞' : v.toFixed(1))).join(',')}` +
			`  덮음 ${(cover * 100).toFixed(0)}%  구멍 ${(hole * 100).toFixed(0)}%` +
			(broken.length ? `   붙지 않은 획: ${broken.map((b) => b.i + 1).join(',')}` : '') +
			(cover < 0.85 ? '   획이 빠진 듯' : '') +
			(hole > 0.08
				? `   빈 곳을 건넌다: ${holes
						.map((h, i) => (h > 0.08 ? i + 1 : null))
						.filter(Boolean)
						.join(',')}획`
				: '') +
			(ng ? '   <<<' : '')
	);
}
console.log(
	`\n손볼 글자: ${bad} / ${Object.keys(data).length}` +
		(stale ? `   ·  넣은 좌표가 어긋난 글자 ${stale}자 — 붙여서 다시 커밋해야 한다` : '')
);

if (fitOut) {
	await writeFile(fitOut, JSON.stringify(fitted, null, '\t') + '\n', 'utf8');
	console.log(`붙인 좌표를 ${fitOut} 에 썼습니다.`);
}

// ── 사람이 볼 것들 ──────────────────────────────────────────────────────
if (sheetOut) {
	const cols = Math.min(6, Math.max(1, Object.keys(fitted).length));
	await page.setViewportSize({
		width: cols * 208 + 20,
		height: Math.ceil(Object.keys(fitted).length / cols) * 208 + 20
	});
	await page.evaluate(
		({ set, em, dy, cols }) => {
			document.head.innerHTML = '<link rel="stylesheet" href="/fonts/fonts.css">';
			document.body.style.cssText = 'margin:0;background:#fff';
			const wrap = document.createElement('div');
			wrap.id = 'sheet';
			wrap.style.cssText = `display:grid;grid-template-columns:repeat(${cols},200px);gap:8px;padding:8px;background:#fff`;
			for (const [ch, list] of Object.entries(set)) {
				const cell = document.createElement('div');
				cell.style.cssText = 'position:relative;width:200px;height:200px;outline:1px solid #ccc';
				const g = document.createElement('span');
				g.textContent = ch;
				g.style.cssText =
					'position:absolute;inset:0;display:grid;place-items:center;line-height:1;' +
					`translate:0 ${dy}%;font-family:'Noto Sans KR';font-size:${200 * em}px;color:#111`;
				cell.appendChild(g);
				const ns = 'http://www.w3.org/2000/svg';
				const svg = document.createElementNS(ns, 'svg');
				svg.setAttribute('viewBox', '0 0 100 100');
				svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
				list.forEach((s, i) => {
					const p = document.createElementNS(ns, 'polyline');
					p.setAttribute('points', s.map(([x, y]) => `${x},${y}`).join(' '));
					p.setAttribute('fill', 'none');
					p.setAttribute('stroke', 'rgba(255,60,0,0.5)');
					p.setAttribute('stroke-width', '5');
					p.setAttribute('stroke-linecap', 'round');
					p.setAttribute('stroke-linejoin', 'round');
					svg.appendChild(p);
					const c = document.createElementNS(ns, 'circle');
					c.setAttribute('cx', String(s[0][0]));
					c.setAttribute('cy', String(s[0][1]));
					c.setAttribute('r', '3');
					c.setAttribute('fill', '#0a0');
					svg.appendChild(c);
					const t = document.createElementNS(ns, 'text');
					t.setAttribute('x', String(s[0][0] + 4.5));
					t.setAttribute('y', String(s[0][1] + 1));
					t.setAttribute('font-size', '8');
					t.setAttribute('font-weight', '700');
					t.setAttribute('fill', '#0a0');
					t.textContent = String(i + 1);
					svg.appendChild(t);
				});
				cell.appendChild(svg);
				wrap.appendChild(cell);
			}
			document.body.appendChild(wrap);
		},
		{ set: fitted, em: GLYPH_EM, dy: GLYPH_SHIFT, cols }
	);
	await page.evaluate(() => document.fonts.ready);
	await page.locator('#sheet').screenshot({ path: sheetOut });
	console.log(`대조 그림을 ${sheetOut} 에 썼습니다.`);
}

await browser.close();

const N = 50;
const unit = 100 / N;
for (const ch of gridChars) {
	const m = maps[ch];
	const rows = [];
	const cellPx = CELL / N;
	for (let r = 0; r < N; r++) {
		let line = '';
		for (let q = 0; q < N; q++) {
			let hit = 0;
			for (let y = Math.floor(r * cellPx); y < (r + 1) * cellPx; y++) {
				for (let x = Math.floor(q * cellPx); x < (q + 1) * cellPx; x++) {
					if (m[y * CELL + x] === 1) hit++;
				}
			}
			line += hit > cellPx * cellPx * 0.3 ? '#' : hit > 0 ? '+' : '.';
		}
		rows.push(line.split(''));
	}
	for (const stroke of fitted[ch] ?? data[ch] ?? []) {
		for (const [ux, uy] of resample(stroke, 30)) {
			const q = Math.min(N - 1, Math.max(0, Math.round(ux / unit - 0.5)));
			const r = Math.min(N - 1, Math.max(0, Math.round(uy / unit - 0.5)));
			rows[r][q] = 'o';
		}
	}
	console.log(`\n=== ${ch} ===   (가로 세로 모두 0..100, 한 칸 = 2단위)`);
	console.log('    ' + Array.from({ length: N }, (_, q) => (q % 5 === 0 ? '|' : ' ')).join(''));
	rows.forEach((r, i) => console.log(String(Math.round(i * unit)).padStart(3) + ' ' + r.join('')));
}
