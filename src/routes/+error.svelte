<script lang="ts">
	import { page } from '$app/state';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import SpeechBubble from '$lib/components/common/SpeechBubble.svelte';
	import MonsterSprite from '$lib/components/art/MonsterSprite.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';

	/*
	 * 에러 화면도 게임 안에 있어야 한다.
	 * 아이에게 "Not Found" 같은 영어 오류를 보여 주지 않는다. 길을 잃은 것뿐이고,
	 * 돌아갈 길을 바로 준다.
	 */
	const isNotFound = $derived(page.status === 404);

	const title = $derived(isNotFound ? '길을 잃었어요!' : '앗, 문제가 생겼어요');
	const message = $derived(
		isNotFound
			? '여긴 지도에 없는 곳이에요. 모험 지도로 돌아갈까요?'
			: '잠시 후 다시 시도해 주세요. 모은 한자는 그대로 있어요.'
	);
</script>

<svelte:head>
	<title>{title} · 마법한자탐험대</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AppShell nav={false}>
	<div class="flex flex-col items-center gap-5 py-8 text-center">
		<div class="relative">
			<Sparkle count={5} />
			<MonsterSprite kind="cloud_puff" size={150} mood="surprised" />
		</div>

		<SpeechBubble tail="none" tone="white" class="max-w-sm">
			<h1 class="text-display-md text-magic-700">{title}</h1>
			<p class="mt-2 text-ink-700">{message}</p>
		</SpeechBubble>

		<p class="font-display text-sm text-ink-400">오류 코드 {page.status}</p>

		<div class="flex flex-wrap justify-center gap-3">
			<Button variant="magic" size="lg" href="/">모험 지도로</Button>
			<Button variant="ghost" size="lg" href="/collection">한자 도감</Button>
		</div>
	</div>
</AppShell>
