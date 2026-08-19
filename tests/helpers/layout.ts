import { expect, type Page } from '@playwright/test';

/**
 * 레이아웃 자동 검수 (이 프로젝트의 핵심 harness).
 *
 * 픽셀 스크린샷 비교(`toHaveScreenshot`)는 쓰지 않는다.
 * 파티클과 idle 모션 때문에 상시 실패해서 신호가 아니라 소음이 되기 때문이다.
 * 대신 **레이아웃 규칙을 코드로 검사**한다. 실패하면 사람이 스크린샷을 볼 필요 없이 원인이 나온다.
 *
 * 예외를 두고 싶을 때는 DOM 에 표식을 단다.
 *   data-allow-clip   — 의도적 말줄임(line-clamp 등)
 *   data-allow-small  — 의도적으로 작은 터치 타깃(본문 속 인라인 링크 등)
 *   data-allow-offscreen — 화면 밖에 대기 중인 연출 요소
 */

export interface LayoutIssue {
	rule: string;
	element: string;
	detail: string;
}

/**
 * 끝나는 애니메이션이 모두 끝날 때까지 기다린다.
 *
 * 이게 없으면 등장 연출(예: 모달의 scale 0.85 → 1) 도중에 크기를 재게 되어
 * 48px 버튼이 "41px 이라 너무 작다"로 잘못 신고된다. 실제로 그 오탐을 겪었다.
 *
 * idle 모션(캐릭터 숨쉬기, 별 반짝임)은 **무한 반복**이므로 기다리면 영영 끝나지 않는다.
 * 그래서 반복 횟수가 유한한 애니메이션만 기다린다.
 */
export async function settleAnimations(page: Page, timeout = 3000): Promise<void> {
	await page.evaluate(async (limit) => {
		const finite = document.getAnimations().filter((a) => {
			const timing = a.effect?.getTiming();
			return timing != null && timing.iterations !== Infinity;
		});
		if (finite.length === 0) return;

		await Promise.race([
			Promise.all(finite.map((a) => a.finished.catch(() => undefined))),
			new Promise((resolve) => setTimeout(resolve, limit))
		]);
	}, timeout);
}

/** 페이지 전체를 검사하고 발견된 문제 목록을 돌려준다. */
export async function findLayoutIssues(
	page: Page,
	options: { minTapSize?: number; checkTapTargets?: boolean } = {}
): Promise<LayoutIssue[]> {
	const minTap = options.minTapSize ?? 48;
	const checkTaps = options.checkTapTargets ?? true;

	await settleAnimations(page);

	return page.evaluate(
		({ minTap, checkTaps }) => {
			const describe = (el: Element): string => {
				const tag = el.tagName.toLowerCase();
				const id = el.id ? '#' + el.id : '';
				const tid = el.getAttribute('data-testid');
				const testid = tid ? '[data-testid=' + tid + ']' : '';
				const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
				return tag + id + testid + (text ? ' "' + text + '"' : '');
			};
			const issues: { rule: string; element: string; detail: string }[] = [];

			const isVisible = (el: Element): boolean => {
				const s = getComputedStyle(el);
				if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0)
					return false;
				const r = el.getBoundingClientRect();
				return r.width > 0 && r.height > 0;
			};

			// ── 1. 가로 오버플로 ────────────────────────────────────────────────
			const docW = document.documentElement.scrollWidth;
			if (docW > window.innerWidth + 1) {
				issues.push({
					rule: 'horizontal-overflow',
					element: 'document',
					detail: `문서 폭 ${docW}px > 뷰포트 ${window.innerWidth}px — 가로 스크롤이 생깁니다`
				});
				// 원인 요소를 찾아준다
				for (const el of Array.from(document.body.querySelectorAll('*'))) {
					if (!isVisible(el)) continue;
					const r = el.getBoundingClientRect();
					if (r.right > window.innerWidth + 1 && r.width > 4) {
						issues.push({
							rule: 'horizontal-overflow-source',
							element: describe(el),
							detail: `오른쪽 끝 ${Math.round(r.right)}px (뷰포트 ${window.innerWidth}px)`
						});
						break;
					}
				}
			}

			// ── 2. 텍스트 잘림 ──────────────────────────────────────────────────
			for (const el of Array.from(document.body.querySelectorAll('*'))) {
				if (!isVisible(el)) continue;
				if (el.closest('[data-allow-clip]')) continue;

				const hasOwnText = Array.from(el.childNodes).some(
					(n) => n.nodeType === 3 && (n.textContent || '').trim().length > 0
				);
				if (!hasOwnText) continue;

				const s = getComputedStyle(el);

				/*
				 * 스크린리더 전용 텍스트(.sr-only)는 **의도적으로** 1px 로 잘라둔 것이다.
				 * 잘림으로 신고하면 접근성을 챙길수록 린터가 시끄러워지는 역설이 생긴다.
				 */
				if (el.clientWidth <= 1 || el.clientHeight <= 1) continue;
				if (s.clipPath && s.clipPath !== 'none') continue;
				if (s.position === 'absolute' && parseFloat(s.width) <= 1) continue;

				const clips =
					/hidden|clip/.test(s.overflow) ||
					/hidden|clip/.test(s.overflowX) ||
					/hidden|clip/.test(s.overflowY);
				if (!clips) continue;

				if (el.scrollWidth > el.clientWidth + 2) {
					issues.push({
						rule: 'text-clipped-horizontally',
						element: describe(el),
						detail: `내용 폭 ${el.scrollWidth}px > 상자 폭 ${el.clientWidth}px`
					});
				}
				if (el.scrollHeight > el.clientHeight + 2) {
					issues.push({
						rule: 'text-clipped-vertically',
						element: describe(el),
						detail: `내용 높이 ${el.scrollHeight}px > 상자 높이 ${el.clientHeight}px`
					});
				}
			}

			// ── 3. 터치 타깃 크기 ──────────────────────────────────────────────
			if (checkTaps) {
				const interactive = document.body.querySelectorAll(
					'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=link]'
				);
				for (const el of Array.from(interactive)) {
					if (!isVisible(el)) continue;
					if (el.closest('[data-allow-small]')) continue;
					const s = getComputedStyle(el);
					if (s.display === 'inline') continue; // 본문 속 인라인 링크는 제외
					const r = el.getBoundingClientRect();
					if (r.width < minTap - 0.5 || r.height < minTap - 0.5) {
						issues.push({
							rule: 'tap-target-too-small',
							element: describe(el),
							detail: `${Math.round(r.width)}×${Math.round(r.height)}px < 최소 ${minTap}×${minTap}px`
						});
					}
				}
			}

			// ── 4. 뷰포트 이탈 ─────────────────────────────────────────────────
			const anchors = document.body.querySelectorAll(
				'button, a[href], input:not([type=hidden]), h1, h2, [data-testid]'
			);
			for (const el of Array.from(anchors)) {
				if (!isVisible(el)) continue;
				if (el.closest('[data-allow-offscreen]')) continue;
				const r = el.getBoundingClientRect();
				if (r.right < -1 || r.left > window.innerWidth + 1) {
					issues.push({
						rule: 'element-outside-viewport',
						element: describe(el),
						detail: `가로 범위 ${Math.round(r.left)}~${Math.round(r.right)}px (뷰포트 0~${window.innerWidth}px)`
					});
				}
			}

			// ── 5. 인터랙티브 요소 겹침 ────────────────────────────────────────
			/*
			 * 고정(fixed/sticky) 요소는 스크롤에 따라 본문 위를 지나가는 것이 **정상**이다.
			 * (하단 네비게이션, 토스트 등)
			 * 그래서 "둘 다 고정" 또는 "둘 다 일반"인 쌍만 비교한다.
			 */
			const isPinned = (el: Element): boolean => {
				let node: Element | null = el;
				while (node && node !== document.body) {
					const pos = getComputedStyle(node).position;
					if (pos === 'fixed' || pos === 'sticky') return true;
					node = node.parentElement;
				}
				return false;
			};

			/*
			 * 모달이 열려 있으면 브라우저가 배경 전체를 inert 로 만든다(`showModal()`).
			 * 즉 모달 밖 버튼은 **화면에 보여도 누를 수 없다.** 겹쳐도 문제가 아니다.
			 *
			 * 이 예외가 없었을 때, sticky 상단 네비게이션과 모달 닫기 버튼이 겹친다고
			 * 잘못 잡혔다. 둘 다 "고정"이라 기존의 고정/일반 구분으로는 걸러지지 않는다.
			 * 실제로 겹쳐서 곤란한 경우만 남기려면 **지금 누를 수 있는 것끼리**만 비교해야 한다.
			 */
			const openModal = document.querySelector('dialog:modal');

			const boxes = Array.from(document.body.querySelectorAll('button, a[href], [role=button]'))
				.filter((el) => isVisible(el) && !el.closest('[data-allow-overlap]'))
				.filter((el) => !openModal || openModal.contains(el))
				.map((el) => ({ el, r: el.getBoundingClientRect(), pinned: isPinned(el) }));

			for (let i = 0; i < boxes.length; i++) {
				for (let j = i + 1; j < boxes.length; j++) {
					const a = boxes[i];
					const b = boxes[j];
					if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
					if (a.pinned !== b.pinned) continue;
					const overlapW = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
					const overlapH = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
					if (overlapW > 4 && overlapH > 4) {
						issues.push({
							rule: 'interactive-elements-overlap',
							element: `${describe(a.el)}  ↔  ${describe(b.el)}`,
							detail: `${Math.round(overlapW)}×${Math.round(overlapH)}px 겹침`
						});
					}
				}
			}

			return issues;
		},
		{ minTap, checkTaps }
	);
}

/**
 * 레이아웃 문제가 하나도 없어야 한다. 있으면 테스트를 실패시킨다.
 *
 * @example
 * await expectHealthyLayout(page);
 */
export async function expectHealthyLayout(
	page: Page,
	options: { minTapSize?: number; checkTapTargets?: boolean; allow?: string[] } = {}
): Promise<void> {
	const allow = new Set(options.allow ?? []);
	const issues = (await findLayoutIssues(page, options)).filter((i) => !allow.has(i.rule));

	const report = issues.map((i) => `  ✗ [${i.rule}] ${i.element}\n      ${i.detail}`).join('\n');

	expect(issues, `레이아웃 문제 ${issues.length}건:\n${report}`).toEqual([]);
}

/**
 * 텍스트 대비 검사(선택적). 배경이 그라디언트/이미지인 요소는 신뢰할 수 없으므로 건너뛴다.
 */
export async function findContrastIssues(page: Page, minRatio = 4.5): Promise<LayoutIssue[]> {
	return page.evaluate(
		({ minRatio }) => {
			const describe = (el: Element): string => {
				const tag = el.tagName.toLowerCase();
				const id = el.id ? '#' + el.id : '';
				const tid = el.getAttribute('data-testid');
				const testid = tid ? '[data-testid=' + tid + ']' : '';
				const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
				return tag + id + testid + (text ? ' "' + text + '"' : '');
			};
			const issues: { rule: string; element: string; detail: string }[] = [];

			const parse = (c: string): [number, number, number, number] | null => {
				const m = c.match(/rgba?\(([^)]+)\)/);
				if (!m) return null;
				const p = m[1].split(',').map((x) => parseFloat(x.trim()));
				return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
			};
			const lum = (r: number, g: number, b: number): number => {
				const f = (v: number) => {
					const s = v / 255;
					return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
				};
				return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
			};

			for (const el of Array.from(document.body.querySelectorAll('*'))) {
				const hasOwnText = Array.from(el.childNodes).some(
					(n) => n.nodeType === 3 && (n.textContent || '').trim().length > 0
				);
				if (!hasOwnText) continue;
				const s = getComputedStyle(el);
				if (s.display === 'none' || s.visibility === 'hidden') continue;

				const fg = parse(s.color);
				if (!fg) continue;

				// 배경 찾기: 불투명한 background-color 를 가진 가장 가까운 조상
				let bg: [number, number, number, number] | null = null;
				let node: Element | null = el;
				let unreliable = false;
				while (node) {
					const ns = getComputedStyle(node);
					if (ns.backgroundImage && ns.backgroundImage !== 'none') {
						unreliable = true;
						break;
					}
					const c = parse(ns.backgroundColor);
					if (c && c[3] >= 0.99) {
						bg = c;
						break;
					}
					node = node.parentElement;
				}
				if (unreliable) continue;
				if (!bg) bg = [255, 255, 255, 1];

				const l1 = lum(fg[0], fg[1], fg[2]);
				const l2 = lum(bg[0], bg[1], bg[2]);
				const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

				const size = parseFloat(s.fontSize);
				const bold = parseInt(s.fontWeight, 10) >= 700;
				const large = size >= 24 || (size >= 18.66 && bold);
				const required = large ? 3 : minRatio;

				if (ratio < required) {
					issues.push({
						rule: 'low-contrast',
						element: describe(el),
						detail: `대비 ${ratio.toFixed(2)}:1 < 요구 ${required}:1 (${s.color} on rgb(${bg[0]},${bg[1]},${bg[2]}))`
					});
				}
			}
			return issues;
		},
		{ minRatio }
	);
}

export async function expectSufficientContrast(page: Page, minRatio = 4.5): Promise<void> {
	const issues = await findContrastIssues(page, minRatio);
	const report = issues.map((i) => `  ✗ ${i.element}\n      ${i.detail}`).join('\n');
	expect(issues, `대비 부족 ${issues.length}건:\n${report}`).toEqual([]);
}
