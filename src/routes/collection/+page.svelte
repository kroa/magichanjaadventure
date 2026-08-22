<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import TopHud from '$lib/components/layout/TopHud.svelte';
	import Chip from '$lib/components/common/Chip.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Modal from '$lib/components/common/Modal.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import ProgressBar from '$lib/components/common/ProgressBar.svelte';
	import type { HanjaWithProgress } from '$lib/server/db/hanja';

	let { data } = $props();

	let selected = $state<HanjaWithProgress | null>(null);
	let modalOpen = $state(false);

	function open(hanja: HanjaWithProgress) {
		if (!hanja.learned) return;
		selected = hanja;
		modalOpen = true;
	}
</script>

<svelte:head>
	<title>한자 도감 · 마법한자탐험대</title>
</svelte:head>

<AppShell>
	{#snippet hud()}
		<TopHud
			nickname={data.user.nickname}
			level={data.user.level}
			exp={data.user.exp}
			expToNext={data.expToNext}
			gems={data.user.gems}
		/>
	{/snippet}

	<div class="flex flex-col gap-5">
		<div>
			<h1 class="text-display-lg text-magic-700">한자 도감</h1>
			<div class="mt-2 flex items-center gap-3">
				<ProgressBar
					value={data.learnedTotal}
					max={data.grandTotal}
					tone="gold"
					size="md"
					label="전체 수집 {data.learnedTotal} / {data.grandTotal}"
					class="flex-1"
				/>
				<span class="shrink-0 font-display text-ink-700">
					{data.learnedTotal} / {data.grandTotal}
				</span>
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			{#each data.areas as area (area.id)}
				<Chip
					selected={area.id === data.areaId}
					locked={!area.unlocked}
					onclick={() => (location.href = `/collection?area=${area.id}`)}
				>
					<span aria-hidden="true">{area.emoji}</span>
					{area.name}
					<span class="text-xs opacity-70">{area.learned}/{area.total}</span>
				</Chip>
			{/each}
		</div>

		<!-- 도감 격자: 못 배운 한자는 실루엣 -->
		<div class="grid" data-testid="collection-grid">
			{#each data.hanja as item (item.id)}
				<button
					type="button"
					class="slot tappable"
					class:learned={item.learned}
					disabled={!item.learned}
					onclick={() => open(item)}
					aria-label={item.learned
						? `${item.character} ${item.meaning} ${item.reading}`
						: '아직 배우지 않은 한자'}
				>
					{#if item.learned}
						<span class="hanja char">{item.character}</span>
						<span class="label">{item.meaning} {item.reading}</span>
						{#if item.mastery >= 100}
							<span class="crown" aria-hidden="true">👑</span>
						{/if}
					{:else}
						<span class="hanja char silhouette" aria-hidden="true">{item.character}</span>
						<span class="label">???</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>
</AppShell>

<Modal bind:open={modalOpen} title={selected ? `${selected.meaning} ${selected.reading}` : ''}>
	{#if selected}
		<div class="flex flex-col items-center gap-3 text-center">
			<p class="hanja text-hanja-card leading-none text-magic-700">{selected.character}</p>

			<div class="flex flex-wrap justify-center gap-2">
				<Badge tone="magic" size="sm">{selected.gradeLabel}</Badge>
				<Badge tone="sky" size="sm">{selected.strokeCount}획</Badge>
				<Badge tone={selected.mastery >= 100 ? 'gold' : 'mint'} size="sm">
					익힘 {selected.mastery}%
				</Badge>
			</div>

			<p class="text-ink-700">{selected.description}</p>

			{#if selected.exampleWords.length > 0}
				<ul class="flex w-full flex-col gap-2">
					{#each selected.exampleWords as word (word.word)}
						<li
							class="flex items-center justify-between gap-3 rounded-button bg-magic-50 px-4 py-2.5"
						>
							<span class="hanja text-xl">{word.word}</span>
							<span class="text-sm text-ink-500">{word.reading} · {word.meaning}</span>
						</li>
					{/each}
				</ul>
			{/if}

			<p class="text-sm text-ink-400">
				맞힌 횟수 {selected.correctCount} · 틀린 횟수 {selected.wrongCount}
			</p>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={() => (modalOpen = false)}>닫기</Button>
	{/snippet}
</Modal>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
		gap: 0.6rem;
	}

	.slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		position: relative;
		/* 터치 타깃 하한선 */
		min-height: 5.25rem;
		padding: 0.5rem 0.25rem;
		border: 2px solid var(--color-magic-100);
		border-radius: var(--radius-card);
		background: rgb(255 255 255 / 0.55);
		cursor: default;
		transition:
			transform 0.15s var(--ease-pop),
			box-shadow 0.15s ease;
	}

	.slot.learned {
		border-color: var(--color-magic-300);
		background: #fff;
		box-shadow: var(--shadow-soft);
		cursor: pointer;
	}

	.slot.learned:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-card);
	}

	.char {
		font-size: 1.9rem;
		line-height: 1.1;
		color: var(--color-magic-800);
	}

	/* 못 배운 한자는 실루엣 — "여기 뭔가 있다"는 것만 보여 준다 */
	.silhouette {
		color: var(--color-ink-400);
		opacity: 0.25;
		filter: blur(2.5px);
	}

	.label {
		font-family: var(--font-display);
		font-size: 0.7rem;
		color: var(--color-ink-500);
	}

	.crown {
		position: absolute;
		top: -6px;
		right: -4px;
		font-size: 0.95rem;
	}
</style>
