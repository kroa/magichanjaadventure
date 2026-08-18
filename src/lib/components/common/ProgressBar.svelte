<script lang="ts">
	import type { Tone } from '$lib/types/ui';

	interface Props {
		value: number;
		max?: number;
		tone?: Tone;
		size?: 'sm' | 'md' | 'lg';
		/** 막대 안에 "120 / 260" 표시 */
		showValue?: boolean;
		/** 접근성 이름. 시각적으로는 숨는다 */
		label: string;
		/** 값이 변할 때 부드럽게 이동 */
		animated?: boolean;
		class?: string;
	}

	let {
		value,
		max = 100,
		tone = 'gold',
		size = 'md',
		showValue = false,
		label,
		animated = true,
		class: className = ''
	}: Props = $props();

	const safeMax = $derived(max > 0 ? max : 1);
	const clamped = $derived(Math.min(safeMax, Math.max(0, value)));
	const percent = $derived((clamped / safeMax) * 100);

	const FILLS: Record<Tone, string> = {
		magic: 'var(--gradient-magic)',
		gold: 'var(--gradient-gold)',
		mint: 'var(--gradient-mint)',
		candy: 'var(--gradient-candy)',
		ember: 'linear-gradient(135deg,#ff8b8b,#e85252)',
		sky: 'linear-gradient(135deg,#83d6ff,#22abee)'
	};

	const HEIGHTS = { sm: 'h-2.5', md: 'h-4', lg: 'h-6' };
</script>

<div
	class="track relative w-full overflow-hidden rounded-full {HEIGHTS[size]} {className}"
	role="progressbar"
	aria-valuenow={clamped}
	aria-valuemin={0}
	aria-valuemax={safeMax}
	aria-label={label}
>
	<div
		class="fill h-full rounded-full"
		class:animated
		style="width:{percent}%; --fill:{FILLS[tone]}"
	>
		<span class="shine" aria-hidden="true"></span>
	</div>

	{#if showValue && size === 'lg'}
		<span class="value font-display" aria-hidden="true">{clamped} / {safeMax}</span>
	{/if}
</div>

<style>
	.track {
		background: rgb(60 40 120 / 0.13);
		box-shadow: inset 0 2px 4px rgb(60 40 120 / 0.16);
	}

	.fill {
		background: var(--fill);
		position: relative;
		overflow: hidden;
		min-width: 0;
	}

	.fill.animated {
		transition: width 0.6s var(--ease-soft);
	}

	/* 막대 위를 훑고 지나가는 광택 — "차오르는 중"이라는 느낌을 준다 */
	.shine {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			100deg,
			transparent 20%,
			rgb(255 255 255 / 0.55) 50%,
			transparent 80%
		);
		transform: translateX(-100%);
		animation: progress-shine 2.6s ease-in-out infinite;
	}

	.value {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-size: 0.8rem;
		color: var(--color-ink-900);
		text-shadow: 0 1px 0 rgb(255 255 255 / 0.7);
	}

	@keyframes progress-shine {
		0% {
			transform: translateX(-100%);
		}
		60%,
		100% {
			transform: translateX(200%);
		}
	}
</style>
