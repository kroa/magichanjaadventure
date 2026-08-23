<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import HelpButton from '$lib/components/common/HelpButton.svelte';
	import PictoGlyph from '$lib/components/play/PictoGlyph.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import { draggable } from '$lib/actions/draggable';
	import { toasts } from '$lib/stores/toast.svelte';
	import { sound } from '$lib/sound/index.svelte';
	import { announceReward } from '$lib/game/announce';
	import { joinWord } from '$lib/game/words';
	import type { RewardDto } from '$lib/types/api';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let pieces = $state(data.pieces.map((p) => ({ ...p })));
	// svelte-ignore state_referenced_locally
	let total = $state(data.total);

	/** 앞칸 / 뒤칸에 놓인 조각 id */
	let slots = $state<(number | null)[]>([null, null]);
	let busy = $state(false);
	let shake = $state(0);
	let made = $state<string[]>([]);
	let finished = $state(false);
	let restarting = $state(false);

	let revealed = $state<{
		word: string;
		reading: string;
		meaning: string;
		alreadyKnown: boolean;
	} | null>(null);

	const charOf = (id: number | null) => pieces.find((p) => p.id === id)?.character ?? '';
	const ready = $derived(slots[0] !== null && slots[1] !== null && !busy);
	const inSlots = $derived(slots.filter((s): s is number => s !== null));

	/*
	 * **도움은 판당 두 번.** 대결·복습과 같은 규칙이다.
	 * 다 써도 죽지 않는다 — 앞 글자 하나만 짚어 준다.
	 */
	const HINT_BUDGET = 2;
	let hintLeft = $state(HINT_BUDGET);
	let hinted = $state<number[]>([]);

	/** 판에 남은 조각으로 만들 수 있는 낱말 하나를 찾는다 */
	function findMakeable(): { head: number; tail: number } | null {
		for (const a of pieces) {
			for (const b of pieces) {
				if (a.id === b.id) continue;
				if (joinWord(a.character, b.character)) return { head: a.id, tail: b.id };
			}
		}
		return null;
	}

	function askHint() {
		sound.play('click');
		const pair = findMakeable();
		if (!pair) return; // 짚을 것이 없으면 예산을 쓰지 않는다
		if (hintLeft > 0) {
			hinted = [pair.head, pair.tail];
			hintLeft -= 1;
		} else {
			// 약한 도움 — 앞 글자만. 무제한이다
			hinted = [pair.head];
		}
	}

	function place(id: number) {
		if (busy || revealed) return;
		if (inSlots.includes(id)) return;
		const at = slots[0] === null ? 0 : slots[1] === null ? 1 : -1;
		if (at < 0) return;
		slots[at] = id;
		hinted = [];
		sound.play('click');
	}

	function takeBack(at: number) {
		if (busy || revealed) return;
		slots[at] = null;
	}

	function clearSlots() {
		slots = [null, null];
		hinted = [];
	}

	function nextRound() {
		revealed = null;
		clearSlots();
		if (pieces.length === 0) finished = true;
	}

	async function restart() {
		if (restarting) return;
		restarting = true;
		try {
			// 회차를 올린다 — 안 그러면 방금 비운 것과 똑같은 판을 다시 받는다
			await goto(`?focus=${encodeURIComponent(data.focus ?? '')}&r=${(data.round ?? 0) + 1}`, {
				invalidateAll: true,
				noScroll: true
			});
			pieces = data.pieces.map((p) => ({ ...p }));
			total = data.total;
			made = [];
			revealed = null;
			finished = false;
			hintLeft = HINT_BUDGET;
			clearSlots();
		} finally {
			restarting = false;
		}
	}
</script>

<svelte:head>
	<title>낱말 만들기 · 마법한자탐험대</title>
</svelte:head>

<!--
	낱말 만들기 — **배운 글자가 실제로 쓰이는 자리를 보여 준다.**

	합체는 아이가 배운 글자의 5%만 건드린다. 室 을 파내도 놀이에 영영 안 나온다.
	그런데 敎室 은 된다 — 낱말 축은 1000자 중 955자를 덮는다.

	합체와 다른 점 하나: **자리가 있다.** 敎 가 앞, 室 이 뒤다.
	그래서 판정이 "붙는가" 가 아니라 "제자리에 놓았는가" 다.
	순서가 틀렸다고 혼내지 않는다 — 아직 안 채운 칸일 뿐이다.
-->
<AppShell nav={false}>
	<div class="word-grid">
		<header class="flex items-center gap-2">
			<a href="/" class="exit" aria-label="모험 지도로 나가기">✕</a>
			<Badge tone="mint" size="sm">낱말 {made.length} / {total}</Badge>
			{#if !finished && pieces.length > 0 && !revealed}
				<HelpButton
					onclick={askHint}
					left={hintLeft}
					total={HINT_BUDGET}
					disabled={busy}
					class="ml-auto"
				/>
			{/if}
		</header>

		{#if data.pieces.length === 0}
			<EmptyState
				icon="📖"
				title="아직 만들 수 있는 낱말이 없어요"
				description="낱말은 배운 글자 두 개로 만들어요. 한자를 조금 더 배우면 여기서 만나요."
			>
				{#snippet action()}
					<Button variant="magic" href="/learn">한자 배우러 가기</Button>
					<Button variant="ghost" href="/">모험 지도로</Button>
				{/snippet}
			</EmptyState>
		{:else if finished}
			<div class="done" data-testid="word-finished">
				<h2 class="text-display-lg text-mint-600">낱말을 다 만들었어요!</h2>
				{#if made.length > 0}
					<p class="made">
						{#each made as w, i (i)}<span class="hanja">{w}</span>{/each}
					</p>
				{/if}
				<div class="flex flex-wrap justify-center gap-3">
					<Button variant="mint" size="lg" onclick={restart} loading={restarting}>한 판 더!</Button>
					<Button variant="magic" size="lg" href="/fusion">합체 공방</Button>
					<Button variant="ghost" size="lg" href="/">모험 지도로</Button>
				</div>
			</div>
		{:else}
			<p class="howto">
				<span aria-hidden="true">📖</span>
				{#if data.focused}
					방금 배운 <span class="hanja">{data.focus}</span> 로 낱말을 만들 수 있어요
				{:else}
					글자 두 개를 앞뒤로 놓아 낱말을 만들어 보세요
				{/if}
			</p>

			<section class="stage relative isolate" data-testid="word-stage">
				<Sparkle count={5} />

				{#if revealed}
					<div class="reveal" data-testid="word-made">
						<p class="font-display text-sm text-mint-600">
							{revealed.alreadyKnown ? '다시 만들었어요' : '새 낱말을 만들었어요!'}
						</p>
						<p class="hanja word-big">{revealed.word}</p>
						<p class="font-display text-xl text-ink-900">{revealed.reading}</p>
						<p class="text-sm text-ink-700">{revealed.meaning}</p>
						<Button variant="mint" size="md" onclick={nextRound}>좋아!</Button>
					</div>
				{:else}
					<!-- 앞칸 · 뒤칸. 자리가 보이니 순서를 말로 설명할 필요가 없다 -->
					<div class="frame" data-shake={shake}>
						{#each [0, 1] as at (at)}
							<button
								type="button"
								class="cell"
								class:filled={slots[at] !== null}
								data-cell={at}
								onclick={() => takeBack(at)}
								aria-label={slots[at] !== null
									? `${charOf(slots[at])} 빼기`
									: at === 0
										? '앞 글자 자리'
										: '뒤 글자 자리'}
							>
								{#if slots[at] !== null}
									<span class="hanja cell-char">{charOf(slots[at])}</span>
								{:else}
									<span class="cell-hint" aria-hidden="true">{at === 0 ? '앞' : '뒤'}</span>
								{/if}
							</button>
						{/each}
					</div>

					<form
						method="POST"
						action="?focus={encodeURIComponent(data.focus ?? '')}&r={data.round ?? 0}&/make"
						use:enhance={() => {
							busy = true;
							hinted = [];
							return async ({ result }) => {
								busy = false;

								if (result.type === 'redirect') return applyAction(result);
								if (result.type === 'error' || result.type === 'failure') {
									toasts.warn('연결이 잠깐 끊겼어요. 다시 해 보세요.');
									return;
								}

								const payload = result.data as {
									ok: boolean;
									reason?: string;
									word?: string;
									reading?: string;
									meaning?: string;
									alreadyKnown?: boolean;
									reward?: RewardDto | null;
								};

								if (!payload.ok) {
									/*
									 * 안 되는 짝이다. **순서가 틀렸다고 말하지 않는다** —
									 * 그 순간 이 화면은 시험지가 된다. 자리를 비워 다시 놓게 할 뿐이다.
									 */
									shake += 1;
									sound.play('click');
									if (payload.reason === 'not-target' && payload.word) {
										toasts.success(`${payload.word}! 만들었어요.`, '📖');
									}
									setTimeout(clearSlots, 320);
									return;
								}

								sound.play('discover');
								made = [...made, payload.word!];
								pieces = pieces.filter((p) => !inSlots.includes(p.id));
								slots = [null, null];
								revealed = {
									word: payload.word!,
									reading: payload.reading!,
									meaning: payload.meaning!,
									alreadyKnown: !!payload.alreadyKnown
								};
								if (payload.reward) announceReward(payload.reward, data.user.characterClass);
							};
						}}
					>
						<input type="hidden" name="head" value={charOf(slots[0])} />
						<input type="hidden" name="tail" value={charOf(slots[1])} />
						<div class="actions">
							<Button variant="mint" size="lg" type="submit" disabled={!ready} loading={busy}>
								낱말 만들기!
							</Button>
							{#if inSlots.length > 0}
								<Button variant="ghost" size="lg" onclick={clearSlots}>비우기</Button>
							{/if}
						</div>
					</form>
				{/if}
			</section>

			{#if !revealed}
				<section class="tray" aria-label="글자">
					<div class="chars">
						{#each pieces as piece (piece.id)}
							<button
								type="button"
								class="char tappable"
								class:used={inSlots.includes(piece.id)}
								data-piece-id={piece.id}
								data-hint={hinted.includes(piece.id) || undefined}
								onclick={() => place(piece.id)}
								disabled={busy || inSlots.includes(piece.id)}
								use:draggable={{
									dropSelector: '.cell',
									value: String(piece.id),
									disabled: busy || inSlots.includes(piece.id),
									onLift: () => sound.play('click'),
									onDrop: (value) => place(Number(value))
								}}
								aria-label={piece.character}
							>
								<PictoGlyph character={piece.character} stage={2} size={40} label="" />
							</button>
						{/each}
					</div>
				</section>
			{/if}
		{/if}

		{#if data.makeable > 0 && !finished}
			<p class="tally">
				지금 만들 수 있는 낱말 {data.makeable}개 · 만들어 본 것 {data.madeTotal}개
			</p>
		{/if}
	</div>
</AppShell>

<style>
	.word-grid {
		display: grid;
		grid-template-rows: auto auto auto 1fr auto;
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
		color: var(--color-mint-300, #7ae2be);
		font-size: 1.1rem;
	}

	.stage {
		display: grid;
		place-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-panel);
		background: linear-gradient(180deg, #eef9f5 0%, #f2f7ff 100%);
		box-shadow: var(--shadow-card);
	}

	/* 앞칸 · 뒤칸 */
	.frame {
		display: flex;
		gap: 0.5rem;
	}

	.cell {
		display: grid;
		width: 5rem;
		height: 5rem;
		place-items: center;
		border: 3px dashed var(--color-mint-400);
		border-radius: var(--radius-button);
		background: rgb(255 255 255 / 0.8);
		cursor: pointer;
	}

	.cell.filled {
		border-style: solid;
		background: #fff;
	}

	.cell-char {
		font-size: 2.6rem;
		line-height: 1;
		color: var(--color-magic-800);
	}

	.cell-hint {
		color: var(--color-mint-600);
		font-size: 0.9rem;
	}

	.actions {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	.reveal {
		display: grid;
		justify-items: center;
		gap: 0.4rem;
		text-align: center;
	}

	.word-big {
		font-size: 3.4rem;
		line-height: 1;
		color: var(--color-magic-800);
	}

	.tray {
		display: grid;
		min-height: 0;
		align-content: start;
		overflow-y: auto;
	}

	.chars {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
		gap: 0.5rem;
	}

	.char {
		display: grid;
		place-items: center;
		/* 아이 손가락 기준 하한선보다 넉넉하게 */
		min-height: 4rem;
		border: 3px solid var(--color-mint-200, #b6ede0);
		border-radius: var(--radius-button);
		background: #fff;
		cursor: pointer;
		transition: border-color 0.15s ease;
	}

	.char:disabled {
		cursor: default;
		opacity: 0.35;
	}

	/* 도움이 짚어 준 글자 — 판의 금색 링과 같은 모양이어야 한다 */
	.char[data-hint] {
		border-color: var(--color-gold-400);
		box-shadow:
			0 0 0 6px rgb(255 209 102 / 0.5),
			0 5px 0 var(--color-gold-400);
	}

	.done {
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border-radius: var(--radius-panel);
		background: linear-gradient(180deg, #eef9f5 0%, #f6ecff 100%);
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
		font-size: 1.8rem;
		color: var(--color-magic-800);
	}

	.tally {
		color: rgb(255 255 255 / 0.75);
		font-size: 0.72rem;
		text-align: center;
	}
</style>
