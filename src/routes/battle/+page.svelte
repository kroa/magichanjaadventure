<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Chip from '$lib/components/common/Chip.svelte';
	import ProgressBar from '$lib/components/common/ProgressBar.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import ArcherSprite from '$lib/components/art/ArcherSprite.svelte';
	import SageSprite from '$lib/components/art/SageSprite.svelte';
	import FoxSprite from '$lib/components/art/FoxSprite.svelte';
	import MonsterSprite from '$lib/components/art/MonsterSprite.svelte';
	import BattleCanvas from '$lib/components/battle/BattleCanvas.svelte';
	import PieceBoard, { type Piece } from '$lib/components/play/PieceBoard.svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { toasts } from '$lib/stores/toast.svelte';
	import { announceReward } from '$lib/game/announce';
	import { sound } from '$lib/sound/index.svelte';
	import type { FusionRecipe } from '$lib/game/fusion';
	import { STAR_LABELS } from '$lib/game/seals';
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
	const spriteSize = $derived(wide.current ? 132 : 84);
	const boardHeight = $derived(wide.current ? 300 : 250);

	// 서버가 내려준 값으로 한 번만 초기화하고, 이후에는 이 화면이 관리한다
	// svelte-ignore state_referenced_locally
	let pieces = $state<Piece[]>(data.pieces.map((p) => ({ ...p })));
	// svelte-ignore state_referenced_locally
	let playerHp = $state(data.playerHp);
	// svelte-ignore state_referenced_locally
	let totalSeals = $state(data.seals.length);

	let broken = $state(0);
	let misses = $state(0);
	let madeThisBattle = $state<string[]>([]);
	let discoveredNew = $state(false);
	let hintTick = $state(0);
	let outcome = $state<'fighting' | 'win'>('fighting');
	let settled = $state(false);
	let stars = $state(0);
	let restarting = $state(false);

	let attackTrigger = $state(0);
	let hitTrigger = $state(0);
	let victoryTrigger = $state(0);
	let lastDamage = $state(0);
	let startedAt = $state(Date.now());

	/** 방금 깬 봉인 — 뜻·음·이야기를 여기서 처음 보여 준다 */
	let justBroke = $state<{
		character: string;
		reading: string;
		meaning: string;
		story: string;
	} | null>(null);

	const heroMood = $derived<Mood>(outcome === 'win' ? 'cheer' : 'happy');
	const enemyMood = $derived<Mood>(outcome === 'win' ? 'sad' : 'happy');

	/**
	 * 도움은 공짜다. 정답을 알려 주는 대신 **붙는 짝을 빛낸다.**
	 * 마지막으로 미는 손가락은 언제나 아이 것이다.
	 */
	function askHint() {
		if (outcome !== 'fighting') return;
		// 짝을 찾는 것은 판이 한다. 여기서는 "도와줘" 라고 두드리기만 한다
		hintTick += 1;
		sound.play('click');
	}

	/**
	 * 두 조각이 붙었다. 봉인인지 아닌지는 **서버가 판단한다.**
	 *
	 * true 를 돌려주면 판에서 조각이 사라지고, false 면 제자리로 튕겨 돌아간다.
	 * 조각은 이번 봉인들의 재료가 정확히 그만큼만 있으므로,
	 * 봉인이 아닌 조합에 조각을 써 버리면 판을 영영 못 비운다 — 그래서 그때는 false 다.
	 */
	async function handleMerge(recipe: FusionRecipe, used: Piece[]): Promise<boolean> {
		void recipe;
		try {
			const response = await fetch('/api/battle/seal', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					sessionKey: data.sessionKey,
					areaId: data.area.id,
					parts: used.map((p) => p.character),
					firstTry: misses === 0
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
				// 만들긴 했지만 이 판의 봉인이 아니다. 한자는 얻었으니 헛수고는 아니다
				if (payload.reason === 'not-target' && payload.character) {
					toasts.success(`${payload.character}! 만들었어요.`, '🔮');
				}
				misses += 1;
				return false;
			}

			// 봉인 파괴
			lastDamage = 1;
			attackTrigger += 1;
			broken += 1;
			justBroke = {
				character: payload.character!,
				reading: payload.reading!,
				meaning: payload.meaning!,
				story: payload.story!
			};

			// 보스의 반격. 아이의 실패가 아니라 **성공에 대한 응답**이다
			if (broken < totalSeals) {
				playerHp = Math.max(1, playerHp - Math.round(data.playerHp * 0.08));
				hitTrigger += 1;
			}
			return true;
		} catch {
			toasts.warn('연결이 잠깐 끊겼어요. 다시 해 보세요.');
			return false;
		}
	}

	async function finish() {
		if (settled) return;
		settled = true;
		outcome = 'win';
		victoryTrigger += 1;

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
					sealCount: totalSeals,
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

	/** 보상 화면을 닫는다. 판이 비었으면 그때 승리로 넘어간다 */
	function closeBroke() {
		justBroke = null;
		if (pieces.length === 0) void finish();
	}

	/**
	 * 새 대결을 시작한다.
	 *
	 * 같은 URL 로 링크 이동하면 컴포넌트가 재생성되지 않아 결과 화면이 그대로 남는다.
	 * **여기에 새 상태를 빠뜨리면 "다시 대결" 이 또 조용히 깨진다.**
	 */
	async function restart() {
		if (restarting) return;
		restarting = true;
		try {
			await invalidateAll();
			pieces = data.pieces.map((p) => ({ ...p }));
			playerHp = data.playerHp;
			totalSeals = data.seals.length;
			broken = 0;
			misses = 0;
			hintTick = 0;
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
	합체 대결 — **판을 비우면 이긴다.**

	예전에는 위에 목표 글자를 인쇄해 두고 아래 격자에서 조각 두 개를 고르게 했다.
	그림으로 바꿔도 구조가 "정답 + 보기" 면 아이는 문제를 푸는 것이지 노는 것이 아니다.

	지금은 목표를 보여 주지 않는다. 봉인들의 재료가 판에 널브러져 있고,
	아이는 아무거나 밀어서 붙여 본다. 붙는 것끼리 붙으면 사라지고, 판이 비면 승리다.
	무엇을 만들었는지는 **만든 뒤에** 알게 된다.

	 - 실패에 벌이 없다: 안 붙는 조합은 튕겨 나올 뿐, 에너지도 안 깎이고 아무 말도 없다
	 - 도움은 공짜다: ( ? ) 는 붙는 짝을 빛낸다. 미는 것은 아이 몫이다
	 - 질 수 없다: 패배 화면이 없다. 긴장은 별로 준다
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
			{#if outcome === 'fighting'}
				<button type="button" class="help" onclick={askHint} aria-label="도와줘">?</button>
			{/if}
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
						value={totalSeals - broken}
						max={totalSeals}
						tone="ember"
						size="sm"
						label="{data.area.boss.name} 에너지"
						class="w-full"
					/>
					<span class="seal-dots" aria-hidden="true">
						{#each Array(totalSeals) as _, i (i)}
							<span class="dot" class:broken={i < broken}></span>
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
		{:else if justBroke}
			<!--
				**여기가 배움이 일어나는 순간이다.**
				아이는 방금 해 그림과 달 그림을 밀어 붙였고, 그것이 明이며 "밝을 명" 이라는 것을
				지금 처음 안다. 먼저 알려 주고 맞히게 하는 것과 순서가 반대다.
			-->
			<div class="broke" data-testid="seal-broke">
				<span class="hanja broke-char">{justBroke.character}</span>
				<span class="font-display text-lg text-ink-900">
					{justBroke.meaning}
					{justBroke.reading}
				</span>
				<p class="broke-story">{justBroke.story}</p>
				<Button variant="magic" size="md" onclick={closeBroke}>좋아!</Button>
			</div>
		{:else}
			<div class="play">
				<PieceBoard
					bind:pieces
					{hintTick}
					height={boardHeight}
					onmerge={handleMerge}
					oncleared={() => {
						// 마지막 조각이 사라졌다. 보상 화면을 닫을 때 승리로 넘어간다
						if (!justBroke) void finish();
					}}
				/>
			</div>
		{/if}
	</div>
</AppShell>

<style>
	/*
	 * 한 화면에 담기 위한 격자.
	 * 모바일 뷰포트는 390×664 다 (844 는 screen 값이라 실제보다 크다).
	 */
	.stage-grid {
		display: grid;
		grid-template-rows: auto auto 1fr;
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
		min-height: 140px;
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
		display: grid;
		min-height: 0;
		align-content: center;
	}

	.broke {
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 0.35rem;
		padding: 0.75rem;
		border-radius: var(--radius-panel);
		background: linear-gradient(180deg, #eef4ff 0%, #f6ecff 100%);
		box-shadow: var(--shadow-card);
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
	 * 무대와 판을 좌우로 나눠 세로를 아낀다.
	 */
	@media (min-width: 900px) {
		.stage-grid {
			grid-template-columns: 1fr 1.15fr;
			grid-template-rows: auto 1fr;
			grid-template-areas:
				'header header'
				'stage  play';
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

		.play,
		.outcome,
		.broke {
			grid-area: play;
		}
	}
</style>
