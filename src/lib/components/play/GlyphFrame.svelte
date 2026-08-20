<script lang="ts">
	import type { FusionLayout } from '$lib/game/fusion';

	interface Props {
		/** 부품이 놓이는 방식 */
		layout: FusionLayout;
		/** 각 자리에 놓인 부품 (없으면 null) */
		values: (string | null)[];
		/** 자리를 비운다 */
		onRemove?: (index: number) => void;
		/** 흔들기 트리거 (값이 바뀔 때마다 한 번 흔들린다) */
		shake?: number;
		size?: number;
		/** 자리 참조를 밖으로 넘긴다 (합쳐지는 연출에 쓴다) */
		slots?: (HTMLElement | null)[];
	}

	let { layout, values, onRemove, shake = 0, size = 132, slots = $bindable([]) }: Props = $props();
</script>

<!--
	글자 틀 — 부품을 놓는 자리.

	**`[ ] + [ ]` 를 버린 이유.**
	그건 수식의 기하학이지 한자의 기하학이 아니다. 明은 日과 月이 좌우로 붙은 것이고,
	間은 門이 日을 감싼 것이다. `+` 기호를 두는 순간 아이는 산수 문제를 보게 된다.

	그래서 자리를 **하나의 네모 칸(원고지 칸) 안에** 실제 모양대로 나눈다.
	칸을 보는 것만으로 "아, 왼쪽 오른쪽으로 붙는 글자구나" 를 알 수 있어야 하고,
	그게 설명 문장 하나를 지운다.
-->
<div
	class="frame"
	class:shake={shake > 0}
	data-shake={shake}
	data-layout={layout}
	style="--frame:{size}px"
>
	{#each values as value, i (i)}
		{#if value}
			<button
				type="button"
				class="cell filled hanja"
				bind:this={slots[i]}
				data-cell={i}
				onclick={() => onRemove?.(i)}
				aria-label="{value} 빼기"
			>
				{value}
			</button>
		{:else}
			<span class="cell empty" data-cell={i} aria-hidden="true"></span>
		{/if}
	{/each}
</div>

<style>
	.frame {
		position: relative;
		width: var(--frame);
		height: var(--frame);
		border-radius: var(--radius-button);
		/* 원고지 칸. 아이가 한자를 쓰던 그 네모다 */
		background: rgb(255 255 255 / 0.55);
		box-shadow: inset 0 0 0 3px var(--color-magic-200);
	}

	.cell {
		display: grid;
		place-items: center;
		border: 0;
		background: none;
		color: var(--color-magic-800);
		font-size: calc(var(--frame) * 0.42);
		line-height: 1;
		transition:
			background 0.15s ease,
			box-shadow 0.15s ease;
	}

	.cell.filled {
		cursor: pointer;
	}

	/* 비어 있는 자리를 점선으로 — 여기에 놓으면 된다는 유일한 안내 */
	.cell.empty {
		border-radius: calc(var(--radius-button) - 4px);
		background:
			repeating-linear-gradient(45deg, rgb(124 92 255 / 0.06) 0 6px, transparent 6px 12px),
			rgb(255 255 255 / 0.4);
		box-shadow: inset 0 0 0 2px var(--color-magic-200);
	}

	/*
	 * 끌어온 조각이 이 자리 위에 있을 때 — 놓을 곳이 눈에 보여야 한다.
	 * 이 속성은 draggable 액션이 런타임에 붙이므로 Svelte 가 마크업에서 못 본다.
	 */
	:global(.cell[data-drop-hover]) {
		background: rgb(255 209 102 / 0.35);
		box-shadow: inset 0 0 0 3px var(--color-gold-400);
	}

	/* ── 좌우로 붙는 글자: 明 林 好 淸 … ── */
	.frame[data-layout='lr'] {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3px;
		padding: 3px;
	}

	/* ── 위아래로 쌓이는 글자: 星 天 泉 看 … ── */
	.frame[data-layout='tb'] {
		display: grid;
		grid-template-rows: 1fr 1fr;
		gap: 3px;
		padding: 3px;
	}

	/*
	 * ── 감싸는 글자: 問 聞 間 ──
	 * 門이 밖을 두르고 안쪽에 다른 부품이 들어간다.
	 * 칸이 실제로 "뚫려 있는" 모양이라 설명이 필요 없다.
	 */
	.frame[data-layout='enclose'] {
		display: block;
		padding: 3px;
	}

	.frame[data-layout='enclose'] .cell:first-child {
		width: 100%;
		height: 100%;
	}

	.frame[data-layout='enclose'] .cell:last-child {
		position: absolute;
		top: 38%;
		left: 26%;
		width: 48%;
		height: 46%;
		font-size: calc(var(--frame) * 0.26);
	}

	/*
	 * ── 획으로 표시하는 글자: 本 ──
	 * 두 번째 자리는 글자가 아니라 **획 하나**다. 그래서 칸이 납작하다.
	 */
	.frame[data-layout='mark'] {
		display: grid;
		grid-template-rows: 1fr 0.28fr;
		gap: 3px;
		padding: 3px;
	}

	.frame[data-layout='mark'] .cell:last-child {
		font-size: calc(var(--frame) * 0.24);
	}

	.shake {
		animation: frame-shake 0.32s ease;
	}

	@keyframes frame-shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-7px);
		}
		75% {
			transform: translateX(7px);
		}
	}
</style>
