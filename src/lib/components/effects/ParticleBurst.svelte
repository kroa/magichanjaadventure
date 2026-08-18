<script lang="ts">
	interface Props {
		/** 값이 바뀔 때마다 새로 터진다 (정답 횟수 등을 넘기면 된다) */
		trigger: number;
		color?: string;
		count?: number;
		class?: string;
	}

	let {
		trigger,
		color = 'var(--color-gold-400)',
		count = 12,
		class: className = ''
	}: Props = $props();

	/* 방사형으로 고르게 퍼지도록 각도를 균등 분할한다. 무작위보다 보기 좋다. */
	const particles = $derived(
		Array.from({ length: count }, (_, i) => {
			const angle = (360 / count) * i;
			const distance = 46 + (i % 3) * 14;
			return {
				dx: Math.cos((angle * Math.PI) / 180) * distance,
				dy: Math.sin((angle * Math.PI) / 180) * distance,
				delay: (i % 4) * 0.03,
				size: 6 + (i % 3) * 2
			};
		})
	);
</script>

{#key trigger}
	{#if trigger > 0}
		<div
			class="pointer-events-none absolute inset-0 grid place-items-center {className}"
			aria-hidden="true"
			data-testid="particle-burst"
		>
			{#each particles as p, i (i)}
				<span
					class="particle"
					style="--dx:{p.dx}px; --dy:{p.dy}px; --size:{p.size}px;
					       animation-delay:{p.delay}s; background:{color}"
				></span>
			{/each}
		</div>
	{/if}
{/key}

<style>
	.particle {
		position: absolute;
		width: var(--size);
		height: var(--size);
		border-radius: 9999px;
		opacity: 0;
		animation: burst 0.62s var(--ease-soft) forwards;
	}

	@keyframes burst {
		0% {
			opacity: 1;
			transform: translate(0, 0) scale(0.4);
		}
		70% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(var(--dx), var(--dy)) scale(1);
		}
	}
</style>
