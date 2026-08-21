<script lang="ts">
	import { PICTOGRAPHS } from '$lib/art/pictographs';

	interface Props {
		/** 몇 개를 띄울지 */
		count?: number;
		class?: string;
	}

	let { count = 9, class: className = '' }: Props = $props();

	/*
	 * 고정 자리 — Math.random() 은 서버와 화면이 어긋난다 (SkyBackground 와 같은 이유).
	 * 좌우 가장자리 쪽에 몰아 두어 가운데 폼을 방해하지 않게 한다.
	 */
	const SPOTS = [
		{ x: 6, y: 12, size: 68, dur: 26, delay: 0, tilt: -12 },
		{ x: 84, y: 8, size: 52, dur: 32, delay: -6, tilt: 9 },
		{ x: 14, y: 62, size: 44, dur: 29, delay: -14, tilt: 14 },
		{ x: 88, y: 48, size: 60, dur: 35, delay: -3, tilt: -8 },
		{ x: 3, y: 38, size: 40, dur: 24, delay: -19, tilt: 6 },
		{ x: 76, y: 76, size: 48, dur: 31, delay: -9, tilt: -15 },
		{ x: 22, y: 86, size: 38, dur: 27, delay: -22, tilt: 11 },
		{ x: 94, y: 26, size: 34, dur: 38, delay: -16, tilt: -6 },
		{ x: 44, y: 4, size: 42, dur: 33, delay: -27, tilt: 7 }
	];

	/** 그림이 있는 부품 중에서 고르게 뽑는다 */
	const CHARS = Object.keys(PICTOGRAPHS);
	const items = $derived(
		SPOTS.slice(0, count).map((spot, i) => ({
			...spot,
			svg: PICTOGRAPHS[CHARS[(i * 3 + 1) % CHARS.length]].svg
		}))
	);
</script>

<!--
	떠다니는 그림 한자.

	배경을 구름만으로 채우면 이 앱이 무엇을 하는 곳인지 첫 화면에서 알 수 없다.
	해·달·나무·물… 이 천천히 떠다니면 **글자 한 줄 없이** "여기는 한자가 사는 곳" 이 된다.
	게임 안에서 아이가 만지게 될 바로 그 그림들이라 예고편 노릇도 한다.

	장식이므로 화면 읽기에서 제외하고, 손가락을 받지 않는다.
-->
<div class="floating {className}" aria-hidden="true">
	{#each items as item, i (i)}
		<span
			class="glyph"
			style="
				--x:{item.x}%; --y:{item.y}%; --size:{item.size}px;
				--dur:{item.dur}s; --delay:{item.delay}s; --tilt:{item.tilt}deg;
			"
		>
			<svg viewBox="0 0 100 100">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- 우리가 직접 쓴 도형이다 -->
				{@html item.svg}
			</svg>
		</span>
	{/each}
</div>

<style>
	.floating {
		position: absolute;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		pointer-events: none;
	}

	.glyph {
		position: absolute;
		left: var(--x);
		top: var(--y);
		width: var(--size);
		height: var(--size);
		opacity: 0.22;
		animation: glyph-drift var(--dur) ease-in-out var(--delay) infinite;
	}

	.glyph svg {
		width: 100%;
		height: 100%;
	}

	@keyframes glyph-drift {
		0%,
		100% {
			transform: translateY(0) rotate(var(--tilt)) scale(1);
		}
		50% {
			transform: translateY(-22px) rotate(calc(var(--tilt) * -1)) scale(1.08);
		}
	}

	/* 움직임을 줄이도록 설정한 사용자에게는 가만히 떠 있기만 한다 */
	@media (prefers-reduced-motion: reduce) {
		.glyph {
			animation: none;
		}
	}
</style>
