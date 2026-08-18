<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { ButtonVariant, Size } from '$lib/types/ui';

	interface Props extends Omit<HTMLButtonAttributes, 'class'> {
		variant?: ButtonVariant;
		size?: Size;
		/** 주면 <a> 로 렌더한다 */
		href?: string;
		loading?: boolean;
		fullWidth?: boolean;
		/** 텍스트 앞에 붙는 이모지/아이콘 */
		icon?: Snippet;
		class?: string;
		children: Snippet;
	}

	let {
		variant = 'magic',
		size = 'md',
		href,
		loading = false,
		fullWidth = false,
		disabled = false,
		type = 'button',
		icon,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const isDisabled = $derived(disabled || loading);

	/**
	 * 버튼 아래쪽의 진한 테두리(edge)가 "물리적으로 눌리는" 느낌을 만든다.
	 * 이 디테일 하나가 웹 버튼과 게임 버튼을 가른다.
	 */
	const SKINS: Record<ButtonVariant, string> = {
		magic: '--bg:var(--gradient-magic); --edge:var(--color-magic-700); --fg:#fff;',
		gold: '--bg:var(--gradient-gold); --edge:var(--color-gold-700); --fg:var(--color-ink-900);',
		mint: '--bg:var(--gradient-mint); --edge:var(--color-mint-700); --fg:#fff;',
		candy: '--bg:var(--gradient-candy); --edge:var(--color-candy-600); --fg:#fff;',
		ember: '--bg:linear-gradient(135deg,#ff8b8b,#e85252); --edge:#c33f3f; --fg:#fff;',
		sky: '--bg:linear-gradient(135deg,#83d6ff,#22abee); --edge:var(--color-sky-700); --fg:#fff;',
		ghost: '--bg:rgb(255 255 255 / .8); --edge:var(--color-magic-200); --fg:var(--color-ink-700);'
	};

	const SIZES: Record<Size, string> = {
		sm: 'h-12 px-5 text-base',
		md: 'h-14 px-7 text-lg',
		lg: 'h-16 px-9 text-xl'
	};

	const classes = $derived(
		[
			'game-btn btn-3d font-display inline-flex items-center justify-center gap-2',
			'rounded-button select-none whitespace-nowrap',
			SIZES[size],
			fullWidth ? 'w-full' : '',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#if href}
	<a
		{href}
		class={classes}
		style={SKINS[variant]}
		aria-disabled={isDisabled || undefined}
		tabindex={isDisabled ? -1 : undefined}
		data-loading={loading || undefined}
	>
		{#if loading}
			<span class="spinner" aria-hidden="true"></span>
		{:else if icon}
			{@render icon()}
		{/if}
		{@render children()}
	</a>
{:else}
	<button
		{type}
		class={classes}
		style={SKINS[variant]}
		disabled={isDisabled}
		data-loading={loading || undefined}
		{...rest}
	>
		{#if loading}
			<span class="spinner" aria-hidden="true"></span>
			<span class="sr-only">잠시만요</span>
		{:else if icon}
			{@render icon()}
		{/if}
		{@render children()}
	</button>
{/if}

<style>
	.game-btn {
		background: var(--bg);
		color: var(--fg);
		border: none;
		box-shadow:
			0 6px 0 var(--edge),
			0 10px 20px rgb(60 40 120 / 0.18);
		text-decoration: none;
		cursor: pointer;
		--btn-press: 4px;
	}

	.game-btn:hover:not(:disabled):not([aria-disabled='true']) {
		transform: translateY(-2px);
		box-shadow:
			0 8px 0 var(--edge),
			0 14px 26px rgb(60 40 120 / 0.22);
		filter: brightness(1.04);
	}

	.game-btn:active:not(:disabled):not([aria-disabled='true']) {
		box-shadow:
			0 2px 0 var(--edge),
			0 4px 10px rgb(60 40 120 / 0.18);
	}

	.game-btn:disabled,
	.game-btn[aria-disabled='true'] {
		cursor: not-allowed;
		filter: grayscale(0.55);
		opacity: 0.6;
		box-shadow: 0 4px 0 var(--edge);
	}

	.spinner {
		width: 1.1em;
		height: 1.1em;
		border: 3px solid currentColor;
		border-top-color: transparent;
		border-radius: 9999px;
		animation: btn-spin 0.7s linear infinite;
	}

	@keyframes btn-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
