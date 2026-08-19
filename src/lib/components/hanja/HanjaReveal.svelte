<script lang="ts">
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import ParticleBurst from '$lib/components/effects/ParticleBurst.svelte';
	import Badge from '$lib/components/common/Badge.svelte';

	interface Props {
		character: string;
		reading: string;
		meaning: string;
		gradeLabel: string;
		strokeCount: number;
		description: string;
		exampleWords: { word: string; reading: string; meaning: string }[];
		/** 이미 획득했는가 (획득 후 상태) */
		claimed?: boolean;
	}

	let {
		character,
		reading,
		meaning,
		gradeLabel,
		strokeCount,
		description,
		exampleWords,
		claimed = false
	}: Props = $props();

	/*
	 * 한자를 "발견"하는 순간이 아이템 획득처럼 느껴져야 한다.
	 * 그래서 카드가 아니라 무대처럼 만든다 — 빛기둥 + 반짝임 + 파티클.
	 */
	let burst = $derived(claimed ? 1 : 0);
</script>

<div
	class="reveal relative isolate overflow-hidden rounded-panel px-5 py-8 text-center shadow-float"
	class:claimed
	data-testid="hanja-reveal"
	data-anim-state={claimed ? 'done' : 'idle'}
>
	<span class="beam" aria-hidden="true"></span>
	<Sparkle count={8} />
	<ParticleBurst trigger={burst} />

	<div class="relative flex flex-col items-center gap-2">
		<Badge tone="magic" fill="solid" size="sm">{gradeLabel}</Badge>

		<p
			class="hanja text-hanja-hero leading-none text-magic-800"
			lang="ko"
			aria-label="{meaning} {reading}"
		>
			{character}
		</p>

		<p class="font-display text-display-md text-ink-900">{meaning} {reading}</p>
		<p class="max-w-sm text-sm text-ink-500">{description}</p>

		<div class="mt-1 flex flex-wrap justify-center gap-2">
			<Badge tone="sky" size="sm">{strokeCount}획</Badge>
			{#each exampleWords as word (word.word)}
				<Badge tone="mint" size="sm">
					<span class="hanja">{word.word}</span>
					<span class="opacity-80">{word.reading} · {word.meaning}</span>
				</Badge>
			{/each}
		</div>
	</div>
</div>

<style>
	.reveal {
		background: radial-gradient(120% 90% at 50% 0%, #ffffff 0%, #f3f0ff 55%, #e7e0ff 100%);
	}

	/* 위에서 내려오는 빛기둥 — "발견했다"는 느낌의 핵심 */
	.beam {
		position: absolute;
		left: 50%;
		top: -30%;
		width: 46%;
		height: 130%;
		transform: translateX(-50%);
		background: linear-gradient(180deg, rgb(255 210 94 / 0.32) 0%, rgb(255 210 94 / 0) 68%);
		filter: blur(14px);
		animation: beam-pulse 3s ease-in-out infinite;
	}

	.reveal.claimed .beam {
		background: linear-gradient(180deg, rgb(94 234 212 / 0.38) 0%, rgb(94 234 212 / 0) 68%);
	}

	@keyframes beam-pulse {
		0%,
		100% {
			opacity: 0.75;
		}
		50% {
			opacity: 1;
		}
	}
</style>
