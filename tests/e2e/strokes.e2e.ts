import { expect, test } from '@playwright/test';
import { GLYPH_EM, GLYPH_SHIFT, resample } from '../../src/lib/game/stroke';
import { STROKES } from '../../src/lib/game/stroke-data';
import { waitForFonts } from '../helpers/screens';

/**
 * **통로가 글자 위에 있는가.**
 *
 * 획순 좌표는 사람이 손으로 찍는다. 획수·범위·방향 같은 구조는 단위 테스트가 잡지만,
 * "이 선이 정말 글자 획 위에 놓였는가" 는 **폰트를 실제로 렌더해 봐야만** 알 수 있다.
 * 통로가 글자를 벗어나면 아이는 글자가 없는 자리를 문지르게 되고, 그건 없느니만 못하다.
 *
 * 처음 이 검사를 만들었을 때 16자 중 8자가 걸렸다. 원인은 두 가지였다:
 *  1. 글자가 통로보다 36% 작았다 (`GLYPH_EM` 이 0.62 였다).
 *  2. 브라우저가 글자를 상자 정중앙보다 4.3단위 아래에 앉힌다 (`GLYPH_SHIFT`).
 * 둘 다 여기서 쓰는 상수를 화면도 그대로 쓰므로, 한쪽만 바뀌면 이 검사가 깨진다.
 *
 * 캔버스 `fillText` 로 재면 안 된다 — 브라우저가 span 을 앉히는 자리와 다르다.
 * 그래서 진짜 DOM 을 스크린샷 찍어 그 픽셀을 읽는다.
 */

/** 표본 하나가 잉크에서 이만큼(0..100 단위) 넘게 떨어져 있으면 통로가 글자를 벗어난 것이다 */
const TOLERANCE = 3.5;
/**
 * 표본 중 이만큼 넘게 잉크 **밖**에 있으면 통로가 빈 곳을 건너는 것이다.
 *
 * 거리만 재면 좁은 틈을 못 잡는다 — 틈 한가운데서도 사방 2~3단위면 잉크가 잡히기 때문이다.
 * 金 의 가로획을 글자 전폭으로 그었을 때 통로가 삐침·파임 다리 사이의 빈 곳을 두 번
 * 건넜는데도 이탈은 1.5 로 통과했다. 그래서 **표본이 잉크 위에 있는가** 를 따로 센다.
 */
const HOLES = 0.1;

/** 재는 상자 크기(px). 클수록 정밀하지만 느리다 */
const CELL = 400;

test('획순 통로가 실제 글자 위에 있다', async ({ page }, testInfo) => {
	// 폰트 렌더는 뷰포트와 무관하다 — 세 번 잴 이유가 없다
	test.skip(testInfo.project.name !== 'desktop', '폰트는 화면 크기를 타지 않는다');
	test.setTimeout(120_000);

	// 앱의 아무 화면이나 열면 self-host 한 한자 폰트가 함께 실린다
	await page.goto('/login');
	await waitForFonts(page);

	const chars = Object.keys(STROKES);
	expect(chars.length, '획순 데이터가 비어 있다').toBeGreaterThan(0);

	const failures: string[] = [];

	for (const ch of chars) {
		await page.evaluate(
			({ ch, em, shift, cell }) => {
				const old = document.getElementById('ink-probe');
				if (old) old.remove();
				const box = document.createElement('div');
				box.id = 'ink-probe';
				box.style.cssText =
					`position:fixed;left:0;top:0;z-index:99999;width:${cell}px;height:${cell}px;` +
					`background:#fff`;
				const g = document.createElement('span');
				g.textContent = ch;
				/* 화면(TraceGlyph)의 `.glyph` 와 **같은 규칙**으로 앉힌다 */
				g.style.cssText =
					'position:absolute;inset:0;display:grid;place-items:center;line-height:1;' +
					`translate:0 ${shift}%;font-family:var(--font-hanja);font-size:${cell * em}px;color:#000`;
				box.appendChild(g);
				document.body.appendChild(box);
			},
			{ ch, em: GLYPH_EM, shift: GLYPH_SHIFT, cell: CELL }
		);
		/*
		 * **그 글자의 서브셋이 실릴 때까지 기다린다.**
		 *
		 * 한자 폰트는 unicode-range 로 100여 개 파일로 쪼개져 있어서, 화면에 없는 글자의
		 * 조각은 받아오지 않는다. `document.fonts.ready` 는 *지금 받는 중인 것*만 기다리므로
		 * 방금 넣은 글자에는 소용이 없다 — 대체 글꼴로 찍힌 그림을 재게 된다.
		 * 실제로 그렇게 재는 바람에 十·中·白 이 "빈 곳을 건넌다" 로 잘못 걸렸다.
		 */
		await page.evaluate(
			async ({ ch, px }) => {
				await document.fonts.load(`400 ${px}px "Noto Sans KR"`, ch);
				await document.fonts.ready;
			},
			{ ch, px: Math.round(CELL * GLYPH_EM) }
		);

		const shot = (await page.locator('#ink-probe').screenshot()).toString('base64');

		const worst = await page.evaluate(
			async ({ shot, cell, strokes, tolerance }) => {
				const img = new Image();
				img.src = 'data:image/png;base64,' + shot;
				await img.decode();
				const c = document.createElement('canvas');
				c.width = cell;
				c.height = cell;
				const ctx = c.getContext('2d', { willReadFrequently: true })!;
				ctx.drawImage(img, 0, 0);
				const d = ctx.getImageData(0, 0, cell, cell).data;
				// 흰 배경 위의 검은 글자 — 밝기로 잉크를 가린다
				const ink = (x: number, y: number) =>
					x >= 0 && y >= 0 && x < cell && y < cell && d[((y | 0) * cell + (x | 0)) * 4] < 140;

				const limit = Math.ceil((tolerance / 100) * cell);
				const out: { stroke: number; away: number; at: [number, number]; hole: number }[] = [];
				strokes.forEach((samples, i) => {
					let away = 0;
					let off = 0;
					let at: [number, number] = [0, 0];
					for (const [ux, uy] of samples) {
						if (!ink((ux / 100) * cell, (uy / 100) * cell)) off += 1;
						const px = (ux / 100) * cell;
						const py = (uy / 100) * cell;
						let best = Infinity;
						for (let r = 0; r <= limit + 2 && best === Infinity; r += 2) {
							for (let a = 0; a < 64; a++) {
								const t = (a / 64) * Math.PI * 2;
								if (ink(px + Math.cos(t) * r, py + Math.sin(t) * r)) {
									best = r;
									break;
								}
							}
						}
						const u = Number.isFinite(best) ? (best / cell) * 100 : 99;
						if (u > away) {
							away = u;
							at = [Math.round(ux), Math.round(uy)];
						}
					}
					out.push({ stroke: i + 1, away, at, hole: off / samples.length });
				});
				return out;
			},
			{
				shot,
				cell: CELL,
				strokes: STROKES[ch].map((s) => resample(s, 24)),
				tolerance: TOLERANCE
			}
		);

		for (const w of worst) {
			if (w.away > TOLERANCE) {
				failures.push(
					`${ch} ${w.stroke}획: (${w.at[0]},${w.at[1]}) 근처에 잉크가 없다 ` +
						`— ${w.away.toFixed(1)}단위 벗어남`
				);
			} else if (w.hole > HOLES) {
				failures.push(
					`${ch} ${w.stroke}획: 통로가 빈 곳을 건넌다 — 표본의 ${(w.hole * 100).toFixed(0)}% 가 잉크 밖`
				);
			}
		}
	}

	expect(
		failures,
		'통로가 글자를 벗어난 획이 있다. 좌표를 고치거나 그 글자를 stroke-data 에서 빼야 한다 ' +
			'(빼면 그 글자는 흙 파기로 배운다):\n' +
			failures.join('\n')
	).toEqual([]);
});
