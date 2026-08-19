<script lang="ts">
	import { levelUp } from '$lib/stores/levelup.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import Button from '$lib/components/common/Button.svelte';

	/*
	 * 레벨업 연출 (사양서 §19).
	 *
	 *   화면 어둡게 → 빛기둥 → 캐릭터 등장 → 별 파티클 → LEVEL UP → 레벨 숫자 → 보상 → 복귀
	 *
	 * GSAP 는 이 컴포넌트에서만 동적 import 한다. 레벨업이 실제로 일어나기 전에는
	 * 번들에 들어가지 않는다(성능 예산 — docs/00-ARCHITECTURE.md §8).
	 *
	 * prefers-reduced-motion 이면 타임라인을 즉시 끝 상태로 보낸다.
	 * 연출을 건너뛰어도 **보상과 진행은 100% 동일하다.** 연출은 이미 확정된 결과를 보여줄 뿐이다.
	 */

	const event = $derived(levelUp.current);

	let root = $state<HTMLDivElement | null>(null);
	let shownLevel = $state(0);
	let done = $state(false);

	/** 별 파티클 위치 — 고정 시드 (Math.random 은 SSR 과 어긋난다) */
	const STARS = [
		{ x: 18, y: 26, s: 1.1 },
		{ x: 78, y: 20, s: 0.8 },
		{ x: 30, y: 68, s: 0.9 },
		{ x: 86, y: 60, s: 1.2 },
		{ x: 8, y: 48, s: 0.7 },
		{ x: 62, y: 78, s: 1 },
		{ x: 48, y: 12, s: 0.85 },
		{ x: 92, y: 38, s: 0.75 },
		{ x: 12, y: 76, s: 0.95 },
		{ x: 68, y: 44, s: 0.65 }
	];

	$effect(() => {
		const current = event;
		const container = root;
		if (!current || !container) return;

		let killed = false;
		let timeline: { kill: () => void } | null = null;
		shownLevel = Math.max(1, current.level - current.levelsGained);
		done = false;

		(async () => {
			const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			const { gsap } = await import('gsap');
			if (killed) return;

			const q = gsap.utils.selector(container);
			const tl = gsap.timeline({
				defaults: { ease: 'power2.out' },
				onComplete: () => {
					done = true;
				}
			});
			timeline = tl;

			tl.fromTo(container, { opacity: 0 }, { opacity: 1, duration: 0.32 })
				// 빛기둥이 위에서 내려온다
				.fromTo(
					q('.beam'),
					{ scaleY: 0, opacity: 0 },
					{ scaleY: 1, opacity: 1, duration: 0.5, ease: 'power3.out' },
					'-=0.1'
				)
				// 캐릭터가 튀어오른다
				.fromTo(
					q('.hero'),
					{ scale: 0.5, y: 40, opacity: 0 },
					{ scale: 1, y: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.8)' },
					'-=0.25'
				)
				// 별이 사방으로 퍼진다
				.fromTo(
					q('.star'),
					{ scale: 0, opacity: 0 },
					{ scale: 1, opacity: 1, duration: 0.5, stagger: 0.045, ease: 'back.out(2.4)' },
					'-=0.35'
				)
				// LEVEL UP!
				.fromTo(
					q('.title'),
					{ scale: 0.4, opacity: 0, rotate: -8 },
					{ scale: 1, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(2)' },
					'-=0.3'
				)
				// 레벨 숫자가 이전 레벨에서 새 레벨까지 올라간다
				.to(
					{ n: Math.max(1, current.level - current.levelsGained) },
					{
						n: current.level,
						duration: 0.6,
						ease: 'power1.inOut',
						onUpdate() {
							shownLevel = Math.round(this.targets()[0].n);
						}
					},
					'-=0.15'
				)
				.fromTo(
					q('.badge'),
					{ scale: 0.6, opacity: 0 },
					{ scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' },
					'-=0.4'
				)
				.fromTo(
					q('.reward'),
					{ y: 16, opacity: 0 },
					{ y: 0, opacity: 1, duration: 0.35, stagger: 0.1 },
					'-=0.15'
				)
				.fromTo(q('.close'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, '-=0.1');

			if (reduce) tl.progress(1);
		})();

		return () => {
			killed = true;
			timeline?.kill();
		};
	});

	function close() {
		levelUp.dismiss();
	}
</script>

{#if event}
	{@const Hero = event.characterClass === 'wizard' ? WizardSprite : KnightSprite}
	<div
		bind:this={root}
		class="overlay"
		role="dialog"
		aria-modal="true"
		aria-label="레벨 {event.level} 달성"
		data-testid="levelup-overlay"
		data-anim-state={done ? 'done' : 'playing'}
	>
		<span class="beam" aria-hidden="true"></span>

		{#each STARS as star, i (i)}
			<span class="star" style="left:{star.x}%; top:{star.y}%; --s:{star.s}" aria-hidden="true">
				✦
			</span>
		{/each}

		<div class="content">
			<div class="hero">
				<Hero size={190} mood="cheer" />
			</div>

			<p class="title font-display">LEVEL UP!</p>

			<div class="badge font-display">
				<span class="lv">Lv</span>
				<span class="num" data-testid="levelup-number">{shownLevel}</span>
			</div>

			{#if event.levelsGained > 1}
				<p class="reward font-display text-gold-300">{event.levelsGained}단계 한 번에 올랐어요!</p>
			{/if}

			{#if event.gemsGained > 0}
				<p class="reward font-display text-gold-300">💎 보석 {event.gemsGained}개 획득</p>
			{/if}

			{#each event.achievements as achievement (achievement.id)}
				<p class="reward font-display text-mint-300">
					{achievement.icon} 업적 — {achievement.title}
				</p>
			{/each}

			<div class="close">
				<Button variant="gold" size="lg" onclick={close}>계속 모험하기</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: grid;
		place-items: center;
		overflow: hidden;
		background: var(--gradient-night);
		padding: 1.5rem;
	}

	/* 위에서 내려오는 빛기둥 */
	.beam {
		position: absolute;
		left: 50%;
		top: -10%;
		width: min(48vw, 380px);
		height: 120%;
		transform: translateX(-50%);
		transform-origin: top center;
		/* 세로로만 흐리게 하면 좌우가 직사각형으로 잘려 보인다.
		   가로 마스크를 함께 걸어 '빛기둥'처럼 양옆도 사라지게 한다. */
		background: linear-gradient(180deg, rgb(255 210 94 / 0.6) 0%, rgb(255 210 94 / 0) 70%);
		mask-image: linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%);
		-webkit-mask-image: linear-gradient(
			90deg,
			transparent 0%,
			#000 30%,
			#000 70%,
			transparent 100%
		);
		filter: blur(26px);
	}

	.star {
		position: absolute;
		font-size: calc(1.6rem * var(--s));
		color: var(--color-gold-400);
		text-shadow: 0 0 12px var(--color-gold-500);
		pointer-events: none;
	}

	.content {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		text-align: center;
	}

	.title {
		font-size: clamp(2.25rem, 9vw, 3.75rem);
		line-height: 1;
		color: var(--color-gold-400);
		text-shadow:
			0 3px 0 var(--color-gold-700),
			0 0 28px rgb(255 201 60 / 0.65);
		letter-spacing: 0.02em;
	}

	.badge {
		display: inline-flex;
		align-items: baseline;
		gap: 0.4rem;
		padding: 0.5rem 1.5rem;
		border-radius: 9999px;
		background: var(--gradient-gold);
		color: var(--color-ink-900);
		box-shadow:
			0 5px 0 var(--color-gold-700),
			var(--shadow-glow-gold);
	}

	.badge .lv {
		font-size: 1rem;
		opacity: 0.75;
	}

	.badge .num {
		font-size: 2.25rem;
		line-height: 1;
	}

	.reward {
		font-size: 1rem;
	}

	.close {
		margin-top: 0.75rem;
	}
</style>
