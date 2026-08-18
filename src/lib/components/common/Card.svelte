<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Tone } from '$lib/types/ui';

	interface Props {
		/** 왼쪽에 얇은 색 띠를 넣어 종류를 구분한다 */
		tone?: Tone | null;
		/** 유리 패널 느낌 */
		glass?: boolean;
		/** hover 시 살짝 떠오른다 (클릭 가능한 카드) */
		interactive?: boolean;
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children: Snippet;
	}

	let {
		tone = null,
		glass = false,
		interactive = false,
		padding = 'md',
		class: className = '',
		children
	}: Props = $props();

	const PADS = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };

	const ACCENTS: Record<Tone, string> = {
		magic: 'var(--color-magic-400)',
		gold: 'var(--color-gold-500)',
		mint: 'var(--color-mint-500)',
		candy: 'var(--color-candy-500)',
		ember: 'var(--color-ember-500)',
		sky: 'var(--color-sky-400)'
	};
</script>

<div
	class="card relative overflow-hidden rounded-card shadow-card {glass
		? 'glass'
		: 'bg-white'} {PADS[padding]} {interactive ? 'card--interactive' : ''} {className}"
	style={tone ? `--accent:${ACCENTS[tone]}` : ''}
>
	{#if tone}
		<span class="accent" aria-hidden="true"></span>
	{/if}
	{@render children()}
</div>

<style>
	.card {
		transition:
			transform 0.2s var(--ease-pop),
			box-shadow 0.2s var(--ease-pop);
	}

	.card--interactive:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-float);
	}

	.accent {
		position: absolute;
		inset: 0 auto 0 0;
		width: 6px;
		background: var(--accent);
	}
</style>
