import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
// gifenc 는 CommonJS 라 named import 가 안 된다
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { inflateSync } from 'node:zlib';

/**
 * Playwright 가 녹화한 webm 을 README 에 넣을 **GIF** 로 바꾼다.
 *
 *   node scripts/make-gif.mjs <입력.webm> <출력.gif> [--fps 8] [--width 640] [--from 0] [--to 999]
 *
 * ── 왜 이렇게 하나 ────────────────────────────────────────────────────
 * GitHub 은 README 안의 `<video>` 태그를 **지운다**(마크다운 API 로 확인했다).
 * 저장소에 올린 영상은 인라인 재생이 안 되고, 인라인으로 움직이는 그림은 GIF 뿐이다.
 *
 * 시스템에 ffmpeg 이 없지만 **Playwright 가 자체 ffmpeg 을 번들**한다.
 * 그 빌드는 VP8 디코드와 PNG 인코드만 되고 GIF 먹서가 없다 —
 * 그래서 프레임만 PNG 로 뽑고, GIF 로 묶는 것은 `gifenc`(순수 JS)가 한다.
 * PNG 를 픽셀로 푸는 것도 Chromium 이 한다(Node 에 디코더가 없다).
 */

let [input, output] = process.argv.slice(2);

/*
 * `find:learn` 처럼 주면 test-results 아래에서 이름에 그 말이 든 영상을 찾는다.
 * Playwright 가 만드는 폴더 이름에는 한글 테스트 이름이 그대로 들어가서
 * 경로를 손으로 적어 두면 테스트 제목만 바뀌어도 끊긴다.
 */
if (input?.startsWith('find:')) {
	const want = input.slice(5);
	const hits = [];
	const walk = (dir) => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, e.name);
			if (e.isDirectory()) walk(full);
			else if (e.name.endsWith('.webm') && full.includes(want)) hits.push(full);
		}
	};
	if (existsSync('test-results')) walk('test-results');
	if (hits.length === 0) {
		console.error(
			`test-results 에서 "${want}" 영상을 못 찾았습니다. 먼저 npm run video:play 를 도세요.`
		);
		process.exit(1);
	}
	input = hits.sort()[hits.length - 1];
	console.log(`입력: ${input}`);
}
if (!input || !output) {
	console.error('사용법: node scripts/make-gif.mjs <입력.webm> <출력.gif> [--fps 8] [--width 640]');
	process.exit(1);
}
const arg = (name, fallback) => {
	const i = process.argv.indexOf(name);
	return i < 0 ? fallback : Number(process.argv[i + 1]);
};
const FPS = arg('--fps', 8);
const WIDTH = arg('--width', 640);
const FROM = arg('--from', 0);
const TO = arg('--to', 9999);

// Playwright 가 브라우저와 함께 받아 둔 ffmpeg 을 찾는다
function findFfmpeg() {
	const roots = [
		process.env.PLAYWRIGHT_BROWSERS_PATH,
		path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright'),
		path.join(process.env.HOME ?? '', '.cache', 'ms-playwright')
	].filter(Boolean);
	for (const root of roots) {
		if (!existsSync(root)) continue;
		for (const dir of readdirSync(root)) {
			if (!dir.startsWith('ffmpeg')) continue;
			for (const f of readdirSync(path.join(root, dir))) {
				if (f.startsWith('ffmpeg')) return path.join(root, dir, f);
			}
		}
	}
	return null;
}

const ffmpeg = findFfmpeg();
if (!ffmpeg) {
	console.error(
		'Playwright 의 ffmpeg 을 찾지 못했습니다. `npx playwright install` 을 먼저 하세요.'
	);
	process.exit(1);
}

const tmp = path.join('node_modules', '.cache', 'gif-frames');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

console.log(`프레임 추출 — ${FPS}fps · ${WIDTH}px`);
const cut = ['-ss', String(FROM), '-t', String(TO - FROM)];
const extract = spawnSync(
	ffmpeg,
	[
		'-hide_banner',
		'-loglevel',
		'error',
		...cut,
		'-i',
		input,
		/*
		 * 번들 ffmpeg 은 `fps` 필터가 빠져 있다 — 출력 프레임레이트(`-r`)로 대신한다.
		 * 크기도 `scale` 필터 대신 `-s` 로 준다(필터그래프를 아예 안 쓰는 편이 안전하다).
		 */
		'-r',
		String(FPS),
		'-s',
		`${WIDTH}x${Math.round((WIDTH * 800) / 1280)}`,
		'-f',
		'image2',
		path.join(tmp, '%04d.png')
	],
	{ stdio: 'inherit' }
);
if (extract.status !== 0) process.exit(extract.status ?? 1);

const files = readdirSync(tmp)
	.filter((f) => f.endsWith('.png'))
	.sort();
if (files.length === 0) {
	console.error('프레임이 하나도 안 나왔습니다.');
	process.exit(1);
}
console.log(`프레임 ${files.length}장`);

/**
 * PNG → RGBA 픽셀.
 *
 * Node 에는 PNG 디코더가 없다. 처음에는 Chromium 에게 시켰는데, 픽셀을 페이지 밖으로
 * 꺼내는 데만 프레임당 수십 MB 짜리 JSON 배열이 오가서 100장에 10분이 넘게 걸렸다.
 * PNG 는 zlib 만 있으면 풀 수 있고 zlib 은 Node 에 들어 있다 — 그래서 직접 푼다.
 * (ffmpeg 이 쓰는 형태만 다룬다: 8비트, 인터레이스 없음, RGB 또는 RGBA)
 */
function decodePng(buf) {
	let pos = 8; // 시그니처
	let width = 0;
	let height = 0;
	let colorType = 0;
	const idat = [];
	while (pos < buf.length) {
		const len = buf.readUInt32BE(pos);
		const type = buf.toString('ascii', pos + 4, pos + 8);
		const body = buf.subarray(pos + 8, pos + 8 + len);
		if (type === 'IHDR') {
			width = body.readUInt32BE(0);
			height = body.readUInt32BE(4);
			if (body[8] !== 8) throw new Error(`8비트 PNG 만 다룬다 (bitDepth=${body[8]})`);
			colorType = body[9];
			if (body[12] !== 0) throw new Error('인터레이스 PNG 는 다루지 않는다');
		} else if (type === 'IDAT') idat.push(body);
		else if (type === 'IEND') break;
		pos += 12 + len;
	}
	const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
	if (!channels) throw new Error(`RGB/RGBA PNG 만 다룬다 (colorType=${colorType})`);

	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * channels;
	const out = new Uint8ClampedArray(width * height * 4);
	const line = Buffer.alloc(stride);
	let prev = Buffer.alloc(stride);
	let at = 0;
	for (let y = 0; y < height; y++) {
		const filter = raw[at++];
		raw.copy(line, 0, at, at + stride);
		at += stride;
		// PNG 스캔라인 필터 되돌리기 (사양 9.2)
		for (let x = 0; x < stride; x++) {
			const a = x >= channels ? line[x - channels] : 0;
			const b = prev[x];
			const c = x >= channels ? prev[x - channels] : 0;
			let v = line[x];
			if (filter === 1) v += a;
			else if (filter === 2) v += b;
			else if (filter === 3) v += (a + b) >> 1;
			else if (filter === 4) {
				const p = a + b - c;
				const pa = Math.abs(p - a);
				const pb = Math.abs(p - b);
				const pc = Math.abs(p - c);
				v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
			}
			line[x] = v & 0xff;
		}
		for (let x = 0; x < width; x++) {
			const src = x * channels;
			const dst = (y * width + x) * 4;
			out[dst] = line[src];
			out[dst + 1] = line[src + 1];
			out[dst + 2] = line[src + 2];
			out[dst + 3] = channels === 4 ? line[src + 3] : 255;
		}
		prev = Buffer.from(line);
	}
	return { data: out, width, height };
}

const frames = [];
let size = null;
for (const f of files) {
	const { data, width, height } = decodePng(readFileSync(path.join(tmp, f)));
	size ??= { w: width, h: height };
	frames.push(data);
}

/*
 * 팔레트는 **첫 프레임이 아니라 여러 프레임을 섞어서** 만든다.
 * 첫 프레임만 보면 뒤에 나오는 색(합체 연출의 금색 같은 것)이 팔레트에 없어
 * 영상 중간부터 색이 무너진다.
 */
console.log('팔레트 계산');
const sample = [];
const step = Math.max(1, Math.floor(frames.length / 12));
for (let i = 0; i < frames.length; i += step) sample.push(frames[i]);
const merged = new Uint8ClampedArray(sample.length * sample[0].length);
sample.forEach((f, i) => merged.set(f, i * f.length));
const palette = quantize(merged, 256, { format: 'rgb565' });

console.log('GIF 인코딩');
const gif = GIFEncoder();
const delay = Math.round(1000 / FPS);
for (const frame of frames) {
	gif.writeFrame(applyPalette(frame, palette, 'rgb565'), size.w, size.h, { palette, delay });
}
gif.finish();
writeFileSync(output, Buffer.from(gif.bytes()));
rmSync(tmp, { recursive: true, force: true });

const mb = (readFileSync(output).length / 1024 / 1024).toFixed(1);
console.log(`${output} — ${size.w}×${size.h} · ${frames.length}프레임 · ${mb}MB`);
