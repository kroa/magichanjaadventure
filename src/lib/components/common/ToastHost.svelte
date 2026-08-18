<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { Tone } from '$lib/types/ui';

	/** 앱 어디서든 하나만 마운트한다 (AppShell 이 담당). */

	const SKINS: Record<Tone, string> = {
		magic: 'bg-magic-500 text-white',
		gold: 'bg-gold-500 text-ink-900',
		mint: 'bg-mint-500 text-white',
		candy: 'bg-candy-500 text-white',
		ember: 'bg-ember-500 text-white',
		sky: 'bg-sky-500 text-white'
	};
</script>

<!-- 화면 낭독기가 변화를 알리도록 live region 으로 둔다 -->
<div class="toast-host" role="status" aria-live="polite" data-testid="toast-host">
	{#each toasts.items as toast (toast.id)}
		<div
			class="toast flex items-center gap-3 rounded-button px-5 py-3.5 font-display shadow-float {SKINS[
				toast.tone
			]}"
			animate:flip={{ duration: 220 }}
			in:scale={{ start: 0.85, duration: 260 }}
			out:fly={{ y: -12, duration: 180 }}
		>
			{#if toast.icon}
				<span class="text-xl" aria-hidden="true">{toast.icon}</span>
			{/if}
			<span>{toast.message}</span>
		</div>
	{/each}
</div>

<style>
	.toast-host {
		position: fixed;
		top: max(1rem, env(safe-area-inset-top));
		left: 50%;
		transform: translateX(-50%);
		z-index: 60;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		width: max-content;
		max-width: calc(100vw - 2rem);
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
	}
</style>
