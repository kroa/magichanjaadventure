/**
 * 손으로 끌어다 놓기.
 *
 * **왜 탭이 아니라 드래그인가.**
 * 부품을 탭해서 빈 칸에 "넣는" 것은 결국 폼 입력이다. 아이는 답을 고른 것이지
 * 물건을 다룬 것이 아니다. 손가락을 따라 조각이 실제로 움직이고, 놓을 자리에 가까워지면
 * 그 자리가 반응하고, 엉뚱한 곳에 놓으면 제자리로 돌아가는 — 그 감각이 있어야
 * 화면이 "문제지" 가 아니라 "작업대" 가 된다.
 *
 * 탭도 그대로 살려 둔다. 손가락이 서툰 아이, 마우스 사용자, 키보드 사용자 모두를 위해
 * 움직임이 임계값을 넘지 않으면 탭으로 처리한다. 드래그는 **추가**지 대체가 아니다.
 */

export interface DraggableOptions {
	/** 놓을 수 있는 자리를 찾는 CSS 선택자 */
	dropSelector: string;
	/** 이 조각이 무엇인지 (놓였을 때 그대로 돌려준다) */
	value: string;
	/** 놓을 자리에 떨어뜨렸다 */
	onDrop?: (value: string, target: Element) => void;
	/*
	 * 탭은 여기서 다루지 않는다. 원래 있던 onclick 을 그대로 두면
	 * 마우스 클릭도 키보드 Enter 도 지금까지처럼 동작한다.
	 * 이 액션은 **드래그만 얹는다** — 접근성을 손대지 않는 것이 중요하다.
	 */
	/** 끌기 시작 / 끝 (소리나 연출에 쓴다) */
	onLift?: (value: string) => void;
	onRelease?: () => void;
	disabled?: boolean;
}

/** 이만큼 움직이면 탭이 아니라 드래그로 본다 */
const DRAG_THRESHOLD = 8;

/*
 * WAAPI 와 인라인 스타일은 전역 감속 규칙(app.css 의 prefers-reduced-motion)의
 * 영향을 받지 않는다. 그래서 손으로 들고 있어야 한다 — merge.ts 와 같은 이유다.
 */
function reduced(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
	);
}

function swallowClick(event: Event) {
	event.stopPropagation();
	event.preventDefault();
}

export function draggable(node: HTMLElement, options: DraggableOptions) {
	let current = options;
	let pointerId: number | null = null;
	let startX = 0;
	let startY = 0;
	let dragging = false;
	let hovered: Element | null = null;

	/* 끌고 있을 때 스크롤이 같이 따라오면 조각이 손가락에서 미끄러진다 */
	node.style.touchAction = 'none';

	function highlight(target: Element | null) {
		if (hovered === target) return;
		hovered?.removeAttribute('data-drop-hover');
		target?.setAttribute('data-drop-hover', 'true');
		hovered = target;
	}

	/** 손가락 아래에 있는 "놓을 자리" 를 찾는다 */
	function dropTargetAt(x: number, y: number): Element | null {
		// 끌고 있는 조각 자신이 가려서 밑을 못 보게 되는 것을 피한다
		const previous = node.style.pointerEvents;
		node.style.pointerEvents = 'none';
		const under = document.elementFromPoint(x, y);
		node.style.pointerEvents = previous;
		return under?.closest(current.dropSelector) ?? null;
	}

	function reset() {
		/*
		 * **`transform` 이 아니라 개별 속성을 비운다.**
		 * 아래 onPointerMove 의 주석과 같은 이유다.
		 */
		node.style.translate = '';
		node.style.scale = '';
		node.style.rotate = '';
		node.style.zIndex = '';
		node.removeAttribute('data-dragging');
		highlight(null);
		dragging = false;
		pointerId = null;
	}

	function onPointerDown(event: PointerEvent) {
		if (current.disabled || pointerId !== null) return;
		// 왼쪽 버튼 / 터치 / 펜만
		if (event.button !== 0) return;

		pointerId = event.pointerId;
		startX = event.clientX;
		startY = event.clientY;
		node.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (pointerId !== event.pointerId) return;

		const dx = event.clientX - startX;
		const dy = event.clientY - startY;

		if (!dragging) {
			if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
			dragging = true;
			node.setAttribute('data-dragging', 'true');
			node.style.zIndex = '50';
			current.onLift?.(current.value);
		}

		/*
		 * **`style.transform` 을 쓰면 안 된다.**
		 *
		 * 판의 조각(`.piece`)은 `transform: translate(-50%,-50%) rotate(var(--tilt))` 로
		 * **자리를 잡는다.** 여기서 transform 을 덮어쓰면 그 -50% 가 사라져서
		 * 집는 순간 조각이 제 크기의 절반(약 38px)만큼 오른쪽 아래로 튀고 기울기도 풀렸다.
		 * 대결과 복습 두 화면이 전부 이 경로였다.
		 *
		 * 개별 `translate`/`scale`/`rotate` 는 transform 바깥에서 합성되므로
		 * 자리 지정도 기울기도 살아남고, transform 기반 키프레임도 계속 돈다.
		 */
		node.style.translate = `${dx}px ${dy}px`;
		if (!reduced()) {
			node.style.scale = '1.12';
			node.style.rotate = '-3deg';
		}
		highlight(dropTargetAt(event.clientX, event.clientY));
	}

	function onPointerUp(event: PointerEvent) {
		if (pointerId !== event.pointerId) return;

		const wasDragging = dragging;
		const target = wasDragging ? dropTargetAt(event.clientX, event.clientY) : null;

		if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
		reset();
		current.onRelease?.();

		if (!wasDragging) return; // 안 움직였으면 원래 onclick 이 처리한다

		/*
		 * 드래그 뒤에도 브라우저가 click 을 한 번 더 쏜다.
		 * 막지 않으면 끌어다 놓은 조각이 **두 번** 들어간다.
		 */
		node.addEventListener('click', swallowClick, { capture: true, once: true });

		if (target) current.onDrop?.(current.value, target);
		// 놓을 자리가 아니면 아무 일도 없다 — 제자리로 돌아갈 뿐, 혼내지 않는다
	}

	function onPointerCancel(event: PointerEvent) {
		if (pointerId !== event.pointerId) return;
		reset();
		current.onRelease?.();
	}

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('pointermove', onPointerMove);
	node.addEventListener('pointerup', onPointerUp);
	node.addEventListener('pointercancel', onPointerCancel);

	return {
		update(next: DraggableOptions) {
			current = next;
		},
		destroy() {
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', onPointerUp);
			node.removeEventListener('pointercancel', onPointerCancel);
			highlight(null);
		}
	};
}
