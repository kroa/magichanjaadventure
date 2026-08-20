/**
 * 두 조각이 실제로 만나서 하나가 되는 연출.
 *
 * **왜 필요한가.**
 * 지금까지는 日과 月을 고르면 明이 툭 나타났다. "합체" 라고 이름 붙였지만
 * 아이 눈에는 정답 판정과 구별되지 않는다. 조각이 서로 다가가 부딪히고 빛나며 하나가 되는
 * 그 0.5초가 없으면, 이 게임은 아무리 규칙을 잘 짜도 여전히 문제지처럼 보인다.
 *
 * GSAP 을 쓰지 않는다. 이 연출은 위치 이동과 크기 변화뿐이라 Web Animations API 로 충분하고,
 * 레벨업 연출처럼 무거운 타임라인이 아니어서 번들을 더 키울 이유가 없다.
 */

/** 연출에 쓰는 복제 조각. 원본은 건드리지 않는다 */
function ghostOf(source: HTMLElement): HTMLElement {
	const rect = source.getBoundingClientRect();
	const ghost = source.cloneNode(true) as HTMLElement;

	ghost.setAttribute('aria-hidden', 'true');
	/* 연출용 허깨비다. 레이아웃 검사가 이걸 진짜 버튼으로 세면 안 된다 */
	ghost.setAttribute('data-ghost', 'true');
	ghost.setAttribute('data-allow-offscreen', '');
	ghost.setAttribute('data-allow-overlap', '');
	ghost.setAttribute('data-allow-small', '');
	ghost.style.position = 'fixed';
	ghost.style.left = `${rect.left}px`;
	ghost.style.top = `${rect.top}px`;
	ghost.style.width = `${rect.width}px`;
	ghost.style.height = `${rect.height}px`;
	ghost.style.margin = '0';
	ghost.style.zIndex = '60';
	ghost.style.pointerEvents = 'none';

	return ghost;
}

function centerOf(element: HTMLElement): { x: number; y: number } {
	const rect = element.getBoundingClientRect();
	return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

const REDUCED = () =>
	typeof window !== 'undefined' &&
	window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * `sources` 가 `destination` 으로 날아가 합쳐진다.
 *
 * 애니메이션이 끝난 뒤에 resolve 하므로, 호출한 쪽은 그 다음에 결과를 드러내면 된다.
 * 움직임을 줄이도록 설정한 사용자에게는 즉시 끝난다 — 연출이 없다고 게임이 막히면 안 된다.
 */
export async function mergeInto(
	sources: readonly HTMLElement[],
	destination: HTMLElement,
	duration = 480
): Promise<void> {
	if (typeof document === 'undefined' || sources.length === 0) return;
	if (REDUCED()) return;

	const target = centerOf(destination);
	const ghosts = sources.map(ghostOf);
	for (const ghost of ghosts) document.body.appendChild(ghost);

	try {
		await Promise.all(
			ghosts.map((ghost, index) => {
				const from = centerOf(sources[index]);
				const dx = target.x - from.x;
				const dy = target.y - from.y;

				return ghost.animate(
					[
						{ transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
						{
							// 만나기 직전에 살짝 부풀어야 "부딪혔다" 는 느낌이 난다
							transform: `translate(${dx * 0.82}px, ${dy * 0.82}px) scale(1.18)`,
							opacity: 1,
							offset: 0.72
						},
						{ transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0 }
					],
					{ duration, easing: 'cubic-bezier(.34,1.3,.64,1)', fill: 'forwards' }
				).finished;
			})
		);
	} catch {
		// 애니메이션이 중간에 끊겨도 게임은 계속되어야 한다
	} finally {
		for (const ghost of ghosts) ghost.remove();
	}
}

/**
 * 새로 만들어진 것이 "짠" 하고 나타난다.
 *
 * 합쳐진 직후에 결과가 그냥 켜지면 두 연출이 따로 논다. 받아 주는 동작이 있어야
 * 조각이 이 자리로 들어와 저것이 되었다는 인과가 눈에 보인다.
 */
export async function popIn(element: HTMLElement, duration = 420): Promise<void> {
	if (typeof document === 'undefined' || REDUCED()) return;
	try {
		await element.animate(
			[
				{ transform: 'scale(0.2)', opacity: 0 },
				{ transform: 'scale(1.15)', opacity: 1, offset: 0.6 },
				{ transform: 'scale(1)', opacity: 1 }
			],
			{ duration, easing: 'cubic-bezier(.34,1.56,.64,1)' }
		).finished;
	} catch {
		// 연출 실패가 결과를 가리면 안 된다
	}
}
