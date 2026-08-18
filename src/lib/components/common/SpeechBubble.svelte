<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Tone } from '$lib/types/ui';

	interface Props {
		/** 꼬리가 가리키는 방향 */
		tail?: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'left' | 'none';
		tone?: Tone | 'white';
		class?: string;
		children: Snippet;
	}

	let { tail = 'bottom-left', tone = 'white', class: className = '', children }: Props = $props();

	const BG: Record<string, string> = {
		white: '#ffffff',
		magic: 'var(--color-magic-50)',
		gold: 'var(--color-gold-100)',
		mint: 'var(--color-mint-100)',
		candy: 'var(--color-candy-100)',
		ember: 'var(--color-ember-100)',
		sky: 'var(--color-sky-50)'
	};
</script>

<div
	class="bubble relative rounded-card px-5 py-4 shadow-card {className}"
	style="--bubble-bg:{BG[tone]}"
	data-tail={tail}
>
	{@render children()}
	{#if tail !== 'none'}
		<span class="tail" aria-hidden="true"></span>
	{/if}
</div>

<style>
	.bubble {
		background: var(--bubble-bg);
		color: var(--color-ink-900);
	}

	.tail {
		position: absolute;
		width: 0;
		height: 0;
		border: 12px solid transparent;
	}

	/* 꼬리는 말풍선과 같은 색이어야 이어져 보인다 */
	.bubble[data-tail^='bottom'] .tail {
		top: 100%;
		border-top-color: var(--bubble-bg);
		border-bottom-width: 0;
		filter: drop-shadow(0 6px 4px rgb(60 40 120 / 0.1));
	}
	.bubble[data-tail='bottom-left'] .tail {
		left: 28px;
	}
	.bubble[data-tail='bottom-center'] .tail {
		left: 50%;
		transform: translateX(-50%);
	}
	.bubble[data-tail='bottom-right'] .tail {
		right: 28px;
	}

	.bubble[data-tail='left'] .tail {
		right: 100%;
		top: 24px;
		border-right-color: var(--bubble-bg);
		border-left-width: 0;
	}
</style>
