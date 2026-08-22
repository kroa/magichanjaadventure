<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import TopHud from '$lib/components/layout/TopHud.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import ArcherSprite from '$lib/components/art/ArcherSprite.svelte';
	import SageSprite from '$lib/components/art/SageSprite.svelte';
	import FoxSprite from '$lib/components/art/FoxSprite.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import { sound } from '$lib/sound/index.svelte';
	import { expToNextLevel } from '$lib/game/exp';

	let { data } = $props();

	const SPRITES = {
		knight: KnightSprite,
		wizard: WizardSprite,
		archer: ArcherSprite,
		sage: SageSprite,
		fox: FoxSprite
	} as const;
	const Hero = $derived(SPRITES[data.user.characterClass ?? 'knight'] ?? KnightSprite);

	/*
	 * 섬이 놓이는 자리 — 아래에서 위로 굽이치는 길.
	 *
	 * 예전 홈은 액션 카드가 세로로 늘어선 **메뉴판**이었다. 어디로 갈지 고르는 것이 아니라
	 * 기능을 고르는 화면이었다. 지도로 바꾸면 "어디를 모험할까" 가 먼저 오고,
	 * 무엇을 할지는 그 다음이 된다 — 순서가 게임 쪽으로 뒤집힌다.
	 *
	 * 고정 좌표를 쓰는 이유는 SkyBackground 와 같다 (Math.random 은 서버와 화면이 어긋난다).
	 */
	const SPOTS = [
		{ x: 20, y: 90 },
		{ x: 52, y: 83 },
		{ x: 82, y: 90 },
		{ x: 84, y: 62 },
		{ x: 52, y: 55 },
		{ x: 19, y: 62 },
		{ x: 20, y: 30 },
		{ x: 52, y: 22 },
		{ x: 82, y: 30 }
	];

	const islands = $derived(
		data.areas.map((entry, i) => ({
			id: entry.area.id,
			name: entry.area.name,
			emoji: entry.area.emoji,
			accent: entry.area.accent,
			learned: entry.learned,
			total: entry.area.hanjaCount,
			unlocked: entry.unlocked,
			reason: entry.lockedReason,
			spot: SPOTS[i] ?? SPOTS[SPOTS.length - 1]
		}))
	);

	/** 길을 잇는 선 */
	const trail = $derived(islands.map((island) => `${island.spot.x},${island.spot.y}`).join(' '));

	/** 내 캐릭터가 서 있는 섬 */
	const here = $derived(islands.find((i) => i.id === data.nextAreaId) ?? islands[0]);

	let chosen = $state<number | null>(null);
	let meOpen = $state(false);
	const chosenIsland = $derived(islands.find((i) => i.id === chosen) ?? null);

	function tapIsland(island: (typeof islands)[number]) {
		if (!island.unlocked) {
			sound.play('click');
			toasts.warn(island.reason ?? '아직 갈 수 없어요');
			return;
		}
		chosen = island.id;
		sound.play('click');
	}
</script>

<svelte:head>
	<title>모험 지도 · 마법한자탐험대</title>
	<meta name="description" content="한자를 배우며 떠나는 판타지 모험" />
</svelte:head>

<!--
	모험 지도 — **어디로 갈지 고르는 곳.**

	예전에는 캐릭터 무대 + 액션 카드 6개 + 진행바 + 도감 패널이 세로로 늘어선 목차였다.
	첫 화면이 놀이터가 아니라 메뉴판 겸 성적표였다는 뜻이다.

	지금은 섬 아홉 개가 떠 있는 지도다. 내 캐릭터가 지금 있는 섬에 서 있고,
	길을 따라 다음 섬으로 간다. 잠긴 섬은 자물쇠가 걸려 있다.
-->
<AppShell>
	{#snippet hud()}
		<TopHud
			nickname={data.user.nickname}
			level={data.user.level}
			exp={data.user.exp}
			expToNext={expToNextLevel(data.user.level)}
			gems={data.user.gems}
		/>
	{/snippet}

	<h1 class="sr-only">모험 지도</h1>

	<div class="map relative isolate" data-testid="adventure-map">
		<Sparkle count={8} />

		<button type="button" class="me-card" onclick={() => (meOpen = true)} aria-label="내 정보">
			<Hero size={38} mood="happy" />
		</button>

		<!-- 섬을 잇는 길 -->
		<svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
			<polyline points={trail} />
		</svg>

		{#each islands as island (island.id)}
			<button
				type="button"
				class="island"
				class:locked={!island.unlocked}
				class:done={island.learned >= island.total}
				style="--x:{island.spot.x}%; --y:{island.spot.y}%; --accent:{island.accent}"
				onclick={() => tapIsland(island)}
				data-area={island.id}
				aria-label="{island.name} {island.unlocked
					? `${island.learned} / ${island.total}`
					: '잠김'}"
			>
				<span class="blob" aria-hidden="true"></span>
				<span class="emoji" aria-hidden="true">{island.unlocked ? island.emoji : '🔒'}</span>
				<span class="name font-display">{island.name}</span>
				{#if island.unlocked}
					<span class="count font-display">{island.learned}/{island.total}</span>
				{/if}

				{#if island.id === here?.id}
					<!-- 내가 지금 있는 섬. 캐릭터가 위에 서 있다 -->
					<span class="me" aria-hidden="true">
						<Hero size={44} mood="happy" />
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!--
		내 카드 — DragonBox 화면 왼쪽 아래의 아바타 자리와 같다.
		지도를 어지럽히지 않으면서 도감·상점·로그아웃으로 가는 길을 둔다.
	-->

	{#if meOpen}
		<div class="sheet" data-testid="me-sheet">
			<div class="sheet-head">
				<span class="font-display text-lg text-ink-900">{data.user.nickname}</span>
				<button type="button" class="sheet-close" onclick={() => (meOpen = false)} aria-label="닫기"
					>✕</button
				>
			</div>
			<div class="sheet-actions">
				<Button variant="mint" size="lg" href="/collection">한자 도감</Button>
				<Button variant="sky" size="lg" href="/shop">상점</Button>
				<form method="POST" action="/logout">
					<Button type="submit" variant="ghost" size="lg" fullWidth>로그아웃</Button>
				</form>
			</div>
		</div>
	{/if}

	{#if chosenIsland}
		<!--
			섬을 고르면 무엇을 할지 묻는다.
			"어디로" 다음에 "무엇을" 이 오는 순서라, 화면이 기능 목록이 아니라 여정이 된다.
		-->
		<div class="sheet" data-testid="island-sheet">
			<div class="sheet-head">
				<span class="sheet-emoji" aria-hidden="true">{chosenIsland.emoji}</span>
				<span class="font-display text-lg text-ink-900">{chosenIsland.name}</span>
				<button type="button" class="sheet-close" onclick={() => (chosen = null)} aria-label="닫기"
					>✕</button
				>
			</div>
			<div class="sheet-actions">
				<Button variant="magic" size="lg" href="/learn?area={chosenIsland.id}">한자 배우기</Button>
				<Button variant="ember" size="lg" href="/battle?area={chosenIsland.id}">보스 대결</Button>
				<Button variant="gold" size="lg" href="/fusion">합체 공방</Button>
			</div>
		</div>
	{/if}
</AppShell>

<style>
	.map {
		position: relative;
		width: 100%;
		/* 아홉 섬이 한 화면에 들어와야 한다. 스크롤하면 지도가 아니라 목록이 된다 */
		height: calc(100dvh - 11rem);
		min-height: 26rem;
	}

	.trail {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.trail polyline {
		fill: none;
		stroke: rgb(124 92 255 / 0.28);
		stroke-width: 0.9;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 2.4 2.6;
	}

	.island {
		position: absolute;
		left: var(--x);
		top: var(--y);
		display: grid;
		width: 5.5rem;
		justify-items: center;
		transform: translate(-50%, -50%);
		border: 0;
		background: none;
		cursor: pointer;
		transition: transform 0.18s var(--ease-pop, cubic-bezier(0.34, 1.56, 0.64, 1));
	}

	.island:hover:not(.locked) {
		transform: translate(-50%, -54%);
	}

	/* 섬 덩어리 */
	.blob {
		position: absolute;
		top: 0;
		width: 4.4rem;
		height: 3.2rem;
		border-radius: 50% 50% 45% 55% / 60% 65% 40% 35%;
		background: linear-gradient(
			180deg,
			var(--accent) 0%,
			color-mix(in srgb, var(--accent) 55%, #6b4b2a) 100%
		);
		box-shadow: 0 6px 0 rgb(60 40 120 / 0.16);
	}

	.emoji {
		position: relative;
		margin-top: 0.5rem;
		font-size: 1.6rem;
		line-height: 1;
	}

	.name {
		position: relative;
		margin-top: 1.15rem;
		padding: 0.1rem 0.5rem;
		border-radius: 9999px;
		background: rgb(255 255 255 / 0.9);
		color: var(--color-ink-900);
		font-size: 0.72rem;
		white-space: nowrap;
	}

	.count {
		position: relative;
		color: var(--color-ink-500);
		font-size: 0.62rem;
	}

	/* 잠긴 섬은 색이 빠진다 */
	.island.locked .blob {
		background: linear-gradient(180deg, #cfd3e0 0%, #9aa0b4 100%);
	}

	.island.locked .name {
		color: var(--color-ink-500);
	}

	/* 다 모은 섬에는 깃발이 선다 */
	.island.done .name::after {
		content: ' 🚩';
	}

	.me {
		position: absolute;
		bottom: 3.1rem;
		animation: me-bob 3s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes me-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}

	/*
	 * 왼쪽 **위** 에 둔다.
	 * 처음에는 DragonBox 처럼 왼쪽 아래에 뒀는데, 거기가 첫 섬(새싹 마을) 자리라 겹쳤다.
	 * 우리 지도는 아래에서 위로 올라가므로 시작 지점을 가리면 안 된다.
	 */
	.me-card {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 30;
		display: grid;
		/* 아이 손가락 기준 하한선보다 넉넉하게 */
		width: 3.5rem;
		height: 3.5rem;
		place-items: center;
		border: 3px solid var(--color-magic-200);
		border-radius: var(--radius-button);
		background: rgb(255 255 255 / 0.9);
		box-shadow: var(--shadow-card);
		cursor: pointer;
	}

	.sheet {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 45;
		display: grid;
		gap: 0.75rem;
		padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
		border-radius: var(--radius-panel) var(--radius-panel) 0 0;
		background: rgb(255 255 255 / 0.95);
		backdrop-filter: blur(10px);
		box-shadow: 0 -8px 28px rgb(60 40 120 / 0.22);
		animation: sheet-up 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
	}

	@keyframes sheet-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: none;
		}
	}

	.sheet-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sheet-emoji {
		font-size: 1.6rem;
		line-height: 1;
	}

	.sheet-close {
		display: grid;
		place-items: center;
		/* 아이 손가락 기준 하한선 */
		width: var(--tap-min);
		height: var(--tap-min);
		margin-left: auto;
		border: 0;
		border-radius: 9999px;
		background: rgb(124 92 255 / 0.1);
		color: var(--color-ink-500);
		cursor: pointer;
	}

	.sheet-actions {
		display: grid;
		gap: 0.5rem;
	}

	@media (min-width: 640px) {
		.sheet {
			right: auto;
			left: 50%;
			max-width: 28rem;
			margin-bottom: 1rem;
			transform: translateX(-50%);
			border-radius: var(--radius-panel);
		}

		.sheet-actions {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.me,
		.sheet {
			animation: none;
		}
	}
</style>
