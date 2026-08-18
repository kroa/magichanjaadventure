<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		selected?: boolean;
		disabled?: boolean;
		/** 잠긴 지역/한자 표시 */
		locked?: boolean;
		onclick?: () => void;
		class?: string;
		children: Snippet;
	}

	let {
		selected = false,
		disabled = false,
		locked = false,
		onclick,
		class: className = '',
		children
	}: Props = $props();
</script>

<button
	type="button"
	class="chip rounded-full px-4 font-display {className}"
	class:selected
	{disabled}
	aria-pressed={selected}
	{onclick}
>
	{#if locked}<span aria-hidden="true">🔒</span>{/if}
	{@render children()}
</button>

<style>
	.chip {
		/* 터치 타깃 하한선 */
		min-height: var(--tap-min);
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		border: 2px solid var(--color-magic-200);
		background: rgb(255 255 255 / 0.85);
		color: var(--color-ink-700);
		cursor: pointer;
		transition:
			transform 0.15s var(--ease-pop),
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.chip:hover:not(:disabled) {
		transform: translateY(-2px);
		border-color: var(--color-magic-400);
	}

	.chip.selected {
		background: var(--gradient-magic);
		border-color: var(--color-magic-700);
		color: #fff;
		box-shadow: var(--shadow-glow-magic);
	}

	.chip:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
</style>
