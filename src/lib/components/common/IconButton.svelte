<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { Tone } from '$lib/types/ui';

	interface Props extends Omit<HTMLButtonAttributes, 'class'> {
		/** 아이콘만 있으므로 접근성 이름이 필수다 */
		label: string;
		tone?: Tone | 'ghost';
		size?: 'md' | 'lg';
		href?: string;
		class?: string;
		children: Snippet;
	}

	let {
		label,
		tone = 'ghost',
		size = 'md',
		href,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const SKINS: Record<string, string> = {
		magic: '--bg:var(--gradient-magic); --edge:var(--color-magic-700); --fg:#fff;',
		gold: '--bg:var(--gradient-gold); --edge:var(--color-gold-700); --fg:var(--color-ink-900);',
		mint: '--bg:var(--gradient-mint); --edge:var(--color-mint-700); --fg:#fff;',
		candy: '--bg:var(--gradient-candy); --edge:var(--color-candy-600); --fg:#fff;',
		ember: '--bg:linear-gradient(135deg,#ff8b8b,#e85252); --edge:#c33f3f; --fg:#fff;',
		sky: '--bg:linear-gradient(135deg,#83d6ff,#22abee); --edge:var(--color-sky-700); --fg:#fff;',
		ghost: '--bg:rgb(255 255 255 / .85); --edge:var(--color-magic-200); --fg:var(--color-ink-700);'
	};

	/* 아이 손가락 기준으로 md 도 48px 아래로 내려가지 않는다 */
	const SIZES = { md: 'size-12 text-xl', lg: 'size-14 text-2xl' };

	const classes = $derived(
		`icon-btn btn-3d inline-grid place-items-center rounded-full ${SIZES[size]} ${className}`
	);
</script>

{#if href}
	<a {href} class={classes} style={SKINS[tone]} aria-label={label}>
		{@render children()}
	</a>
{:else}
	<button type="button" class={classes} style={SKINS[tone]} aria-label={label} {...rest}>
		{@render children()}
	</button>
{/if}

<style>
	.icon-btn {
		background: var(--bg);
		color: var(--fg);
		border: none;
		cursor: pointer;
		text-decoration: none;
		box-shadow:
			0 4px 0 var(--edge),
			0 8px 16px rgb(60 40 120 / 0.16);
		--btn-press: 3px;
	}

	.icon-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		filter: brightness(1.05);
	}

	.icon-btn:active:not(:disabled) {
		box-shadow:
			0 1px 0 var(--edge),
			0 3px 8px rgb(60 40 120 / 0.16);
	}

	.icon-btn:disabled {
		cursor: not-allowed;
		opacity: 0.55;
		filter: grayscale(0.5);
	}
</style>
