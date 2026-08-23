<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import TopHud from '$lib/components/layout/TopHud.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import HeroSprite from '$lib/components/art/HeroSprite.svelte';
	import { rankOf, titleFor } from '$lib/game/rank';
	import { nodeFor, trailPath } from '$lib/game/worldmap';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import { sound } from '$lib/sound/index.svelte';
	import { expToNextLevel } from '$lib/game/exp';

	let { data } = $props();

	const heroRank = $derived(rankOf(data.user.level));
	const heroTitle = $derived(titleFor(data.user.characterClass, heroRank));

	/*
	 * 섬 자리는 `$lib/game/worldmap` 이 소유한다.
	 *
	 * 예전에는 이 파일에 좌표 배열이 있고 `SPOTS[i] ?? SPOTS[last]` 로 흘렸다.
	 * 지역이 하나만 늘어도 두 섬이 완전히 포개졌고, 왼쪽 위 내 카드와 한자 왕성이
	 * 4.6px 차이로 겹침 검사를 통과하고 있었다 — 그 섬이 레벨 28 을 요구해
	 * 모든 테스트 사용자에게 잠겨 있던 덕분이라, CI 가 영원히 못 볼 시한폭탄이었다.
	 * 좌표를 데이터로 빼내니 그 불변식을 단위 테스트로 못 박을 수 있다.
	 */
	const islands = $derived(
		data.areas.map((entry) => ({
			id: entry.area.id,
			name: entry.area.name,
			emoji: entry.area.emoji,
			accent: entry.area.accent,
			ground: entry.area.ground,
			mood: entry.area.mood,
			bossName: entry.area.boss.name,
			learned: entry.learned,
			total: entry.area.hanjaCount,
			unlocked: entry.unlocked,
			reason: entry.lockedReason,
			gate: entry.gate,
			node: nodeFor(entry.area.id) ?? { areaId: entry.area.id, x: 50, y: 50, depth: 0 }
		}))
	);

	/** 섬을 잇는 길 — 노드에서 곡선을 만든다 */
	const trail = trailPath();

	/** 내 캐릭터가 서 있는 섬 */
	const here = $derived(islands.find((i) => i.id === data.nextAreaId) ?? islands[0]);

	let chosen = $state<number | null>(null);
	let meOpen = $state(false);
	const chosenIsland = $derived(islands.find((i) => i.id === chosen) ?? null);

	/*
	 * 시트는 **한 번에 하나만** 뜬다.
	 *
	 * 둘 다 `position: fixed; bottom: 0` 이라 같이 열리면 완전히 포개진다.
	 * 나중에 그려지는 섬 시트가 위를 덮어서, 아이가 "내 정보 → 로그아웃" 을 눌러도
	 * 그 자리의 `합체 공방` 이 대신 눌렸다. 실제로 로그아웃이 안 된다는 신고를 받았고
	 * Playwright 가 "island-sheet subtree intercepts pointer events" 로 그대로 재현했다.
	 */
	function openMe() {
		chosen = null;
		meOpen = true;
	}

	function tapIsland(island: (typeof islands)[number]) {
		if (!island.unlocked) {
			sound.play('click');
			toasts.warn(island.reason ?? '아직 갈 수 없어요');
			return;
		}
		meOpen = false;
		chosen = island.id;
		sound.play('click');
	}

	function closeSheets() {
		meOpen = false;
		chosen = null;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') closeSheets();
	}}
/>

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
<AppShell bleed class="flex flex-col">
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
		<Sparkle count={6} />

		<button type="button" class="me-card" onclick={openMe} aria-label="내 정보">
			<HeroSprite cls={data.user.characterClass} rank={heroRank} size={38} mood="happy" />
		</button>

		<!--
			바이옴 땅 — 섬이 아이콘이 아니라 **장소**로 보이게 한다.
			지역마다 다른 땅색이 깔리면 아홉 개가 같은 점 아홉 개로 안 읽힌다.
		-->
		{#each islands as island (island.id)}
			<span
				class="ground"
				class:locked={!island.unlocked}
				style="--x:{island.node.x}%; --y:{island.node.y}%; --fill:{island.ground}"
				aria-hidden="true"
			></span>
		{/each}

		<!--
			섬을 잇는 길.
			`vector-effect="non-scaling-stroke"` 한 줄이 이방성을 없앤다 —
			예전 polyline 은 preserveAspectRatio="none" 탓에 데스크톱에서 2.16:1 로 찌그러져
			점선의 굵기와 길이가 방향마다 달랐다.
		-->
		<svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
			<path d={trail} vector-effect="non-scaling-stroke" />
		</svg>

		{#each islands as island (island.id)}
			<button
				type="button"
				class="island tappable"
				class:locked={!island.unlocked}
				class:done={island.learned >= island.total}
				style="--x:{island.node.x}%; --y:{island.node.y}%; --accent:{island.accent}; --depth:{island
					.node.depth}"
				onclick={() => tapIsland(island)}
				data-area={island.id}
				aria-label="{island.name} {island.unlocked
					? `${island.learned} / ${island.total}`
					: '잠김'}"
			>
				<span class="blob" aria-hidden="true"></span>
				<!--
					**잠긴 섬도 자기 얼굴을 보여 준다.**
					예전에는 이모지를 통째로 🔒 로 바꿔서, 레벨 1 아이가 처음 보는 화면이
					회색 자물쇠 여덟 개였다. "실패에 벌이 없다" 는 원칙이 지도에서만 깨져 있었다.
					지금은 색만 빠지고 자물쇠는 작은 배지로 얹힌다 — 못 가는 곳이 아니라 아직 안 간 곳이다.
				-->
				<span class="emoji" aria-hidden="true">{island.emoji}</span>
				<span class="name font-display">{island.name}</span>
				{#if island.unlocked}
					<span class="count font-display">{island.learned}/{island.total}</span>
				{:else}
					<span class="lock" aria-hidden="true">🔒</span>
					<!-- 얼마나 남았는지를 눌러 보기 전에 알려 준다 -->
					<span class="gate font-display">
						{#if island.gate?.kind === 'level'}
							Lv {island.gate.need}
						{:else if island.gate?.kind === 'progress'}
							{island.gate.have}/{island.gate.need}
						{:else if island.gate?.kind === 'boss'}
							<!-- 보스를 이겨야 열린다. 대결이 있어야 할 이유가 여기서 생긴다 -->
							⚔️ 보스
						{/if}
					</span>
				{/if}

				{#if island.id === here?.id}
					<!-- 내가 지금 있는 섬. 캐릭터가 위에 서 있다 -->
					<span class="me" aria-hidden="true">
						<HeroSprite cls={data.user.characterClass} rank={heroRank} size={52} mood="happy" />
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
				<!-- 계급은 레벨에서 유도된다. 저장하지 않으므로 캐릭터를 바꿔도 그대로 따라온다 -->
				<span class="title font-display">{heroTitle}</span>
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
			<!-- 이 섬이 어떤 곳인지. AREAS 의 mood·boss 가 화면에 나오는 두 번째 자리다 -->
			<p class="sheet-mood">{chosenIsland.mood}</p>
			<p class="sheet-boss">
				<span aria-hidden="true">👑</span>
				{chosenIsland.bossName}
			</p>
			<div class="sheet-actions">
				<Button variant="magic" size="lg" href="/learn?area={chosenIsland.id}">한자 배우기</Button>
				<Button variant="ember" size="lg" href="/battle?area={chosenIsland.id}">보스 대결</Button>
				<Button variant="gold" size="lg" href="/fusion">합체 공방</Button>
				<Button variant="mint" size="lg" href="/quiz">복습하기</Button>
				<Button variant="sky" size="lg" href="/word">낱말 만들기</Button>
			</div>
		</div>
	{/if}
</AppShell>

<style>
	/*
	 * 지도는 **화면 끝까지** 간다. AppShell 의 `bleed` 가 좌우 여백을 걷어낸다.
	 *
	 * `100vw` 와 `calc(100dvh - 13rem)` 을 버렸다.
	 *  - `100vw` 는 세로 스크롤바 폭을 포함해서, 넘침 검사가 못 잡는 사각지대를 만든다.
	 *  - `13rem` 은 껍데기 높이를 손으로 추측한 값인데 실제와 달랐다.
	 *
	 * 그리고 **섬 크기를 지도 상자에 묶는다**(`cqmin`). 예전에는 위치만 % 이고
	 * 크기는 고정 rem 이라, 같은 지도가 모바일에서는 섬이 면적의 65.7% 를 먹어 빽빽하고
	 * 데스크톱에서는 15.4% 라 텅 비었다 — "좁다" 는 느낌의 원인이 하나였다.
	 */
	.map {
		position: relative;
		width: 100%;
		flex: 1 1 0;
		min-height: 18rem;
		container-type: size;
	}

	.trail {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.trail {
		z-index: 2;
	}

	.trail path {
		fill: none;
		stroke: rgb(255 226 160 / 0.55);
		/* non-scaling-stroke 덕에 이제 CSS px 로 잰다 — 방향에 따라 안 찌그러진다 */
		stroke-width: 3px;
		stroke-dasharray: 7 9;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* 지역 땅 — 섬 밑에 깔리는 저채도 원반 */
	.ground {
		position: absolute;
		left: var(--x);
		top: var(--y);
		z-index: 1;
		width: calc(var(--island) * 1.6);
		aspect-ratio: 1.65;
		border-radius: 50%;
		background: radial-gradient(
			closest-side,
			var(--fill) 0%,
			color-mix(in srgb, var(--fill) 45%, transparent) 55%,
			transparent 100%
		);
		translate: -50% -30%;
		filter: blur(2px);
		pointer-events: none;
	}

	/* 잠긴 곳까지 다 칠하면 "지금 갈 수 있는 곳" 이라는 유일한 신호가 지워진다 */
	.ground.locked {
		opacity: 0.3;
		filter: grayscale(0.85) blur(2px);
	}

	/*
	 * 섬 크기를 **지도 짧은 변**에 묶는다.
	 * 데스크톱에서는 커지고 모바일에서는 작아진다 — 두 화면의 문제가 반대 방향이었다.
	 */
	.island,
	.ground {
		--island: clamp(3.5rem, 22cqmin, 8rem);
	}

	.island {
		position: absolute;
		left: var(--x);
		top: var(--y);
		z-index: calc(10 + var(--depth));
		display: grid;
		width: var(--island);
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
	/*
	 * 섬 덩어리 — 풀밭 위, 흙 아래.
	 * 단색 얼룩이 아니라 위아래가 다른 재질이어야 "땅" 으로 읽힌다.
	 */
	.blob {
		position: absolute;
		top: 0;
		width: calc(var(--island) * 0.84);
		height: calc(var(--island) * 0.61);
		border-radius: 48% 52% 44% 56% / 62% 66% 38% 34%;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--accent) 88%, #ffffff) 0%,
			var(--accent) 34%,
			color-mix(in srgb, var(--accent) 42%, #5b3a1c) 62%,
			#4a2f18 100%
		);
		box-shadow:
			0 10px 0 rgb(20 12 45 / 0.35),
			0 18px 30px rgb(20 12 45 / 0.4),
			inset 0 4px 10px rgb(255 255 255 / 0.35);
	}

	/* 갈 수 있는 섬은 은은히 빛난다 — 어디로 갈지 눈에 먼저 들어와야 한다 */
	.island:not(.locked) .blob {
		outline: 3px solid rgb(255 226 160 / 0.55);
		outline-offset: 3px;
	}

	.emoji {
		position: relative;
		margin-top: calc(var(--island) * 0.1);
		font-size: calc(var(--island) * 0.3);
		line-height: 1;
		filter: drop-shadow(0 3px 5px rgb(20 12 45 / 0.4));
	}

	/* 이름표는 어두운 장면 위에 얹히므로 밝게 뽑는다 */
	.name {
		position: relative;
		margin-top: calc(var(--island) * 0.23);
		padding: 0.15rem 0.65rem;
		border-radius: 9999px;
		background: rgb(28 20 58 / 0.82);
		color: #fff;
		font-size: clamp(0.66rem, calc(var(--island) * 0.115), 0.9rem);
		white-space: nowrap;
		box-shadow: 0 2px 8px rgb(20 12 45 / 0.45);
	}

	.count {
		position: relative;
		margin-top: 0.15rem;
		color: rgb(255 255 255 / 0.85);
		font-size: 0.7rem;
		text-shadow: 0 1px 3px rgb(20 12 45 / 0.8);
	}

	/* 잠긴 섬은 색이 빠진다 */
	/* 잠긴 섬은 작고 어둡게 물러난다 — 갈 수 있는 곳이 먼저 눈에 들어와야 한다 */
	/*
	 * 잠긴 섬은 **작아지지도 투명해지지도 않는다.**
	 *  - scale(.82) 은 겹침 검사에서 실제 크기를 숨겨, CI 가 못 보는 사각지대를 만들었다.
	 *  - opacity 는 배경 구름이 섬을 통과해 비치게 했다.
	 * 색만 빼서 "아직 안 간 곳" 으로 보이게 한다.
	 */
	.island.locked {
		transform: translate(-50%, -50%);
	}

	.island.locked .blob {
		filter: saturate(0.42) brightness(0.66);
	}

	.island.locked .emoji {
		filter: saturate(0.5) brightness(0.78);
	}

	.lock {
		position: absolute;
		top: 0;
		right: calc(var(--island) * 0.04);
		font-size: calc(var(--island) * 0.2);
	}

	/* 얼마나 남았는지 — 눌러 보기 전에 보인다 */
	.gate {
		position: relative;
		margin-top: 0.1rem;
		padding: 0.05rem 0.4rem;
		border-radius: 9999px;
		background: rgb(20 14 44 / 0.8);
		color: rgb(255 255 255 / 0.9);
		font-size: clamp(0.6rem, calc(var(--island) * 0.1), 0.78rem);
	}

	.island.locked .name {
		background: rgb(20 14 44 / 0.7);
		color: rgb(255 255 255 / 0.7);
	}

	/* 다 모은 섬에는 깃발이 선다 */
	.island.done .name::after {
		content: ' 🚩';
	}

	.me {
		position: absolute;
		bottom: 4rem;
		filter: drop-shadow(0 6px 10px rgb(20 12 45 / 0.5));
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
		border: 3px solid rgb(255 226 160 / 0.6);
		border-radius: var(--radius-button);
		background: rgb(28 20 58 / 0.7);
		box-shadow: 0 6px 16px rgb(20 12 45 / 0.45);
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

	.title {
		padding: 0.1rem 0.55rem;
		border-radius: 9999px;
		background: var(--color-magic-100, rgb(237 232 255));
		color: var(--color-magic-700);
		font-size: 0.72rem;
	}

	.sheet-mood {
		color: var(--color-ink-700);
		font-size: 0.82rem;
	}

	.sheet-boss {
		display: inline-flex;
		align-self: start;
		align-items: center;
		gap: 0.3rem;
		padding: 0.15rem 0.6rem;
		border-radius: 9999px;
		background: var(--color-ember-100, rgb(255 232 232));
		color: var(--color-ink-700);
		font-size: 0.75rem;
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
			/*
			 * 가운데 정렬은 `transform` 이 아니라 `translate` 로 한다.
			 * sheet-up 키프레임이 `transform` 을 쓰기 때문에, 여기서도 transform 을 쓰면
			 * 올라오는 동안 가운데 정렬이 통째로 지워졌다가 끝날 때 툭 튀어 들어왔다.
			 */
			translate: -50% 0;
			border-radius: var(--radius-panel);
		}

		/*
		 * **두 칸.**
		 *
		 * 네 칸으로 잘랐더니 한 칸이 98px 인데 버튼은 `px-9 text-xl` 이라 그보다 넓었고,
		 * `1fr`(= minmax(auto,1fr)) 는 내용보다 작아지지 않으므로 버튼 줄이 통째로
		 * 시트 밖으로 삐져나왔다. 화면 밖으로는 안 나가서 넘침 검사에도 안 걸렸다.
		 */
		.sheet-actions {
			grid-template-columns: repeat(2, 1fr);
		}

		/* 로그아웃은 성격이 다르다 — 한 줄을 통째로 쓰게 두어 도감·상점과 구분한다 */
		.sheet-actions form {
			grid-column: 1 / -1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.me,
		.sheet {
			animation: none;
		}
	}
</style>
