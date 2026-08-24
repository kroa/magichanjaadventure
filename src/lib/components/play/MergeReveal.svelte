<script lang="ts">
	import Button from '$lib/components/common/Button.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import ParticleBurst from '$lib/components/effects/ParticleBurst.svelte';
	import { recipeFor } from '$lib/game/fusion';

	interface Props {
		character: string;
		reading: string;
		meaning: string;
		story: string;
		/** 이미 만들어 본 것인가 */
		alreadyKnown?: boolean;
		onclose: () => void;
	}

	let { character, reading, meaning, story, alreadyKnown = false, onclose }: Props = $props();

	/** 무엇과 무엇이 합쳐졌는지 — 결과만 주면 아이는 왜 그 글자가 됐는지를 놓친다 */
	const recipe = $derived(recipeFor(character));

	let burst = $state(0);
	let root = $state<HTMLElement | null>(null);

	// svelte-ignore state_referenced_locally
	let lastChar = character;

	$effect(() => {
		// 글자가 바뀔 때만 한 번 터뜨린다. 비교로 읽어야 의존성이 잡힌다
		if (character === lastChar) return;
		lastChar = character;
		burst += 1;
	});
</script>

<!--
	합체 결과 — **이 순간이 이 게임의 보상이다.**

	복습 화면은 오랫동안 글자·뜻음·이야기·버튼 넷뿐이었다. 공방에는 반짝임도, 파티클도,
	무엇과 무엇이 합쳐졌는지 보여 주는 식도 있었는데 여기엔 하나도 없어서
	같은 사건인데 한쪽만 썰렁했다. 세 화면이 같은 것을 쓴다.

	움직임은 **부품이 먼저, 결과가 나중**이다. 그 순서가 곧 "이래서 저게 됐다" 를 말한다.
-->
<div class="reveal relative isolate" bind:this={root} data-testid="merge-reveal">
	<Sparkle count={7} />
	<ParticleBurst trigger={burst} />

	<p class="lead font-display">
		{alreadyKnown ? '다시 만들었어요' : '새 한자를 만들었어요!'}
	</p>

	{#if recipe}
		<p class="equation" aria-label="{recipe.parts.join(' 더하기 ')} 는 {character}">
			{#each recipe.parts as part, i (i)}
				{#if i > 0}<span class="op" aria-hidden="true">+</span>{/if}
				<span class="hanja part" style="--i:{i}">{part}</span>
			{/each}
			<span class="op eq" aria-hidden="true">=</span>
			<span class="hanja result">{character}</span>
		</p>
	{:else}
		<p class="hanja result solo">{character}</p>
	{/if}

	<p class="gloss font-display" data-testid="merge-gloss">{meaning} {reading}</p>
	<p class="story">{story}</p>

	{#if recipe?.soundPart}
		<!-- 같은 부품이 든 글자는 소리가 같다. 글로 설명하지 않고 나란히 보여 준다 -->
		<p class="sound-hint">
			<span class="hanja">{recipe.soundPart}</span>
			<span>가 소리를 맡아요</span>
		</p>
	{/if}

	<Button variant="magic" size="lg" onclick={onclose}>좋아!</Button>
</div>

<style>
	.reveal {
		display: grid;
		width: 100%;
		max-width: 26rem;
		justify-items: center;
		gap: 0.5rem;
		margin: 0 auto;
		padding: 1.25rem 1rem;
		border-radius: var(--radius-panel);
		background: linear-gradient(180deg, #fffdf5 0%, #f3ecff 100%);
		box-shadow:
			0 0 0 3px var(--color-gold-300, #ffe08a),
			var(--shadow-card);
		text-align: center;
		animation: card-in 0.34s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes card-in {
		from {
			transform: scale(0.88) translateY(10px);
			opacity: 0;
		}
	}

	.lead {
		color: var(--color-magic-500);
		font-size: 0.95rem;
	}

	.equation {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
	}

	.op {
		color: var(--color-magic-400);
		font-size: 1.3rem;
	}

	/* 부품이 먼저 들어온다 — 그 순서가 "이래서 저게 됐다" 를 말한다 */
	.part {
		font-size: 1.9rem;
		line-height: 1;
		color: var(--color-ink-500);
		animation: part-in 0.3s ease both;
		animation-delay: calc(var(--i) * 0.12s);
	}

	@keyframes part-in {
		from {
			transform: translateY(8px);
			opacity: 0;
		}
	}

	.eq {
		animation: part-in 0.3s ease both;
		animation-delay: 0.3s;
	}

	/* 결과는 크게, 늦게, 한 번 튄다 */
	.result {
		font-size: 4.2rem;
		line-height: 1;
		color: var(--color-magic-800);
		animation: result-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
		animation-delay: 0.42s;
	}

	.result.solo {
		animation-delay: 0.1s;
	}

	@keyframes result-pop {
		from {
			transform: scale(0.4) rotate(-8deg);
			opacity: 0;
		}
	}

	.gloss {
		color: var(--color-ink-900);
		font-size: 1.2rem;
	}

	.story {
		max-width: 22rem;
		color: var(--color-ink-700);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.sound-hint {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.7rem;
		border-radius: 9999px;
		background: var(--color-gold-100, rgb(255 245 214));
		color: var(--color-ink-700);
		font-size: 0.8rem;
	}

	.sound-hint .hanja {
		font-size: 1.1rem;
	}

	/*
	 * 감속 설정에서는 만들지 않는다.
	 * 전역 규칙은 애니메이션을 끝 프레임에 착지시키는데, 여기 키프레임은 `from` 만 있어
	 * 끝이 곧 최종 상태라 안전하다. 그래도 명시해 두는 편이 읽기 쉽다.
	 */
	@media (prefers-reduced-motion: reduce) {
		.reveal,
		.part,
		.eq,
		.result {
			animation: none;
		}
	}
</style>
