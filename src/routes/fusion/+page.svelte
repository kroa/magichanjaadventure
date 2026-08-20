<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import ParticleBurst from '$lib/components/effects/ParticleBurst.svelte';
	import { announceReward } from '$lib/game/announce';
	import { sound } from '$lib/sound/index.svelte';
	import { FUSION_RECIPES, allResultChars, fuse, recipeFor } from '$lib/game/fusion';
	import type { RewardDto } from '$lib/types/api';

	let { data } = $props();

	/** 조합표에서 가장 많은 재료 수. 합체판 칸 수를 여기서 끌어온다. */
	const SLOTS = Math.max(...FUSION_RECIPES.map((r) => r.parts.length));
	const TOTAL_DISCOVERABLE = allResultChars().length;

	let slots = $state<string[]>([]);
	let busy = $state(false);
	let shake = $state(0);
	let burst = $state(0);

	/** 합체에 성공해 새 한자가 나왔을 때 보여 줄 것 */
	let made = $state<{
		character: string;
		reading: string;
		meaning: string;
		story: string;
		alreadyKnown: boolean;
	} | null>(null);

	const ready = $derived(slots.length >= 2 && !busy);

	/*
	 * 화면은 즉시 반응하려고 같은 함수를 한 번 더 돌린다.
	 * **판정의 주인은 서버다** — 여기 결과는 애니메이션을 고르는 데만 쓴다.
	 */
	const looksValid = $derived(fuse(slots) !== null);

	/** 결과에서 조합법을 되찾아 "무엇과 무엇이 합쳐졌는지" 를 보여 준다 */
	const madeRecipe = $derived(made ? recipeFor(made.character) : null);

	function place(character: string) {
		if (busy || made) return;
		if (slots.length >= SLOTS) return;
		slots = [...slots, character];
		sound.play('click');
	}

	function removeAt(index: number) {
		if (busy || made) return;
		slots = slots.filter((_, i) => i !== index);
	}

	function clearSlots() {
		slots = [];
	}

	async function closeReveal() {
		made = null;
		slots = [];
		// 새로 얻은 한자가 곧바로 재료가 되어야 한다 (林 을 만들면 森 으로 가는 길이 열리듯)
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>한자 합체 공방 · 마법한자탐험대</title>
</svelte:head>

<!--
	합체 공방 — 이 게임의 핵심 화면.

	퀴즈처럼 "문제를 내고 맞히게" 하지 않는다. 아이는 부품을 붙여 보고 무엇이 되는지 발견한다.
	 - 틀린 조합에 아무 벌도 주지 않는다. 살짝 흔들리고 되돌아올 뿐, "틀렸어요" 라고 말하지 않는다
	 - 그래야 마음 놓고 아무거나 붙여 보고, 붙여 봐야 발견이 일어난다
	 - 집중 모드라 메뉴를 숨기고 나가기 버튼을 둔다 (퀴즈·대결과 같은 규칙)
-->
<AppShell nav={false}>
	{#if data.parts.length < 2}
		<EmptyState
			icon="🧪"
			title="아직 합칠 부품이 모자라요"
			description="한자를 두 자 이상 배우면 공방에서 합체를 할 수 있어요."
		>
			{#snippet action()}
				<Button variant="magic" href="/learn">한자 배우러 가기</Button>
				<Button variant="ghost" href="/">모험 지도로</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="workshop">
			<header class="flex items-center gap-2">
				<a href="/" class="exit" aria-label="모험 지도로 나가기">✕</a>
				<h1 class="font-display text-lg text-magic-700">합체 공방</h1>
				<span class="ml-auto shrink-0">
					<Badge tone="gold" size="sm">
						발견 {data.discovered.length} / {TOTAL_DISCOVERABLE}
					</Badge>
				</span>
			</header>

			<!-- 합체판 -->
			<section class="board relative isolate" data-testid="fusion-board">
				<Sparkle count={6} />
				<ParticleBurst trigger={burst} />

				{#if made}
					<!-- 발견! 이 순간이 이 게임의 보상이다 -->
					<div class="reveal" data-testid="fusion-reveal">
						<p class="font-display text-sm text-magic-500">
							{made.alreadyKnown ? '다시 만들었어요' : '새 한자를 만들었어요!'}
						</p>

						<!--
							무엇과 무엇이 합쳐졌는지를 결과 옆에 남겨 둔다.
							이 줄이 없으면 아이는 글자만 받고 **왜 그 글자가 됐는지**를 놓친다.
						-->
						{#if madeRecipe}
							<p
								class="equation"
								aria-label="{madeRecipe.parts.join(' 더하기 ')} 는 {made.character}"
							>
								{#each madeRecipe.parts as part, i (i)}
									{#if i > 0}<span class="op" aria-hidden="true">+</span>{/if}
									<span class="hanja small">{part}</span>
								{/each}
								<span class="op" aria-hidden="true">=</span>
								<span class="hanja big text-magic-800">{made.character}</span>
							</p>
						{:else}
							<p class="hanja big text-magic-800">{made.character}</p>
						{/if}

						<p class="font-display text-xl text-ink-900">{made.meaning} {made.reading}</p>
						<p class="story text-sm text-ink-700">{made.story}</p>

						{#if madeRecipe?.soundPart}
							<!-- 같은 부품이 든 글자는 소리가 같다. 글로 설명하지 않고 나란히 보여 준다 -->
							<p class="sound-hint">
								<span class="hanja">{madeRecipe.soundPart}</span>
								<span>가 소리를 맡아요</span>
							</p>
						{/if}

						<Button variant="magic" size="md" onclick={closeReveal}>좋아!</Button>
					</div>
				{:else}
					<div class="slots" class:shake={shake > 0} data-shake={shake}>
						{#each Array(SLOTS) as _, i (i)}
							{@const char = slots[i]}
							{#if char}
								<button
									type="button"
									class="slot filled hanja"
									onclick={() => removeAt(i)}
									aria-label="{char} 빼기"
								>
									{char}
								</button>
							{:else}
								<span class="slot empty" aria-hidden="true"></span>
							{/if}
							{#if i < SLOTS - 1}
								<span class="plus font-display" aria-hidden="true">+</span>
							{/if}
						{/each}
					</div>

					<form
						method="POST"
						action="?/fuse"
						use:enhance={() => {
							busy = true;
							return async ({ result, update }) => {
								busy = false;
								const payload =
									result.type === 'success'
										? (result.data as {
												ok: boolean;
												character?: string;
												reading?: string;
												meaning?: string;
												story?: string;
												alreadyKnown?: boolean;
												reward?: RewardDto | null;
											})
										: { ok: false };

								if (!payload.ok) {
									/*
									 * 실패해도 아무 말도 하지 않는다.
									 * 살짝 흔들고 부품을 되돌릴 뿐이다 — 여기서 "틀렸어요" 를 띄우면
									 * 이 화면은 다시 시험지가 된다.
									 */
									shake += 1;
									sound.play('click');
									setTimeout(() => {
										slots = [];
									}, 320);
									return;
								}

								burst += 1;
								sound.play('discover');
								made = {
									character: payload.character!,
									reading: payload.reading!,
									meaning: payload.meaning!,
									story: payload.story!,
									alreadyKnown: !!payload.alreadyKnown
								};
								if (payload.reward) {
									announceReward(payload.reward, data.user.characterClass);
								}
								await update({ reset: false });
							};
						}}
					>
						{#each slots as part, i (i)}
							<input type="hidden" name="part" value={part} />
						{/each}
						<div class="actions">
							<Button
								variant={looksValid ? 'gold' : 'magic'}
								size="lg"
								type="submit"
								disabled={!ready}
								loading={busy}
							>
								합체!
							</Button>
							{#if slots.length > 0}
								<Button variant="ghost" size="lg" onclick={clearSlots}>비우기</Button>
							{/if}
						</div>
					</form>
				{/if}
			</section>

			<!-- 부품 서랍 -->
			<section class="tray" aria-label="부품 서랍">
				<p class="mb-1 text-xs text-ink-500">
					배운 한자가 부품이 돼요. 두 개를 골라 붙여 보세요.
					{#if data.lockedPartCount > 0}
						<span class="text-magic-500">아직 못 배운 부품 {data.lockedPartCount}개</span>
					{/if}
				</p>
				<div class="parts">
					{#each data.parts as part (part.character)}
						<button
							type="button"
							class="part"
							onclick={() => place(part.character)}
							disabled={busy || !!made || slots.length >= SLOTS}
						>
							<span class="hanja text-2xl leading-none">{part.character}</span>
							<span class="font-display text-[0.65rem] text-ink-500">
								{part.meaning}
								{part.reading}
							</span>
						</button>
					{/each}
				</div>
			</section>
		</div>
	{/if}
</AppShell>

<style>
	/* 한 화면에 담는다: 머리글·합체판은 제 높이, 부품 서랍이 남는 공간을 먹고 스크롤한다 */
	.workshop {
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

	.board {
		display: grid;
		place-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-panel);
		background: linear-gradient(180deg, #eef4ff 0%, #f6ecff 100%);
		box-shadow: var(--shadow-card);
	}

	.slots {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.slot {
		display: grid;
		place-items: center;
		width: 4.5rem;
		height: 4.5rem;
		border-radius: var(--radius-button);
		font-size: 2.25rem;
		line-height: 1;
	}

	.slot.empty {
		border: 3px dashed var(--color-magic-200);
		background: rgb(255 255 255 / 0.5);
	}

	.slot.filled {
		border: 3px solid var(--color-magic-400);
		background: #fff;
		color: var(--color-magic-800);
		cursor: pointer;
		box-shadow: 0 4px 0 var(--color-magic-200);
	}

	.plus {
		font-size: 1.5rem;
		color: var(--color-magic-400);
	}

	.actions {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	/* 실패했을 때. 짧게 흔들고 끝낸다 — 실패를 오래 붙들지 않는다 */
	.shake {
		animation: fusion-shake 0.32s ease;
	}

	@keyframes fusion-shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-7px);
		}
		75% {
			transform: translateX(7px);
		}
	}

	.reveal {
		display: grid;
		justify-items: center;
		gap: 0.4rem;
		text-align: center;
	}

	.equation {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	.equation .op {
		font-size: 1.25rem;
		color: var(--color-magic-400);
	}

	/* 재료는 작게, 결과는 크게. 눈이 자연스럽게 결과로 흐른다 */
	.hanja.small {
		font-size: 1.75rem;
		line-height: 1;
		color: var(--color-ink-500);
	}

	.hanja.big {
		font-size: 4.5rem;
		line-height: 1;
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

	.story {
		max-width: 22rem;
	}

	.tray {
		min-height: 0;
		overflow-y: auto;
	}

	.parts {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
		gap: 0.5rem;
	}

	.part {
		display: grid;
		place-items: center;
		gap: 0.1rem;
		/* 아이 손가락 기준 하한선보다 넉넉하게 */
		min-height: 4rem;
		padding: 0.4rem 0.2rem;
		border: 3px solid var(--color-magic-200);
		border-radius: var(--radius-button);
		background: #fff;
		color: var(--color-ink-900);
		cursor: pointer;
		transition:
			transform 0.15s var(--ease-pop),
			border-color 0.15s ease;
	}

	.part:hover:not(:disabled) {
		transform: translateY(-2px);
		border-color: var(--color-magic-400);
	}

	.part:disabled {
		cursor: default;
		opacity: 0.5;
	}

	@media (min-width: 900px) {
		.workshop {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: auto 1fr;
			grid-template-areas:
				'header header'
				'board  tray';
			gap: 0.75rem 1rem;
		}

		header {
			grid-area: header;
		}

		.board {
			grid-area: board;
			/* 늘리지 않는다. 늘리면 한가운데 작은 칸 둘만 놓인 텅 빈 판이 된다 */
			align-self: center;
		}

		.tray {
			grid-area: tray;
			align-self: start;
		}

		/* 화면이 넓으면 부품도 크게 잡아 준다 */
		.slot {
			width: 6rem;
			height: 6rem;
			font-size: 3rem;
		}
	}
</style>
