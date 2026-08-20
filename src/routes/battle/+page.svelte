<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Chip from '$lib/components/common/Chip.svelte';
	import ProgressBar from '$lib/components/common/ProgressBar.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import ArcherSprite from '$lib/components/art/ArcherSprite.svelte';
	import SageSprite from '$lib/components/art/SageSprite.svelte';
	import FoxSprite from '$lib/components/art/FoxSprite.svelte';
	import MonsterSprite from '$lib/components/art/MonsterSprite.svelte';
	import BattleCanvas from '$lib/components/battle/BattleCanvas.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { toasts } from '$lib/stores/toast.svelte';
	import { announceReward } from '$lib/game/announce';
	import { sound } from '$lib/sound/index.svelte';
	import { fuse, recipeFor } from '$lib/game/fusion';
	import { draggable } from '$lib/actions/draggable';
	import { mergeInto } from '$lib/anim/merge';
	import GlyphFrame from '$lib/components/play/GlyphFrame.svelte';
	import PictoGlyph from '$lib/components/play/PictoGlyph.svelte';
	import { fadeStage } from '$lib/art/pictographs';
	import { MAX_HINT, STAR_LABELS } from '$lib/game/seals';
	import type { Mood } from '$lib/types/ui';
	import type { RewardDto } from '$lib/types/api';

	let { data } = $props();

	const SPRITES = {
		knight: KnightSprite,
		wizard: WizardSprite,
		archer: ArcherSprite,
		sage: SageSprite,
		fox: FoxSprite
	} as const;
	const Hero = $derived(SPRITES[data.user.characterClass ?? 'knight'] ?? KnightSprite);

	const wide = new MediaQuery('(min-width: 900px)');
	const spriteSize = $derived(wide.current ? 150 : 92);

	// ── 대결 상태 ────────────────────────────────────────────────
	// 서버가 내려준 값으로 한 번만 초기화하고, 이후에는 이 화면이 관리한다.
	// svelte-ignore state_referenced_locally
	let seals = $state(data.seals.map((s) => ({ ...s })));
	// svelte-ignore state_referenced_locally
	let playerHp = $state(data.playerHp);
	let sealIndex = $state(0);
	let slots = $state<string[]>([]);
	/** 합쳐지는 연출에 쓸 자리 참조 */
	let slotEls = $state<(HTMLElement | null)[]>([]);
	let frameEl = $state<HTMLElement | null>(null);
	let busy = $state(false);
	let shake = $state(0);
	let hint = $state(0);
	let attempts = $state(0);
	let madeThisBattle = $state<string[]>([]);
	let discoveredNew = $state(false);
	let outcome = $state<'fighting' | 'win'>('fighting');
	let settled = $state(false);
	let stars = $state(0);
	/** 방금 깬 봉인 — 뜻·음·이야기를 여기서 처음 보여 준다 */
	let justBroke = $state<{
		character: string;
		reading: string;
		meaning: string;
		story: string;
	} | null>(null);
	let restarting = $state(false);

	let attackTrigger = $state(0);
	let hitTrigger = $state(0);
	let victoryTrigger = $state(0);
	let lastDamage = $state(0);
	let startedAt = $state(Date.now());

	/** 지금 깨야 할 봉인 */
	const seal = $derived(seals[sealIndex] ?? null);
	const brokenCount = $derived(seals.filter((s) => s.broken).length);
	const enemyHp = $derived(seals.length - brokenCount);

	const heroMood = $derived<Mood>(outcome === 'win' ? 'cheer' : 'happy');
	const enemyMood = $derived<Mood>(outcome === 'win' ? 'sad' : 'happy');

	/** 이 봉인의 정답 부품 (힌트를 켤 때만 쓴다) */
	const answerRecipe = $derived(seal ? recipeFor(seal.character) : null);
	const answerParts = $derived(answerRecipe?.parts ?? []);
	/** 칸이 이 글자의 실제 모양으로 나뉜다 — 그 자체가 가장 큰 단서다 */
	const frameLayout = $derived(answerRecipe?.layout ?? 'lr');
	/** 부품별 숙련도 — 칸 안의 조각도 그림으로 그릴지 여기서 정한다 */
	const masteryMap = $derived(
		Object.fromEntries(data.tray.map((p) => [p.character, p.mastery])) as Record<string, number>
	);

	/** 힌트로 빛나야 하는 부품 */
	const glowing = $derived(
		hint <= 0 ? [] : answerParts.slice(0, hint === 1 ? 1 : answerParts.length)
	);

	/**
	 * 놓은 부품이 목표 글자의 재료인가.
	 *
	 * 맞으면 봉인 카드가 반짝인다. **틀려도 아무 말 하지 않는다** — 그냥 안 빛날 뿐이다.
	 * 이게 있으면 "아무거나 눌러 보기" 가 곧 "이 부품이 이 글자에 쓰이나?" 라는 확인이 되어,
	 * 마구 눌러 보는 것 자체가 분해 연습이 된다.
	 */
	const resonating = $derived(slots.length > 0 && slots.every((p) => answerParts.includes(p)));

	function place(character: string) {
		if (busy || outcome !== 'fighting' || slots.length >= 2) return;
		slots = [...slots, character];
		sound.play('click');
		if (slots.length === 2) void tryAttack();
	}

	function removeAt(index: number) {
		if (busy || outcome !== 'fighting') return;
		slots = slots.filter((_, i) => i !== index);
	}

	/** 도움은 공짜다. 써도 별이 깎이지 않고 보스도 반격하지 않는다. */
	function askHint() {
		if (outcome !== 'fighting') return;
		hint = Math.min(MAX_HINT, hint + 1);
		sound.play('click');
	}

	async function tryAttack() {
		if (busy || !seal) return;

		/*
		 * 조합표에 없는 조합은 **서버에 보내지도 않는다.**
		 * 즉시 흔들고 되돌린다 — 기다림이 없어야 아이가 마음 놓고 계속 시도한다.
		 * 그리고 아무 말도 하지 않는다. 여기서 "틀렸어요" 를 띄우면 이건 다시 시험지가 된다.
		 */
		if (!fuse(slots)) {
			bounce();
			return;
		}

		busy = true;
		attempts += 1;
		try {
			const response = await fetch('/api/battle/seal', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					sessionKey: data.sessionKey,
					areaId: data.area.id,
					sealIndex,
					parts: slots,
					firstTry: attempts === 1 && hint === 0
				})
			});
			if (!response.ok) throw new Error('공격 실패');
			const payload = (await response.json()) as {
				ok: boolean;
				reason?: string;
				character?: string;
				reading?: string;
				meaning?: string;
				story?: string;
				isNew?: boolean;
			};

			if (payload.character && !madeThisBattle.includes(payload.character)) {
				madeThisBattle = [...madeThisBattle, payload.character];
			}
			if (payload.isNew) discoveredNew = true;

			if (!payload.ok) {
				/*
				 * 만들긴 했지만 이 봉인의 목표가 아니다.
				 * 한자는 진짜로 얻었고, 봉인에 금이 가서 도움이 한 칸 열린다.
				 * **에너지는 깎이지 않고 보스도 반격하지 않는다.**
				 */
				if (payload.reason === 'not-target' && payload.character) {
					sound.play('discover');
					toasts.success(`${payload.character}! 만들었어요. 이 봉인은 다른 글자를 원해요.`, '🔮');
					hint = Math.min(MAX_HINT, hint + 1);
				}
				bounce();
				return;
			}

			/*
			 * **조각이 실제로 만나는 것을 보여 준다.**
			 * 이게 없으면 "합체 대결" 인데 화면에는 합체가 없고,
			 * 글자 두 개가 칸에 나타났다가 공이 날아가는 정답 판정으로만 보인다.
			 */
			const flying = slotEls.filter((el): el is HTMLElement => !!el);
			if (frameEl) await mergeInto(flying, frameEl);

			// 봉인 파괴
			lastDamage = 1;
			attackTrigger += 1;
			sound.play('discover');
			seals = seals.map((s, i) => (i === sealIndex ? { ...s, broken: true } : s));
			slots = [];
			// 글자가 무엇이었는지는 **지금** 알려 준다. 만든 것에 대한 보상이다
			justBroke = {
				character: payload.character!,
				reading: payload.reading!,
				meaning: payload.meaning!,
				story: payload.story!
			};

			const remaining = seals.filter((s) => !s.broken);
			if (remaining.length === 0) {
				victoryTrigger += 1;
				await finish();
				return;
			}

			// 보스의 반격. 아이의 실패가 아니라 **성공에 대한 응답**이다
			playerHp = Math.max(1, playerHp - Math.round(data.playerHp * 0.08));
			hitTrigger += 1;

			sealIndex = seals.findIndex((s) => !s.broken);
			hint = 0;
			attempts = 0;
		} catch {
			toasts.warn('연결이 잠깐 끊겼어요. 다시 눌러 주세요.');
			slots = [];
		} finally {
			busy = false;
		}
	}

	/** 부품을 서랍으로 되돌린다. 짧게 흔들고 끝 — 실패를 오래 붙들지 않는다. */
	function bounce() {
		shake += 1;
		sound.play('click');
		setTimeout(() => {
			slots = [];
		}, 320);
	}

	async function finish() {
		if (settled) return;
		settled = true;
		outcome = 'win';

		try {
			const response = await fetch('/api/battle/finish', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					sessionKey: data.sessionKey,
					npcId: data.area.boss.id,
					areaId: data.area.id,
					playerHpLeft: playerHp,
					enemyHpLeft: 0,
					sealCount: seals.length,
					discoveredNew,
					durationMs: Date.now() - startedAt,
					claimedWin: true
				})
			});
			if (!response.ok) return;
			const payload = (await response.json()) as {
				won: boolean;
				stars: number;
				reward: RewardDto | null;
			};

			stars = payload.stars ?? 0;
			sound.play('victory');
			if (payload.reward) announceReward(payload.reward, data.user.characterClass);
		} catch {
			// 기록 실패가 결과 화면을 막지 않게 한다
		}
	}

	/**
	 * 새 대결을 시작한다.
	 *
	 * 같은 URL 로 링크 이동하면 컴포넌트가 재생성되지 않아 결과 화면이 그대로 남는다.
	 * 그래서 새 봉인을 받아온 뒤 상태를 하나씩 되돌린다.
	 * **여기에 새 상태를 빠뜨리면 "다시 대결" 이 또 조용히 깨진다.**
	 */
	async function restart() {
		if (restarting) return;
		restarting = true;
		try {
			await invalidateAll();
			seals = data.seals.map((s) => ({ ...s }));
			playerHp = data.playerHp;
			sealIndex = 0;
			slots = [];
			hint = 0;
			attempts = 0;
			justBroke = null;
			madeThisBattle = [];
			discoveredNew = false;
			outcome = 'fighting';
			settled = false;
			stars = 0;
			lastDamage = 0;
			startedAt = Date.now();
		} finally {
			restarting = false;
		}
	}
</script>

<svelte:head>
	<title>한자 대결 · 마법한자탐험대</title>
</svelte:head>

<!--
	합체 대결 — 보스의 봉인을 합체로 깬다.

	**아이는 질 수 없다.** 이건 실수가 아니라 설계다.
	 - 실패에 벌이 없다: 안 되는 조합은 흔들리고 되돌아올 뿐, 에너지도 안 깎이고 아무 말도 없다
	 - 정답 부품이 항상 서랍에 있다: 서랍을 봉인에서 유도하므로 못 깨는 봉인이 생길 수 없다
	 - 도움은 공짜다: 값을 매기면 아이는 도움을 안 청하고 막힌 채 앉아 있는다
	 - 긴장은 별로 준다: 못 하면 잃는 것이 아니라, 잘하면 더 얻는 것으로
	집중 모드라 메뉴를 숨기고 나가기 버튼을 둔다 (퀴즈·공방과 같은 규칙).
-->
<AppShell nav={false} night={data.area.id >= 6}>
	<div class="stage-grid">
		<header class="flex items-center gap-2">
			<a href="/" class="exit" aria-label="모험 지도로 나가기">✕</a>
			<div class="areas flex gap-2 overflow-x-auto">
				{#each data.areas as area (area.id)}
					<Chip
						selected={area.id === data.area.id}
						onclick={() => (location.href = `/battle?area=${area.id}`)}
					>
						<span aria-hidden="true">{area.emoji}</span>
						{area.name}
					</Chip>
				{/each}
			</div>
		</header>

		<!-- 무대 -->
		<div
			class="stage relative overflow-hidden rounded-panel p-3 shadow-card"
			style="--sky:{data.area.sky}"
			data-testid="battle-stage"
		>
			<BattleCanvas {attackTrigger} {hitTrigger} damage={lastDamage} {victoryTrigger} />

			<div class="fight relative flex items-end justify-between gap-2">
				<div class="flex w-[42%] flex-col items-center gap-1">
					<Hero size={spriteSize} mood={heroMood} />
					<ProgressBar
						value={playerHp}
						max={data.playerHp}
						tone="mint"
						size="sm"
						label="내 에너지"
						class="w-full"
					/>
				</div>

				<span class="pb-8 font-display text-lg text-magic-500" aria-hidden="true">VS</span>

				<div class="flex w-[42%] flex-col items-center gap-1">
					<MonsterSprite kind={data.area.boss.id} size={spriteSize} mood={enemyMood} />
					<ProgressBar
						value={enemyHp}
						max={seals.length}
						tone="ember"
						size="sm"
						label="{data.area.boss.name} 에너지"
						class="w-full"
					/>
					<span class="seal-dots font-display text-xs" aria-hidden="true">
						{#each seals as s, i (i)}
							<span class="dot" class:broken={s.broken}></span>
						{/each}
					</span>
				</div>
			</div>
		</div>

		{#if outcome === 'win'}
			<div
				class="outcome flex flex-col items-center justify-center gap-3 text-center"
				data-testid="battle-outcome"
			>
				<h2 class="text-display-lg text-gold-600">승리!</h2>
				<p class="stars" aria-label="별 {stars}개">
					{#each [0, 1, 2] as i (i)}
						<span class="star" class:on={i < stars}>★</span>
					{/each}
				</p>
				<ul class="star-list">
					{#each STAR_LABELS as label, i (i)}
						<li class:done={i < stars}>{label}</li>
					{/each}
				</ul>
				{#if madeThisBattle.length > 0}
					<p class="made">
						만든 한자
						{#each madeThisBattle as ch (ch)}<span class="hanja">{ch}</span>{/each}
					</p>
				{/if}
				<div class="flex flex-wrap justify-center gap-3">
					<Button variant="magic" size="lg" onclick={restart} loading={restarting}>다시 대결</Button
					>
					<Button variant="gold" size="lg" href="/fusion">합체 공방</Button>
					<Button variant="ghost" size="lg" href="/">모험 지도</Button>
				</div>
			</div>
		{:else if seal}
			<div class="play">
				<!-- 봉인 카드: 목표를 숨기지 않는다. 이야기도 처음부터 보여 준다 -->
				<section class="seal-card relative isolate" class:resonating data-testid="seal-card">
					<Sparkle count={4} />
					<!--
						**글자만 두고 설명을 뺐다.**
						예전에는 목표 위에 뜻·음·이야기가 전부 적혀 있었다. 답이 인쇄되어 있으면
						아이가 하는 일은 "적힌 답의 재료 찾기" 가 되고, 그건 다시 시험지다.
						뜻·음·이야기는 봉인을 깬 **뒤에** 보상으로 나온다.
						막히면 ( ? ) 를 누르면 된다 — 공짜다.
					-->
					<div class="seal-head">
						<span class="hanja seal-char">{seal.character}</span>
						<button type="button" class="help" onclick={askHint} aria-label="도와줘">?</button>
					</div>

					{#if justBroke}
						<!--
							**여기가 이 게임의 배움이 일어나는 순간이다.**
							아이는 방금 해 그림과 달 그림을 붙였고, 그것이 明이며 "밝을 명" 이라는 것을
							지금 처음 안다. 먼저 알려 주고 맞히게 하는 것과 순서가 반대다.
						-->
						<div class="broke" data-testid="seal-broke">
							<span class="hanja broke-char">{justBroke.character}</span>
							<span class="font-display text-lg text-ink-900">
								{justBroke.meaning}
								{justBroke.reading}
							</span>
							<p class="broke-story">{justBroke.story}</p>
							<Button variant="magic" size="md" onclick={() => (justBroke = null)}>좋아!</Button>
						</div>
					{:else}
						<div class="frame-wrap" bind:this={frameEl}>
							<GlyphFrame
								layout={frameLayout}
								values={[slots[0] ?? null, slots[1] ?? null]}
								onRemove={removeAt}
								{shake}
								size={116}
								mastery={masteryMap}
								bind:slots={slotEls}
							/>
						</div>
					{/if}
				</section>

				<!-- 부품 서랍 -->
				<section class="tray" aria-label="부품 서랍">
					<div class="parts">
						{#each data.tray as part (part.character)}
							<button
								type="button"
								class="part"
								data-part={part.character}
								data-glow={glowing.includes(part.character) || undefined}
								onclick={() => place(part.character)}
								use:draggable={{
									dropSelector: '.cell, .frame',
									value: part.character,
									disabled: busy || slots.length >= 2,
									onLift: () => sound.play('click'),
									onDrop: (character) => place(character)
								}}
								disabled={busy || slots.length >= 2}
							>
								<!--
									글자가 아니라 **그림**으로 보여 준다. 뜻·음 글씨도 여기서 뺐다.
									아이가 처음 만나는 부품에 `날 일` 이라고 써 붙이면 그건 교재지 게임이 아니다.
									익숙해지면(mastery) 그림이 조용히 글자로 바뀐다.
								-->
								<PictoGlyph
									character={part.character}
									stage={fadeStage(part.mastery)}
									size={34}
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

			<div class="status-bar">
				<Badge tone="magic" size="sm">봉인 {brokenCount} / {seals.length}</Badge>
			</div>
		{/if}
	</div>
</AppShell>

<style>
	/*
	 * 한 화면에 담기 위한 격자.
	 * 모바일 뷰포트는 390×664 다 (844 는 screen 값이라 실제보다 크다).
	 * 머리글·무대·상태줄은 제 높이, 남는 공간은 봉인 카드와 서랍이 나눠 갖는다.
	 */
	.stage-grid {
		display: grid;
		grid-template-rows: auto auto 1fr auto;
		gap: 0.5rem;
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

	/* 스크롤 막대가 세로 공간을 먹지 않게 숨긴다 */
	.areas {
		scrollbar-width: none;
	}

	.areas::-webkit-scrollbar {
		display: none;
	}

	.stage {
		display: grid;
		align-content: center;
		background: var(--sky);
		min-height: 150px;
	}

	.seal-dots {
		display: flex;
		gap: 0.25rem;
	}

	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--color-ember-400, #ff8b8b);
	}

	.dot.broken {
		background: rgb(255 255 255 / 0.55);
	}

	.play {
		display: flex;
		min-height: 0;
		flex-direction: column;
		gap: 0.5rem;
	}

	.seal-card {
		padding: 0.6rem 0.75rem 0.75rem;
		border-radius: var(--radius-panel);
		background: linear-gradient(180deg, #eef4ff 0%, #f6ecff 100%);
		box-shadow: var(--shadow-card);
		transition: box-shadow 0.2s ease;
	}

	/* 놓은 부품이 이 글자의 재료일 때. 틀렸다고 말하는 대신 맞았을 때만 반응한다 */
	.seal-card.resonating {
		box-shadow:
			0 0 0 3px var(--color-gold-400),
			var(--shadow-card);
	}

	/* 목표 글자를 가운데 위에 두고 바로 아래에 칸을 놓는다 — "이걸 만들어라" 가 한눈에 읽힌다 */
	.seal-head {
		position: relative;
		display: grid;
		place-items: center;
	}

	.help {
		position: absolute;
		top: 0;
		right: 0;
	}

	.seal-char {
		font-size: 2.5rem;
		line-height: 1;
		color: var(--color-magic-800);
	}

	.help {
		display: grid;
		place-items: center;
		/* 아이 손가락 기준 하한선 */
		width: var(--tap-min);
		height: var(--tap-min);
		flex-shrink: 0;
		border: 3px solid var(--color-gold-400);
		border-radius: 9999px;
		background: #fff;
		color: var(--color-gold-700);
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
	}

	/* 글자 틀은 카드 가운데에 둔다. 왼쪽에 붙어 있으면 카드가 비어 보인다 */
	.frame-wrap {
		display: flex;
		justify-content: center;
		margin-top: 0.35rem;
	}

	.broke {
		display: grid;
		justify-items: center;
		gap: 0.3rem;
		padding: 0.4rem 0 0.2rem;
		text-align: center;
	}

	.broke-char {
		font-size: 3.5rem;
		line-height: 1;
		color: var(--color-magic-800);
	}

	.broke-story {
		max-width: 20rem;
		color: var(--color-ink-700);
		font-size: 0.8rem;
	}

	.tray {
		min-height: 0;
		overflow-y: auto;
	}

	.parts {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(3.75rem, 1fr));
		gap: 0.35rem;
	}

	.part {
		display: grid;
		place-items: center;
		gap: 0.05rem;
		/* 아이 손가락 기준 하한선보다 넉넉하게 */
		min-height: 3.25rem;
		padding: 0.3rem 0.15rem;
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

	/* 도움을 눌렀을 때 빛나는 부품 */
	.part[data-glow] {
		border-color: var(--color-gold-400);
		box-shadow: 0 0 0 3px rgb(255 209 102 / 0.45);
	}

	.part:disabled {
		cursor: default;
		opacity: 0.55;
	}

	.status-bar {
		display: flex;
		justify-content: center;
	}

	.stars {
		display: flex;
		gap: 0.25rem;
		font-size: 2rem;
		line-height: 1;
	}

	.star {
		color: var(--color-magic-200);
	}

	.star.on {
		color: var(--color-gold-500);
	}

	.star-list {
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--color-ink-500);
		font-size: 0.75rem;
	}

	.star-list li.done {
		color: var(--color-mint-700);
		font-weight: 700;
	}

	.made {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		color: var(--color-ink-700);
		font-size: 0.8rem;
	}

	.made .hanja {
		font-size: 1.4rem;
		color: var(--color-magic-800);
	}

	/*
	 * 넓은 화면은 가로가 남고 세로가 모자란다 (1280×800).
	 * 무대와 봉인을 좌우로 나눠 세로를 아낀다.
	 */
	@media (min-width: 900px) {
		.stage-grid {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: auto 1fr auto;
			grid-template-areas:
				'header header'
				'stage  play'
				'stage  bar';
			gap: 0.75rem 1rem;
			min-height: calc(100dvh - 5rem);
		}

		header {
			grid-area: header;
		}

		.stage {
			grid-area: stage;
			align-self: center;
		}

		.play {
			grid-area: play;
			justify-content: center;
		}

		.outcome {
			grid-area: play;
		}

		.status-bar {
			grid-area: bar;
		}

		.seal-char {
			font-size: 3.5rem;
		}
	}
</style>
