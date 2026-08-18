<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Tone } from '$lib/types/ui';

	interface Props {
		tone?: Tone;
		/** solid = 꽉 찬 색, soft = 옅은 배경 */
		fill?: 'solid' | 'soft';
		size?: 'sm' | 'md';
		class?: string;
		children: Snippet;
	}

	let {
		tone = 'magic',
		fill = 'soft',
		size = 'md',
		class: className = '',
		children
	}: Props = $props();

	const SOFT: Record<Tone, string> = {
		magic: 'bg-magic-100 text-magic-700',
		gold: 'bg-gold-100 text-gold-700',
		mint: 'bg-mint-100 text-mint-700',
		candy: 'bg-candy-100 text-candy-600',
		ember: 'bg-ember-100 text-ember-600',
		sky: 'bg-sky-100 text-sky-700'
	};

	const SOLID: Record<Tone, string> = {
		magic: 'bg-magic-500 text-white',
		gold: 'bg-gold-500 text-ink-900',
		mint: 'bg-mint-500 text-white',
		candy: 'bg-candy-500 text-white',
		ember: 'bg-ember-500 text-white',
		sky: 'bg-sky-500 text-white'
	};

	const SIZES = { sm: 'text-xs px-2.5 py-1', md: 'text-sm px-3 py-1.5' };
</script>

<span
	class="inline-flex items-center gap-1 rounded-full font-display leading-none
	       {fill === 'solid' ? SOLID[tone] : SOFT[tone]} {SIZES[size]} {className}"
>
	{@render children()}
</span>
