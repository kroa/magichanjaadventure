<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toasts } from '$lib/stores/toast.svelte';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import ParticleBurst from '$lib/components/effects/ParticleBurst.svelte';
	import { announceReward } from '$lib/game/announce';
	import { sound } from '$lib/sound/index.svelte';
	import { draggable } from '$lib/actions/draggable';
	import GlyphFrame from '$lib/components/play/GlyphFrame.svelte';
	import SpeechBubble from '$lib/components/common/SpeechBubble.svelte';
	import HelpButton from '$lib/components/common/HelpButton.svelte';
	import PictoGlyph from '$lib/components/play/PictoGlyph.svelte';
	import { fadeStage } from '$lib/art/pictographs';
	import { mergeInto, popIn } from '$lib/anim/merge';
	import {
		FUSION_RECIPES,
		allResultChars,
		findWorkshopHint,
		fuse,
		recipeFor
	} from '$lib/game/fusion';
	import type { RewardDto } from '$lib/types/api';

	let { data } = $props();

	/** 조합표에서 가장 많은 재료 수. 합체판 칸 수를 여기서 끌어온다. */
	const SLOTS = Math.max(...FUSION_RECIPES.map((r) => r.parts.length));
	const TOTAL_DISCOVERABLE = allResultChars().length;

	let slots = $state<string[]>([]);
	/** 자동 제출용 폼 참조 — 아래 place() 가 대신 눌러 준다 */
	let fuseForm = $state<HTMLFormElement | null>(null);
	/** 합쳐지는 연출에 쓸 DOM 참조 */
	let slotEls = $state<(HTMLElement | null)[]>([]);
	let anvil = $state<HTMLElement | null>(null);
	let revealEl = $state<HTMLElement | null>(null);
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

	/*
	 * 공방에는 목표가 없다. 그래서 칸 모양을 미리 알 수 없다.
	 * 놓인 부품으로 만들 수 있는 조합이 보이면 그 모양으로 칸이 **변한다** —
	 * 아이가 "어, 칸이 바뀌었네?" 하고 알아채는 것 자체가 단서가 된다.
	 */
	const frameLayout = $derived(fuse(slots)?.layout ?? 'lr');
	/** 부품별 숙련도 — 칸 안의 조각도 그림으로 그릴지 여기서 정한다 */
	const masteryMap = $derived(
		Object.fromEntries(data.parts.map((p) => [p.character, p.mastery])) as Record<string, number>
	);

	/** 결과에서 조합법을 되찾아 "무엇과 무엇이 합쳐졌는지" 를 보여 준다 */
	const madeRecipe = $derived(made ? recipeFor(made.character) : null);

	/*
	 * **안 붙는 조합에도 말은 해 준다.**
	 *
	 * 원래는 일부러 아무 말도 안 했다. "여기서 «틀렸어요» 를 띄우면 이 화면은 다시 시험지가 된다"
	 * 는 이유였는데, 실제로 써 본 결과 아이는 **아무 일도 안 일어났다**고 받아들였다.
	 * 침묵은 관대함이 아니라 그냥 정보가 없는 것이다.
	 *
	 * 그래서 말은 하되 채점은 하지 않는다:
	 *  - 주어가 아이가 아니라 부품이다 ("네가 틀렸다" 가 아니라 "이 둘은 안 붙는다")
	 *  - 빨강·X·오답 소리 없음. 실패 횟수를 세지도 보여 주지도 않는다
	 *  - 닫기 버튼이 없다 — 닫아야 하는 오답 창은 그 자체로 채점 절차다
	 */
	let failMessage = $state('');
	let failGen = 0;

	/*
	 * 도움 — 붙는 짝을 **빛내 줄 뿐 놓아 주지 않는다.** 마지막 손가락은 아이 것이다.
	 *
	 * 끄는 시점은 판(PieceBoard)과 같게 맞춘다: 합체를 시도하거나 비울 때.
	 * 3초 자동 소등 같은 걸 여기만 쓰면 화면마다 도움의 수명이 달라진다.
	 * 값도 매기지 않는다 — 대결의 도움이 공짜이고 별 계산에도 안 들어간다.
	 */
	let hinted = $state<string[]>([]);
	const hintable = $derived(findWorkshopHint(data.parts, data.discovered, slots[0]) !== null);

	function askHint() {
		sound.play('click');
		clearFail();
		// 칸이 차 있으면 비운다 — 안 그러면 눌리지 않는 타일에 금색 링만 켜진다
		if (slots.length >= SLOTS) slots = [];
		hinted = findWorkshopHint(data.parts, data.discovered, slots[0]) ?? [];

		const first = hinted[0];
		if (!first) return;
		// 서랍은 스크롤된다. 빛나는 첫 타일이 화면 밖이면 도움이 아니다.
		requestAnimationFrame(() => {
			document
				.querySelector(`.part[data-part="${CSS.escape(first)}"]`)
				?.scrollIntoView({ block: 'nearest' });
		});
	}

	function clearFail() {
		failGen += 1;
		failMessage = '';
	}

	function notJoinable() {
		shake += 1;
		sound.play('click');
		// 흔들기(320ms)가 끝난 뒤에 말한다. 몸이 먼저, 글자가 나중이다.
		const gen = ++failGen;
		setTimeout(() => {
			if (gen !== failGen) return;
			slots = [];
			failMessage = '이 둘은 아직 안 붙어요';
			setTimeout(() => {
				if (gen === failGen) failMessage = '';
			}, 1800);
		}, 320);
	}

	function place(character: string) {
		if (busy || made) return;
		if (slots.length >= SLOTS) return;
		clearFail();
		slots = [...slots, character];
		sound.play('click');

		/*
		 * **칸이 차면 바로 판정한다.**
		 *
		 * 예전에는 「합체!」 버튼을 한 번 더 눌러야 했다. 대결과 복습은 조각 두 개를
		 * 놓는 순간 바로 판정하는데 여기만 제출 단계가 하나 더 있었던 셈이다 —
		 * 아이 입장에서 이 화면만 "폼" 이었고, 그게 공방이 게임 같지 않던 가장 큰 이유다.
		 *
		 * 버튼은 남긴다. 키보드 사용자와 JS 가 죽은 경우의 길이다.
		 */
		if (slots.length >= SLOTS) {
			requestAnimationFrame(() => fuseForm?.requestSubmit());
		}
	}

	function removeAt(index: number) {
		if (busy || made) return;
		clearFail();
		slots = slots.filter((_, i) => i !== index);
	}

	function clearSlots() {
		clearFail();
		hinted = [];
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
	 - 안 붙는 조합에 **벌은 주지 않되 말은 해 준다.** 흔들고 나서 "이 둘은 아직 안 붙어요" 한 줄.
	   예전에는 아예 침묵했는데, 아이에게는 그게 관대함이 아니라 "아무 일도 안 일어남" 이었다
	 - 채점하지 않는다: 빨강·X·오답 소리 없고, 실패 횟수를 세지도 보여 주지도 않는다
	 - 막히면 `?` 로 붙는 짝을 짚어 준다. 값은 매기지 않는다 (대결도 힌트가 공짜다)
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
				<h1 class="font-display text-lg text-white">합체 공방</h1>
				<span class="ml-auto shrink-0">
					<Badge tone="gold" size="sm">
						발견 {data.discovered.length} / {TOTAL_DISCOVERABLE}
					</Badge>
				</span>
				<!--
					켜는 기준은 `data.remaining > 0` 이 아니라 **짚을 짝이 실제로 있는가**다.
					둘은 어긋날 수 있고, 어긋나는 순간 눌러도 아무것도 안 빛나는 죽은 버튼이 된다.
				-->
				{#if hintable && !made}
					<HelpButton onclick={askHint} />
				{/if}
			</header>

			<!-- 합체판 -->
			<section class="board relative isolate" bind:this={anvil} data-testid="fusion-board">
				<Sparkle count={6} />
				<ParticleBurst trigger={burst} />

				{#if made}
					<!-- 발견! 이 순간이 이 게임의 보상이다 -->
					<div class="reveal" bind:this={revealEl} data-testid="fusion-reveal">
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
					<GlyphFrame
						layout={frameLayout}
						values={Array.from({ length: SLOTS }, (_, i) => slots[i] ?? null)}
						onRemove={removeAt}
						{shake}
						mastery={masteryMap}
						bind:slots={slotEls}
					/>

					<!--
						자리를 미리 잡아 둔다. 말풍선이 떴다 사라질 때 문서 흐름에 끼어들면
						「합체!」 버튼이 아이 손가락 아래에서 두 번 움직인다.
					-->
					<div class="fail-slot" aria-live="polite" role="status">
						{#if failMessage}
							<span class="fail-in" data-testid="fusion-nojoin">
								<SpeechBubble tone="magic" tail="none">
									<span class="font-display text-base text-ink-900">{failMessage}</span>
								</SpeechBubble>
							</span>
						{/if}
					</div>

					<form
						bind:this={fuseForm}
						method="POST"
						action="?/fuse"
						use:enhance={() => {
							busy = true;
							// 도움은 판과 같은 시점에 꺼진다 — 붙여 보는 순간
							hinted = [];
							return async ({ result, update }) => {
								busy = false;

								/*
								 * **세 갈래를 갈라 쓴다.**
								 * 예전에는 `result.type !== 'success'` 를 통째로 실패로 뭉갰다.
								 * 그래서 네트워크 끊김·세션 만료·"안 붙는 조합" 이 똑같은 흔들림 하나로 보였고,
								 * 특히 세션이 끊기면 액션이 /login 리다이렉트를 내는데도 화면에 갇혔다.
								 */
								if (result.type === 'redirect') return applyAction(result);
								if (result.type === 'error' || result.type === 'failure') {
									toasts.warn('연결이 잠깐 끊겼어요. 다시 해 보세요.');
									return; // 부품은 판에 그대로 둔다 — 아이 잘못이 아니다
								}

								const payload = result.data as {
									ok: boolean;
									character?: string;
									reading?: string;
									meaning?: string;
									story?: string;
									alreadyKnown?: boolean;
									reward?: RewardDto | null;
								};

								if (!payload.ok) {
									notJoinable();
									return;
								}

								/*
								 * **조각이 실제로 만나는 것을 보여 준다.**
								 * 예전에는 결과가 툭 나타나서, 합체라고 이름 붙였어도
								 * 아이 눈에는 정답 판정과 구별되지 않았다.
								 */
								const flying = slotEls.filter((el): el is HTMLElement => !!el);
								if (anvil) await mergeInto(flying, anvil);

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
								if (revealEl) void popIn(revealEl);
							};
						}}
					>
						{#each slots as part, i (i)}
							<input type="hidden" name="part" value={part} />
						{/each}
						<div class="actions">
							<!--
								칸이 차면 자동으로 제출되므로 이 버튼은 이제 **보조 경로**다.
								키보드 사용자와 JS 가 죽은 경우를 위해 남겨 둔다.
							-->
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
				<!--
					**무엇을 하는 곳인지 한 줄로 알린다.**
					원래도 안내가 있었지만 작은 회색 글씨라, 배경이 어두워지면서 아예 안 보였다.
					안내는 있느냐 없느냐가 아니라 **읽히느냐**가 기준이다.
				-->
				<p class="howto">
					{#if hintable}
						<span aria-hidden="true">🧪</span>
						배운 한자가 부품이 돼요. 두 개를 붙이면 새 한자가 만들어져요
						{#if data.lockedPartCount > 0}
							<span class="locked">· 아직 못 배운 부품 {data.lockedPartCount}개</span>
						{/if}
					{:else}
						<!-- 짚어 줄 짝이 없으면 `?` 도 사라진다. 그럴 땐 왜 없는지를 말해 준다 -->
						<span aria-hidden="true">🎉</span>
						여기서 만들 수 있는 건 다 만들었어요 · 배우기에서 부품을 더 모아 볼까요?
					{/if}
				</p>
				<div class="parts">
					{#each data.parts as part (part.character)}
						<button
							type="button"
							class="part tappable"
							data-part={part.character}
							data-hint={hinted.includes(part.character) ? '' : undefined}
							onclick={() => place(part.character)}
							use:draggable={{
								dropSelector: '.cell, .frame',
								value: part.character,
								disabled: busy || !!made || slots.length >= SLOTS,
								onLift: () => sound.play('click'),
								onDrop: (character) => place(character)
							}}
							disabled={busy || !!made || slots.length >= SLOTS}
						>
							<!--
									글자가 아니라 **그림**으로 보여 준다. 뜻·음 글씨도 여기서 뺐다.
									아이가 처음 만나는 부품에 `날 일` 이라고 써 붙이면 그건 교재지 게임이 아니다.
									익숙해지면(mastery) 그림이 조용히 글자로 바뀐다.
								-->
							<PictoGlyph
								character={part.character}
								stage={fadeStage(part.mastery)}
								size={38}
								label="{part.meaning} {part.reading}"
							/>
							{#if fadeStage(part.mastery) === 2}
								<span class="font-display text-[0.6rem] text-ink-500">
									{part.meaning}
									{part.reading}
								</span>
							{/if}
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

	.actions {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	/*
	 * 실패 한 줄이 들어갈 자리.
	 * 높이를 미리 잡아 두어야 말풍선이 떴다 사라질 때 「합체!」 버튼이 안 움직인다.
	 */
	.fail-slot {
		display: grid;
		place-items: center;
		min-height: 3.25rem;
	}

	.fail-in {
		animation: fail-rise 0.22s var(--ease-pop, cubic-bezier(0.34, 1.56, 0.64, 1));
	}

	@keyframes fail-rise {
		from {
			transform: translateY(6px);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fail-in {
			animation: none;
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
		display: grid;
		min-height: 0;
		align-content: start;
		gap: 0.5rem;
		overflow-y: auto;
	}

	.howto {
		display: flex;
		flex-wrap: wrap;
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

	.howto .locked {
		color: rgb(255 255 255 / 0.65);
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

	/*
	 * 끌고 있는 동안은 트랜지션을 끈다.
	 * 안 그러면 오버슈트 이징이 손가락 추적을 150ms 뭉개서 조각이 미끄러지는 느낌이 난다.
	 */
	:global(.part[data-dragging]) {
		transition: none;
		cursor: grabbing;
		filter: drop-shadow(0 8px 14px rgb(60 40 120 / 0.35));
	}

	.part:hover:not(:disabled) {
		transform: translateY(-2px);
		border-color: var(--color-magic-400);
	}

	/* 도움이 짚어 준 부품. 판(PieceBoard)의 금색 링과 **같은 모양**이어야 한다 */
	.part[data-hint] {
		border-color: var(--color-gold-400);
		box-shadow:
			0 0 0 6px rgb(255 209 102 / 0.5),
			0 5px 0 var(--color-gold-400);
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
	}
</style>
