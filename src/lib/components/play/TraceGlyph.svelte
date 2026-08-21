<script lang="ts">
	import { PICTOGRAPHS } from '$lib/art/pictographs';

	interface Props {
		character: string;
		size?: number;
		/** 다 쓰면 한 번 부른다 */
		oncomplete?: () => void;
	}

	let { character, size = 200, oncomplete }: Props = $props();

	const picture = $derived(PICTOGRAPHS[character]);

	let progress = $state(0);
	let tracing = $state(false);
	let finished = $state(false);
	let lastX = 0;
	let lastY = 0;

	/** 이만큼 손가락이 움직이면 글자가 다 채워진다 */
	const target = $derived(size * 2.4);
	let travelled = $state(0);

	/*
	 * 글자가 **위에서부터** 차오른다.
	 * 한자를 쓰는 순서가 대체로 위에서 아래라, 채워지는 방향만으로도 손이 그 리듬을 배운다.
	 */
	const clip = $derived(`inset(${Math.round((1 - progress) * 100)}% 0 0 0)`);

	function advance(by: number) {
		if (finished) return;
		travelled = Math.min(target, travelled + by);
		progress = travelled / target;
		if (progress >= 1) {
			finished = true;
			oncomplete?.();
		}
	}

	function onPointerDown(event: PointerEvent) {
		if (finished) return;
		tracing = true;
		lastX = event.clientX;
		lastY = event.clientY;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		// 톡 누르기만 해도 조금씩 차오른다 — 끌기가 서툰 아이도 끝까지 갈 수 있어야 한다
		advance(size * 0.35);
	}

	function onPointerMove(event: PointerEvent) {
		if (!tracing || finished) return;
		const dx = event.clientX - lastX;
		const dy = event.clientY - lastY;
		lastX = event.clientX;
		lastY = event.clientY;
		advance(Math.hypot(dx, dy));
	}

	function stop() {
		tracing = false;
	}

	$effect(() => {
		// 다른 한자로 넘어가면 처음부터 다시 쓴다
		character;
		travelled = 0;
		progress = 0;
		finished = false;
	});
</script>

<!--
	글자 쓰기 — 아이가 손으로 글자를 **나타나게** 한다.

	예전 배우기 화면은 카드에 적힌 뜻·음·획수·설명을 읽고 버튼을 누르는 것이 전부였다.
	그건 교재지 게임이 아니다. 여기서는 아이가 칸 위에 손가락을 굴리면
	글자가 위에서부터 차오르고, 그림이 있는 글자는 **그림이 글자로 변해 간다.**

	1000자 전부에 쓸 수 있다 — 글자별 획순 데이터 없이, 채워지는 방향만으로 성립한다.
-->
<div
	class="trace"
	class:done={finished}
	style="--box:{size}px"
	role="button"
	tabindex="0"
	aria-label="{character} 따라 쓰기"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={stop}
	onpointercancel={stop}
	onkeydown={(e) => {
		// 키보드로도 끝까지 갈 수 있어야 한다
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			advance(target);
		}
	}}
	data-testid="trace-glyph"
	data-progress={Math.round(progress * 100)}
>
	{#if picture}
		<!-- 그림이 글자로 변해 간다. 이 화면이 하는 일을 한마디로 보여 주는 장면이다 -->
		<svg class="picture" viewBox="0 0 100 100" style="opacity:{1 - progress}" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- 우리가 직접 쓴 도형이다 -->
			{@html picture.svg}
		</svg>
	{/if}

	<!-- 흐린 안내 글자. 어디를 채워야 하는지만 알려 준다 -->
	<span class="hanja guide" aria-hidden="true">{character}</span>

	<!-- 손가락을 따라 차오르는 진한 글자 -->
	<span class="hanja ink" style="clip-path:{clip}" aria-hidden="true">{character}</span>

	{#if !finished}
		<span class="nudge" aria-hidden="true">✍️</span>
	{/if}
</div>

<style>
	.trace {
		position: relative;
		display: grid;
		width: var(--box);
		height: var(--box);
		place-items: center;
		border-radius: var(--radius-panel);
		/* 원고지 칸 — 아이가 한자를 쓰던 그 네모 */
		background: rgb(255 255 255 / 0.7);
		box-shadow: inset 0 0 0 3px var(--color-magic-200);
		cursor: crosshair;
		/* 쓰는 동안 화면이 같이 스크롤되면 손가락이 미끄러진다 */
		touch-action: none;
		user-select: none;
	}

	/* 가운데 십자 안내선 */
	.trace::before,
	.trace::after {
		position: absolute;
		background: var(--color-magic-200);
		content: '';
		opacity: 0.5;
	}

	.trace::before {
		width: 100%;
		height: 2px;
	}

	.trace::after {
		width: 2px;
		height: 100%;
	}

	.picture,
	.guide,
	.ink {
		position: absolute;
		display: grid;
		width: 100%;
		height: 100%;
		place-items: center;
	}

	.picture {
		padding: 12%;
		transition: opacity 0.12s linear;
	}

	.guide,
	.ink {
		font-size: calc(var(--box) * 0.62);
		line-height: 1;
	}

	.guide {
		color: var(--color-magic-300);
		opacity: 0.28;
	}

	.ink {
		color: var(--color-magic-800);
		transition: clip-path 0.08s linear;
	}

	/* 다 쓰면 한 번 통 튄다 */
	.trace.done .ink {
		animation: ink-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.trace.done {
		box-shadow: inset 0 0 0 3px var(--color-gold-400);
		cursor: default;
	}

	@keyframes ink-pop {
		0% {
			transform: scale(1);
		}
		45% {
			transform: scale(1.14);
		}
		100% {
			transform: scale(1);
		}
	}

	/* 뭘 해야 하는지 모를 때를 위한 손짓. 글자가 아니라 몸짓으로 알린다 */
	.nudge {
		position: absolute;
		right: 8%;
		bottom: 6%;
		font-size: 1.5rem;
		animation: nudge-wave 1.8s ease-in-out infinite;
	}

	@keyframes nudge-wave {
		0%,
		100% {
			transform: translate(0, 0) rotate(-8deg);
		}
		50% {
			transform: translate(-14px, -6px) rotate(8deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nudge,
		.trace.done .ink {
			animation: none;
		}
	}
</style>
