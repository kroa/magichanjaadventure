<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import PieceBoard, { type Piece } from '$lib/components/play/PieceBoard.svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { toasts } from '$lib/stores/toast.svelte';
	import { sound } from '$lib/sound/index.svelte';
	import type { FusionRecipe } from '$lib/game/fusion';

	let { data } = $props();

	const wide = new MediaQuery('(min-width: 900px)');
	const boardHeight = $derived(wide.current ? 320 : 270);

	// svelte-ignore state_referenced_locally
	let pieces = $state<Piece[]>(data.pieces.map((p) => ({ ...p })));
	// svelte-ignore state_referenced_locally
	let total = $state(data.total);

	let made = $state<string[]>([]);
	let hintTick = $state(0);
	let finished = $state(false);
	let restarting = $state(false);

	/** 방금 만든 것 — 뜻·음·이야기를 여기서 보여 준다 */
	let justMade = $state<{
		character: string;
		reading: string;
		meaning: string;
		story: string;
	} | null>(null);

	function askHint() {
		hintTick += 1;
		sound.play('click');
	}

	/**
	 * 조각 두 개가 붙었다. 서버가 다시 확인한다.
	 *
	 * 복습이므로 **되는 조합이면 무엇이든 인정한다** — 대결처럼 "이번 목표" 가 따로 없다.
	 */
	async function handleMerge(recipe: FusionRecipe, used: Piece[]): Promise<boolean> {
		void recipe;
		const body = new FormData();
		for (const piece of used) body.append('part', piece.character);

		try {
			const response = await fetch('?/fuse', { method: 'POST', body });
			if (!response.ok) throw new Error('실패');
			const raw = (await response.json()) as { type: string; data?: string };

			/*
			 * SvelteKit 액션 응답은 devalue 로 감싸여 온다.
			 * 화면이 이걸 직접 풀지 않도록 성공 여부만 보고, 자세한 내용은 다시 읽어 온다.
			 */
			if (raw.type !== 'success') return false;
			const payload = JSON.parse(raw.data ?? '[]');
			const ok = Array.isArray(payload) ? payload.includes(true) : false;
			if (!ok) return false;

			sound.play('discover');
			return true;
		} catch {
			toasts.warn('연결이 잠깐 끊겼어요. 다시 해 보세요.');
			return false;
		}
	}

	async function restart() {
		if (restarting) return;
		restarting = true;
		try {
			await invalidateAll();
			pieces = data.pieces.map((p) => ({ ...p }));
			total = data.total;
			made = [];
			justMade = null;
			finished = false;
			hintTick = 0;
		} finally {
			restarting = false;
		}
	}
</script>

<svelte:head>
	<title>복습 · 마법한자탐험대</title>
</svelte:head>

<!--
	복습 — 대결과 **같은 판, 같은 손동작.**

	예전에는 여기만 4지선다였다. 화면마다 규칙이 다르면 아이는 게임을 배우는 것이 아니라
	화면 사용법을 배우게 된다. 지금은 조각을 밀어 붙이는 동작 하나로 앱 전체가 통일된다.
	다른 점은 보스가 없다는 것뿐이다.
-->
<AppShell nav={false}>
	<div class="quiz-grid">
		<header class="flex items-center gap-2">
			<a href="/" class="exit" aria-label="모험 지도로 나가기">✕</a>
			<Badge tone="magic" size="sm">복습 {made.length} / {total}</Badge>
			{#if !finished && pieces.length > 0}
				<button type="button" class="help" onclick={askHint} aria-label="도와줘">?</button>
			{/if}
		</header>

		{#if data.pieces.length === 0}
			<EmptyState
				icon="✨"
				title="아직 복습할 것이 없어요"
				description="공방에서 한자를 몇 개 만들어 보면 여기서 다시 만나요."
			>
				{#snippet action()}
					<Button variant="magic" href="/fusion">합체 공방으로</Button>
					<Button variant="ghost" href="/">모험 지도로</Button>
				{/snippet}
			</EmptyState>
		{:else if finished}
			<div class="done" data-testid="quiz-finished">
				<h2 class="text-display-lg text-gold-600">다 풀었어요!</h2>
				{#if made.length > 0}
					<p class="made">
						{#each made as ch (ch)}<span class="hanja">{ch}</span>{/each}
					</p>
				{/if}
				<div class="flex flex-wrap justify-center gap-3">
					<Button variant="magic" size="lg" onclick={restart} loading={restarting}>한 판 더!</Button
					>
					<Button variant="gold" size="lg" href="/battle">대결하러 가기</Button>
					<Button variant="ghost" size="lg" href="/">모험 지도로</Button>
				</div>
			</div>
		{:else if justMade}
			<div class="reveal" data-testid="quiz-made">
				<span class="hanja reveal-char">{justMade.character}</span>
				<span class="font-display text-lg text-ink-900">
					{justMade.meaning}
					{justMade.reading}
				</span>
				<p class="reveal-story">{justMade.story}</p>
				<Button
					variant="magic"
					size="md"
					onclick={() => {
						justMade = null;
						if (pieces.length === 0) finished = true;
					}}
				>
					좋아!
				</Button>
			</div>
		{:else}
			<div class="play">
				<PieceBoard
					bind:pieces
					{hintTick}
					height={boardHeight}
					onmerge={async (recipe, used) => {
						const ok = await handleMerge(recipe, used);
						if (ok) {
							made = [...made, recipe.result];
							justMade = {
								character: recipe.result,
								reading: '',
								meaning: '',
								story: recipe.story
							};
						}
						return ok;
					}}
					oncleared={() => {
						if (!justMade) finished = true;
					}}
				/>
			</div>
		{/if}
	</div>
</AppShell>

<style>
	.quiz-grid {
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 0.6rem;
		min-height: calc(100dvh - 4rem);
	}

	.exit {
		display: grid;
		place-items: center;
		/* 아이 손가락 기준 하한선 */
		width: var(--tap-min);
		height: var(--tap-min);
		flex-shrink: 0;
		border-radius: 9999px;
		background: rgb(255 255 255 / 0.85);
		color: var(--color-ink-500);
		text-decoration: none;
		box-shadow: var(--shadow-soft);
	}

	.help {
		display: grid;
		place-items: center;
		width: var(--tap-min);
		height: var(--tap-min);
		flex-shrink: 0;
		margin-left: auto;
		border: 3px solid var(--color-gold-400);
		border-radius: 9999px;
		background: #fff;
		color: var(--color-gold-700);
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
	}

	.play {
		display: grid;
		min-height: 0;
		align-content: center;
	}

	.done,
	.reveal {
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border-radius: var(--radius-panel);
		background: linear-gradient(180deg, #eef4ff 0%, #f6ecff 100%);
		box-shadow: var(--shadow-card);
		text-align: center;
	}

	.reveal-char {
		font-size: 3.5rem;
		line-height: 1;
		color: var(--color-magic-800);
	}

	.reveal-story {
		max-width: 20rem;
		color: var(--color-ink-700);
		font-size: 0.85rem;
	}

	.made {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}

	.made .hanja {
		font-size: 2rem;
		color: var(--color-magic-800);
	}
</style>
