<script lang="ts">
	import { purchase } from '$lib/stores/purchase.svelte';
	import HeroSprite from '$lib/components/art/HeroSprite.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import { sound } from '$lib/sound/index.svelte';

	const event = $derived(purchase.current);

	let root = $state<HTMLElement | null>(null);
	let done = $state(false);
	/** 보석이 줄어드는 것을 눈으로 보게 한다 */
	let shownGems = $state(0);

	/*
	 * 날아가는 보석. 자리는 **고정 좌표**다 —
	 * Math.random 을 쓰면 서버가 그린 것과 화면이 어긋난다 (Sparkle 과 같은 규칙).
	 */
	const FLIGHT = [
		{ x: 12, y: 74, d: 0 },
		{ x: 27, y: 86, d: 40 },
		{ x: 41, y: 70, d: 80 },
		{ x: 56, y: 88, d: 120 },
		{ x: 70, y: 72, d: 160 },
		{ x: 84, y: 84, d: 200 },
		{ x: 20, y: 62, d: 60 },
		{ x: 63, y: 60, d: 140 }
	];

	$effect(() => {
		const current = event;
		const container = root;
		if (!current || !container) return;

		let killed = false;
		done = false;
		shownGems = current.gemsBefore;

		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		sound.play('reward');

		if (reduce) {
			// 연출을 만들지 않고 곧바로 최종 상태로 간다
			shownGems = current.gems;
			done = true;
			return;
		}

		/*
		 * 보석 숫자를 세어 내린다.
		 * 이미 서버가 깎은 뒤라, 사기 **전** 값을 따로 받아 두지 않으면
		 * 카운트다운의 시작점이 없다 (그래서 스토어가 gemsBefore 를 함께 나른다).
		 */
		const from = current.gemsBefore;
		const to = current.gems;
		const start = performance.now();
		const DURATION = 700;

		const tick = (now: number) => {
			if (killed) return;
			const t = Math.min(1, (now - start) / DURATION);
			shownGems = Math.round(from + (to - from) * t);
			if (t < 1) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);

		const timer = setTimeout(() => {
			if (!killed) done = true;
		}, 1100);

		return () => {
			killed = true;
			clearTimeout(timer);
		};
	});

	function close() {
		purchase.dismiss();
	}
</script>

<!--
	구매 — **사건이어야 한다.**

	예전에는 보석 숫자가 조용히 줄고 카드가 "보유 중" 으로 바뀌는 것이 전부였다.
	아이가 여러 판을 이겨 모은 것을 쓰는 순간인데, 아무 일도 안 일어난 것처럼 보였다.

	레벨업 오버레이와 같은 규약을 쓴다 (`data-anim-state`, 큐, 한 곳에만 마운트).
-->
{#if event}
	<div
		bind:this={root}
		class="overlay"
		role="dialog"
		aria-modal="true"
		aria-label="{event.title} 획득"
		data-testid="purchase-overlay"
		data-anim-state={done ? 'done' : 'playing'}
	>
		<Sparkle count={8} />
		<span class="beam" aria-hidden="true"></span>

		{#each FLIGHT as gem, i (i)}
			<span class="gem" style="left:{gem.x}%; top:{gem.y}%; --delay:{gem.d}ms" aria-hidden="true"
				>💎</span
			>
		{/each}

		<div class="content">
			<div class="hero">
				{#if event.characterClass}
					<HeroSprite cls={event.characterClass} size={180} mood="cheer" />
				{:else}
					<span class="item-icon" aria-hidden="true">{event.icon ?? '⚔️'}</span>
				{/if}
			</div>

			<p class="title font-display">{event.title}</p>
			<p class="line font-display">
				{event.characterClass ? '이제부터 함께 가자!' : '장비를 손에 넣었어요!'}
			</p>

			<p class="gems font-display" data-testid="purchase-gems">
				<span aria-hidden="true">💎</span>
				{shownGems}
			</p>

			<Button variant="gold" size="lg" onclick={close}>좋아!</Button>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		z-index: 70;
		display: grid;
		overflow: hidden;
		place-items: center;
		background: var(--gradient-night);
		inset: 0;
	}

	.content {
		display: grid;
		justify-items: center;
		gap: 0.6rem;
		padding: 1rem;
		text-align: center;
	}

	/* 위에서 내려오는 빛기둥 — 레벨업과 같은 언어다 */
	.beam {
		position: absolute;
		top: -10%;
		left: 50%;
		width: 60%;
		height: 120%;
		background: radial-gradient(
			ellipse 50% 40% at 50% 50%,
			rgb(255 201 60 / 0.35) 0%,
			transparent 70%
		);
		translate: -50% 0;
		pointer-events: none;
	}

	.hero {
		animation: hero-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes hero-in {
		from {
			transform: scale(0.5) translateY(40px);
			opacity: 0;
		}
	}

	.item-icon {
		display: block;
		font-size: 5rem;
		line-height: 1;
	}

	.title {
		color: var(--color-gold-300, #ffe08a);
		font-size: 1.6rem;
	}

	.line {
		color: #fff;
		font-size: 1rem;
	}

	.gems {
		padding: 0.2rem 0.8rem;
		border-radius: 9999px;
		background: rgb(255 255 255 / 0.14);
		color: #fff;
		font-size: 0.95rem;
	}

	/* 보석이 아래에서 위로 빨려 올라간다 */
	.gem {
		position: absolute;
		font-size: 1.4rem;
		animation: gem-fly 0.75s ease-in forwards;
		animation-delay: var(--delay);
		opacity: 0;
		pointer-events: none;
	}

	@keyframes gem-fly {
		0% {
			transform: translateY(0) scale(1);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		100% {
			transform: translateY(-42vh) scale(0.3);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero,
		.gem {
			animation: none;
		}

		/* 연출을 끄면 보석이 화면에 얼어붙는다. 아예 감춘다 */
		.gem {
			display: none;
		}
	}
</style>
