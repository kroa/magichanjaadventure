<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import HelpButton from '$lib/components/common/HelpButton.svelte';
	import PieceBoard, { type Piece } from '$lib/components/play/PieceBoard.svelte';
	import MergeReveal from '$lib/components/play/MergeReveal.svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { deserialize } from '$app/forms';
	import { goto } from '$app/navigation';
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
	/*
	 * **강한 도움은 판당 두 번.**
	 *
	 * 무제한이던 시절 아이가 `?` 를 남발했다. 그런데 개수만 세는 것으로는 부족했다 —
	 * 판이 한 번 켜지면 합체마다 다음 짝이 공짜로 켜져서, 한 번 누르면 판 전체가 풀렸다.
	 * 그 끈끈함은 PieceBoard 에서 끊었고, 여기서는 횟수만 센다.
	 *
	 * 두 번인 근거: 조합을 두 번 해내면 조각이 둘 남고 가능한 짝은 하나뿐이다.
	 * 즉 **세 번째 강한 도움은 정의상 쓸모가 없다.** 예산 2는 아무것도 빼앗지 않는다.
	 * 다 써도 버튼은 살아 있다 — 약한 도움(한 조각)이 무제한이다.
	 */
	const HINT_BUDGET = 2;
	let hintLeft = $state(HINT_BUDGET);
	/** 합체 왕복 중에는 도움을 잠근다 — 허공에 소비되지 않게 */
	let boardBusy = $state(false);
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
	interface MergeResult {
		ok: boolean;
		reason?: string;
		character?: string;
		reading?: string;
		meaning?: string;
		story?: string;
	}

	async function handleMerge(recipe: FusionRecipe, used: Piece[]): Promise<MergeResult | null> {
		void recipe;
		const body = new FormData();
		for (const piece of used) body.append('part', piece.character);

		try {
			/*
				`?/fuse` 는 상대 URL 이라 **현재 쿼리가 통째로 사라진다.**
				서버는 focus·r 로 이 판의 목표를 다시 유도하므로, 실어 보내지 않으면
				서버가 딴 판을 계산해 방금 맞힌 것을 거절한다.
			*/
			const action = `?focus=${encodeURIComponent(data.focus ?? '')}&r=${data.round ?? 0}&/fuse`;
			const response = await fetch(action, { method: 'POST', body });
			if (!response.ok) throw new Error('실패');

			/*
			 * **`deserialize` 를 써야 한다.**
			 *
			 * 액션 응답의 `data` 는 devalue 문자열이라 `JSON.parse` 로 풀면 값이 아니라
			 * 참조 표(인덱스 배열)가 나온다. 예전 코드가 `payload.includes(true)` 라는
			 * 이상한 판정을 하고 있던 이유가 그것이고, 그래서 뜻·음을 **아예 꺼내지 못해**
			 * 결과 카드의 「뜻 음」 줄이 빈칸으로 떴다.
			 */
			const result = deserialize(await response.text());
			if (result.type !== 'success') return null;

			const payload = (result.data as unknown as MergeResult) ?? { ok: false };
			if (!payload.ok) {
				/*
				 * 만들긴 했지만 이 판의 목표가 아니다. 대결과 **글자 그대로 같은 말**을 쓴다 —
				 * 화면마다 다른 말을 하면 아이는 게임이 아니라 화면 사용법을 배우게 된다.
				 * 한자는 서버가 이미 줬으므로 헛수고가 아니다.
				 */
				if (payload.reason === 'not-target' && payload.character) {
					toasts.success(`${payload.character}! 만들었어요.`, '🔮');
				}
				return null;
			}

			sound.play('discover');
			return payload;
		} catch {
			toasts.warn('연결이 잠깐 끊겼어요. 다시 해 보세요.');
			return null;
		}
	}

	async function restart() {
		if (restarting) return;
		restarting = true;
		try {
			/*
			 * **회차를 올린다.** 그냥 다시 읽으면 서버가 같은 조합을 골라
			 * 아이가 방금 비운 것과 **똑같은 여섯 조각**을 다시 받는다.
			 */
			const next = (data.round ?? 0) + 1;
			await goto(`?focus=${encodeURIComponent(data.focus ?? '')}&r=${next}`, {
				invalidateAll: true,
				noScroll: true
			});
			pieces = data.pieces.map((p) => ({ ...p }));
			total = data.total;
			made = [];
			justMade = null;
			finished = false;
			hintTick = 0;
			// hintTick 을 되돌리는 자리마다 예산도 나란히 되돌린다. 하나만 빠뜨리면 조용히 어긋난다
			hintLeft = HINT_BUDGET;
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
				<HelpButton
					onclick={askHint}
					left={hintLeft}
					total={HINT_BUDGET}
					disabled={boardBusy}
					class="ml-auto"
				/>
			{/if}
		</header>

		{#if !finished && pieces.length > 0}
			<!--
				**무엇을 하는 곳인지 한 줄로 알린다.**
				"글자를 없애라" 는 원칙을 지키느라 아무 안내도 없게 만들었더니
				아이도 어른도 뭘 해야 할지 몰랐다. 원칙보다 못 하는 것이 더 큰 문제다.
			-->
			<p class="howto">
				<span aria-hidden="true">✨</span>
				{#if data.focusState === 'ready'}
					방금 배운 <span class="hanja">{data.focus}</span> 로 만들 수 있어요. 조각 두 개를 붙여 보세요
				{:else if data.focusState === 'workshop-only'}
					<!-- 여기서 "짝이 없다" 고 하면 거짓말이다 — 같은 순간 공방에서는 만들어진다 -->
					<span class="hanja">{data.focus}</span> 는 합체 공방에서 만들 수 있어요. 여기서는 배운 조각으로
					다른 걸 만들어 볼까요?
				{:else if data.focusState === 'not-a-part'}
					<span class="hanja">{data.focus}</span> 는 아직 붙일 짝이 없는 글자예요. 배운 조각으로 다른
					걸 만들어 볼까요?
				{:else}
					조각 두 개를 붙여 배운 한자를 다시 만들어 보세요
				{/if}
			</p>
		{/if}

		{#if data.pieces.length === 0}
			<EmptyState
				icon="✨"
				title="아직 복습할 것이 없어요"
				description="복습은 배운 부품 두 개를 붙여 한자를 다시 만드는 놀이예요. 한자를 조금 더 배우면 여기서 만나요."
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
						<!--
						글자 자체를 키로 쓰면 같은 글자를 두 번 만들었을 때
						Svelte 가 prod 에서도 each_key_duplicate 로 죽는다. 인덱스를 쓴다.
					-->
						{#each made as ch, i (i)}<span class="hanja">{ch}</span>{/each}
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
			<!--
				합체 결과는 세 화면이 **같은 것**을 쓴다.
				여기만 글자·뜻음·이야기 셋뿐이라 같은 사건인데 혼자 썰렁했다.
			-->
			<div data-testid="quiz-made">
				<MergeReveal
					character={justMade.character}
					reading={justMade.reading}
					meaning={justMade.meaning}
					story={justMade.story}
					onclose={() => {
						justMade = null;
						if (pieces.length === 0) finished = true;
					}}
				/>
			</div>
		{:else}
			<div class="play">
				<PieceBoard
					bind:pieces
					{hintTick}
					{hintLeft}
					onhintshown={(weak) => {
						// 실제로 빛났을 때만 깎는다. 미리 깎으면 허공에 소비된 탭까지 세게 된다
						if (!weak) hintLeft -= 1;
					}}
					onbusy={(b) => (boardBusy = b)}
					height={boardHeight}
					onmerge={async (recipe, used) => {
						const result = await handleMerge(recipe, used);
						if (result) {
							made = [...made, recipe.result];
							// 뜻·음은 서버가 준 것을 쓴다. 예전에는 빈 문자열을 박아 넣어 줄이 비어 있었다
							justMade = {
								character: result.character ?? recipe.result,
								reading: result.reading ?? '',
								meaning: result.meaning ?? '',
								story: result.story ?? recipe.story
							};
						}
						return !!result;
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
		grid-template-rows: auto auto 1fr;
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

	.howto {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		border-radius: 9999px;
		background: rgb(30 22 62 / 0.55);
		color: rgb(255 255 255 / 0.92);
		font-size: 0.82rem;
		text-align: center;
	}

	.howto .hanja {
		font-size: 1.1rem;
		color: var(--color-gold-300, #ffe08a);
	}

	.play {
		display: grid;
		min-height: 0;
		align-content: center;
	}

	.done {
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
