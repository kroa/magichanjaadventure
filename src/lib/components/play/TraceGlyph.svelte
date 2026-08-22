<script lang="ts">
	import { PICTOGRAPHS } from '$lib/art/pictographs';
	import { sound } from '$lib/sound/index.svelte';

	interface Props {
		character: string;
		size?: number;
		/**
		 * 지역의 흙 재질. 새싹 마을은 갈색 흙, 시냇가는 모래, 동굴은 돌빛이다.
		 * 이름이 `soil` 이 아닌 이유: 아래 캔버스 그라디언트 지역변수와 `.soil` CSS 클래스가 이미 있다.
		 */
		texture?: { top: string; bottom: string; grit: string };
		/** 지역 대표색 — 칸 테두리에 쓴다 */
		accent?: string;
		/** 다 파내면 한 번 부른다 */
		oncomplete?: () => void;
	}

	let {
		character,
		size = 200,
		texture = { top: '#B08356', bottom: '#8A5A28', grit: '#D9B382' },
		accent = 'var(--color-gold-400)',
		oncomplete
	}: Props = $props();

	const picture = $derived(PICTOGRAPHS[character]);

	let canvas = $state<HTMLCanvasElement | null>(null);
	let progress = $state(0);
	let digging = $state(false);
	let finished = $state(false);
	let sparks = $state<{ id: number; x: number; y: number }[]>([]);

	let sparkId = 0;
	let sinceCheck = 0;
	let lastSound = 0;

	/**
	 * 이만큼 걷어내면 다 찾은 것으로 본다.
	 *
	 * 처음에 절반(0.52)으로 잡았더니 **너무 오래 문질러야 했다.**
	 * 글자가 이미 다 보이는데도 구석의 흙이 남아 안 끝나는 일이 잦다 —
	 * 그때부터는 배우는 게 아니라 노동이다. 가운데만 훑어도 끝나도록 낮췄다.
	 */
	const CLEARED = 0.26;
	/** 붓 굵기 — 아이 손가락은 굵다 */
	const BRUSH = 32;

	/*
	 * **발굴**.
	 *
	 * 예전에는 손가락을 굴리면 글자가 위에서부터 차오르기만 했다. 조작은 있었지만
	 * 아이가 하는 일은 "게이지 채우기" 였고, 어디를 문지르든 똑같이 찼다.
	 *
	 * 지금은 흙에 묻힌 글자를 **문지른 자리만** 파낸다. 손이 지나간 곳이 드러나므로
	 * 아이가 자기 손으로 찾아낸 것이 된다. 탐험대라는 이름과도 맞는다.
	 */
	function paintDirt(
		char: string,
		box: number,
		tex: { top: string; bottom: string; grit: string }
	) {
		const el = canvas;
		if (!el) return;
		const ctx = el.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		el.width = box * dpr;
		el.height = box * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		ctx.globalCompositeOperation = 'source-over';
		// 지역마다 다른 땅을 판다 — 같은 흙만 계속 나오면 어디를 가도 같은 곳이다
		const base = ctx.createLinearGradient(0, 0, 0, box);
		base.addColorStop(0, tex.top);
		base.addColorStop(1, tex.bottom);
		ctx.fillStyle = base;
		ctx.fillRect(0, 0, box, box);

		/*
		 * 흙 알갱이.
		 *
		 * 글자를 씨앗으로 삼아 알갱이를 흩는다 — 한자마다 흙 무늬가 조금씩 달라서
		 * 같은 자리를 또 파는 느낌이 덜하다. Math.random 은 쓰지 않는다.
		 * 서버와 화면이 어긋나기 때문이다 (SkyBackground 와 같은 이유다).
		 */
		const grit = char.codePointAt(0) ?? 0;
		ctx.fillStyle = 'rgba(255,255,255,0.14)';
		for (let i = 0; i < 90; i++) {
			const x = ((i * 73 + grit) % 100) * (box / 100);
			const y = ((i * 137 + grit * 7) % 100) * (box / 100);
			ctx.beginPath();
			ctx.arc(x, y, ((i % 3) + 1) * 0.9, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	/** 얼마나 걷어냈는지 — 픽셀을 듬성듬성 훑는다 (매번 다 세면 느리다) */
	function measure(ctx: CanvasRenderingContext2D, el: HTMLCanvasElement) {
		const data = ctx.getImageData(0, 0, el.width, el.height).data;
		let clear = 0;
		let total = 0;
		for (let i = 3; i < data.length; i += 4 * 40) {
			total += 1;
			if (data[i] < 40) clear += 1;
		}
		progress = total ? clear / total : 0;
		if (progress >= CLEARED && !finished) {
			finished = true;
			oncomplete?.();
		}
	}

	function dig(clientX: number, clientY: number) {
		const el = canvas;
		if (!el || finished) return;
		const ctx = el.getContext('2d');
		if (!ctx) return;

		const box = el.getBoundingClientRect();
		const x = clientX - box.left;
		const y = clientY - box.top;

		ctx.globalCompositeOperation = 'destination-out';
		ctx.beginPath();
		ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
		ctx.fill();

		// 흙먼지가 튄다
		sparkId += 1;
		const id = sparkId;
		sparks = [...sparks.slice(-5), { id, x, y }];
		setTimeout(() => (sparks = sparks.filter((s) => s.id !== id)), 420);

		const now = Date.now();
		if (now - lastSound > 140) {
			lastSound = now;
			sound.play('click');
		}

		sinceCheck += 1;
		if (sinceCheck < 6) return;
		sinceCheck = 0;
		measure(ctx, el);
	}

	function down(event: PointerEvent) {
		if (finished) return;
		digging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dig(event.clientX, event.clientY);
	}

	function move(event: PointerEvent) {
		if (!digging) return;
		dig(event.clientX, event.clientY);
	}

	function up() {
		digging = false;
	}

	$effect(() => {
		// 다른 한자로 넘어가면 흙을 새로 덮는다 — 두 값을 인자로 넘겨야 의존성이 잡힌다
		finished = false;
		progress = 0;
		sinceCheck = 0;
		paintDirt(character, size, texture);
	});
</script>

<!--
	한자 발굴 — 흙에 묻힌 글자를 **문질러 파낸다.**

	예전 배우기 화면은 카드에 적힌 뜻·음·획수·설명을 읽고 버튼을 누르는 것이 전부였다.
	그걸 "문지르면 차오르는 게이지" 로 바꿨더니 조작은 생겼지만 여전히 밋밋했다 —
	어디를 문지르든 똑같이 찼기 때문이다.

	지금은 **손이 지나간 자리만** 드러난다. 아이가 자기 손으로 찾아낸 것이 되고,
	그림이 있는 글자는 파낼수록 그림이 옅어지며 글자로 바뀐다.
-->
<div
	class="dig"
	class:done={finished}
	style="--box:{size}px; --accent:{accent}; --grit:{texture.grit}"
>
	{#if picture}
		<svg
			class="picture"
			viewBox="0 0 100 100"
			style="opacity:{Math.max(0, 1 - progress / CLEARED)}"
			aria-hidden="true"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- 우리가 직접 쓴 도형이다 -->
			{@html picture.svg}
		</svg>
	{/if}

	<span class="hanja glyph" aria-hidden="true">{character}</span>

	<canvas
		bind:this={canvas}
		class="soil"
		style="width:{size}px; height:{size}px"
		role="button"
		tabindex="0"
		aria-label="{character} 파내기"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onkeydown={(e) => {
			// 키보드로도 끝까지 갈 수 있어야 한다
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				finished = true;
				progress = 1;
				oncomplete?.();
			}
		}}
		data-testid="trace-glyph"
		data-progress={Math.round(progress * 100)}
	></canvas>

	{#each sparks as spark (spark.id)}
		<span class="spark" style="left:{spark.x}px; top:{spark.y}px" aria-hidden="true"></span>
	{/each}

	{#if !finished}
		<span class="nudge" aria-hidden="true">👆</span>
	{/if}
</div>

<style>
	.dig {
		position: relative;
		width: var(--box);
		height: var(--box);
		border-radius: var(--radius-panel);
		background: rgb(255 255 255 / 0.85);
		box-shadow:
			inset 0 0 0 4px var(--accent, var(--color-gold-400)),
			0 10px 24px rgb(20 12 45 / 0.35);
		overflow: hidden;
	}

	.picture,
	.glyph {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	.picture {
		padding: 12%;
		transition: opacity 0.15s linear;
	}

	.glyph {
		font-size: calc(var(--box) * 0.62);
		line-height: 1;
		color: var(--color-magic-800);
	}

	/* 흙 — 이 위를 문지르면 아래가 드러난다 */
	.soil {
		position: absolute;
		inset: 0;
		cursor: grab;
		/* 파는 동안 화면이 같이 스크롤되면 손가락이 미끄러진다 */
		touch-action: none;
	}

	.soil:active {
		cursor: grabbing;
	}

	/* 다 파내면 흙이 사라지고 글자가 한 번 튄다 */
	.dig.done .soil {
		opacity: 0;
		transition: opacity 0.35s ease;
		pointer-events: none;
	}

	.dig.done .glyph {
		animation: glyph-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes glyph-pop {
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

	/* 튀는 흙먼지 */
	.spark {
		position: absolute;
		width: 8px;
		height: 8px;
		border-radius: 9999px;
		background: var(--grit, #d9b382);
		transform: translate(-50%, -50%);
		pointer-events: none;
		animation: spark-fly 0.42s ease-out forwards;
	}

	@keyframes spark-fly {
		to {
			transform: translate(-50%, -230%) scale(0.2);
			opacity: 0;
		}
	}

	/* 뭘 해야 하는지 모를 때를 위한 손짓 */
	.nudge {
		position: absolute;
		right: 10%;
		bottom: 8%;
		font-size: 1.7rem;
		pointer-events: none;
		animation: nudge-rub 1.6s ease-in-out infinite;
	}

	@keyframes nudge-rub {
		0%,
		100% {
			transform: translate(0, 0) rotate(-10deg);
		}
		50% {
			transform: translate(-26px, -10px) rotate(10deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nudge,
		.spark,
		.dig.done .glyph {
			animation: none;
		}
	}
</style>
