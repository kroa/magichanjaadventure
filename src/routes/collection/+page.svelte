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

	/*
	 * **안 배운 칸도 눌린다.**
	 *
	 * 예전에는 `disabled` 라 아이가 눌러도 아무 일이 없었다. 도감의 절반 이상이
	 * 손이 안 닿는 회색 칸이었고, 그게 "가고 싶은 곳" 이 아니라 "못 가는 곳" 으로 읽혔다.
	 * 이제 누르면 어디서 배울 수 있는지 알려 주고 그 지역으로 데려간다.
	 */
	function open(hanja: HanjaWithProgress) {
		selected = hanja;
		modalOpen = true;
	}

	type Filter = 'all' | 'have' | 'not-yet' | 'perfect';
	let filter = $state<Filter>('all');

	const FILTERS: { id: Filter; label: string }[] = [
		{ id: 'all', label: '모두' },
		{ id: 'have', label: '모은 것' },
		{ id: 'not-yet', label: '아직' },
		{ id: 'perfect', label: '👑 완벽' }
	];

	function matches(item: HanjaWithProgress): boolean {
		if (filter === 'have') return item.learned;
		if (filter === 'not-yet') return !item.learned;
		if (filter === 'perfect') return item.learned && item.mastery >= 100;
		return true;
	}

	const shown = $derived(data.hanja.filter(matches));
	const areaName = $derived(data.areas.find((a) => a.id === data.areaId)?.name ?? '이 지역');
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

		<div class="flex flex-wrap gap-2">
			{#each FILTERS as f (f.id)}
				<Chip selected={filter === f.id} onclick={() => (filter = f.id)}>{f.label}</Chip>
			{/each}
			<span class="self-center text-xs text-white/70">{shown.length}자</span>
		</div>

		<!--
			도감 격자.

			**필터는 `hidden` 으로 감춘다 — `{#if}` 로 지우지 않는다.**
			DOM 에서 사라지면 "모은 것 4자" 같은 검사가 필터 상태에 따라 흔들린다.
			보이지 않을 뿐 세어지는 것은 그대로여야 한다.
		-->
		<div class="grid" data-testid="collection-grid">
			{#each data.hanja as item (item.id)}
				<button
					type="button"
					class="slot tappable"
					class:learned={item.learned}
					class:perfect={item.learned && item.mastery >= 100}
					hidden={!matches(item)}
					onclick={() => open(item)}
					aria-label={item.learned
						? `${item.character} ${item.meaning} ${item.reading}`
						: `아직 배우지 않은 한자 — ${areaName}에서 배울 수 있어요`}
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

<Modal
	bind:open={modalOpen}
	title={selected
		? selected.learned
			? `${selected.meaning} ${selected.reading}`
			: '아직 못 만난 한자'
		: ''}
>
	{#if selected && !selected.learned}
		<!--
			**닫힌 문이 아니라 다음 목적지.**
			예전에는 이 칸이 아예 안 눌려서, 아이는 회색 칸이 무엇인지도 어디서 얻는지도 몰랐다.
		-->
		<div class="flex flex-col items-center gap-3 text-center">
			<p class="hanja text-hanja-card leading-none text-magic-300">{selected.character}</p>
			<p class="text-ink-700">
				이 글자는 <strong>{areaName}</strong>에서 배울 수 있어요.
			</p>
			<Button variant="magic" size="lg" href="/learn?area={data.areaId}">배우러 가기</Button>
		</div>
	{:else if selected}
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

	/* 완벽하게 익힌 칸은 금박 테두리를 두른다 — 모은 것 중에서도 눈에 띈다 */
	.slot.perfect {
		border-color: var(--color-gold-400);
		box-shadow:
			0 0 0 3px rgb(255 201 60 / 0.35),
			0 4px 0 var(--color-gold-700, #b8860b);
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
