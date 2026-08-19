<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import TopHud from '$lib/components/layout/TopHud.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Panel from '$lib/components/common/Panel.svelte';
	import ProgressBar from '$lib/components/common/ProgressBar.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import SpeechBubble from '$lib/components/common/SpeechBubble.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';

	let { data } = $props();

	const Sprite = $derived(data.user.characterClass === 'wizard' ? WizardSprite : KnightSprite);
	const collectionPercent = $derived(Math.round((data.learned / data.total) * 100));

	/** 대시보드가 아니라 "오늘 뭐 하지?"를 묻는 화면이다. */
	const ACTIONS = [
		{ href: '/learn', icon: '✨', label: '한자 배우기', desc: '새 마법을 익혀요', tone: 'magic' },
		{ href: '/quiz', icon: '⚔️', label: '한자 퀴즈', desc: '배운 걸 겨뤄요', tone: 'gold' },
		{ href: '/collection', icon: '📖', label: '한자 도감', desc: '모은 걸 구경해요', tone: 'mint' },
		{ href: '/battle', icon: '👹', label: '한자 대결', desc: '보스를 물리쳐요', tone: 'candy' }
	] as const;

	const greeting = $derived(
		data.learned === 0
			? '첫 마법 한자를 찾아보자!'
			: data.learned < 10
				? `벌써 ${data.learned}자! 계속 가 볼까?`
				: `오늘은 어떤 모험을 할까?`
	);
</script>

<svelte:head>
	<title>모험 지도 · 마법한자탐험대</title>
	<meta name="description" content="한자를 배우며 떠나는 판타지 모험" />
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

	<div class="flex flex-col gap-6">
		<!-- 캐릭터 무대 -->
		<section class="stage relative overflow-hidden rounded-panel px-4 pt-5 pb-14 shadow-card">
			<Sparkle count={7} />

			<!-- 땅 -->
			<div class="ground" aria-hidden="true"></div>

			<div class="relative flex flex-col items-center gap-1">
				<SpeechBubble tail="bottom-center" tone="white" class="max-w-xs">
					<p class="text-center font-display">{greeting}</p>
				</SpeechBubble>

				<div class="mt-3">
					<Sprite size={180} mood="happy" />
				</div>

				<Badge tone="magic" fill="solid">Lv.{data.user.level} 탐험대원</Badge>
			</div>
		</section>

		<!-- 주요 행동 -->
		<div class="grid gap-3 sm:grid-cols-2">
			{#each ACTIONS as action (action.href)}
				<a href={action.href} class="action flex items-center gap-4 rounded-card p-4 shadow-card">
					<span class="action-icon" aria-hidden="true">{action.icon}</span>
					<span class="min-w-0 flex-1">
						<span class="block font-display text-lg text-ink-900">{action.label}</span>
						<span class="block text-sm text-ink-500">{action.desc}</span>
					</span>
					<span class="text-xl text-magic-400" aria-hidden="true">›</span>
				</a>
			{/each}
		</div>

		<!-- 수집 현황 -->
		<Panel title="한자 도감" icon="📖">
			{#snippet action()}
				<Badge tone="gold" fill="solid">{data.learned} / {data.total}</Badge>
			{/snippet}
			<ProgressBar
				value={data.learned}
				max={data.total}
				tone="gold"
				size="lg"
				label="한자 수집 {data.learned} / {data.total}"
			/>
			<p class="mt-2 text-sm text-ink-500">
				{#if collectionPercent === 0}
					아직 시작 전이에요. 첫 한자를 발견해 볼까요?
				{:else}
					전체의 {collectionPercent}% 를 모았어요!
				{/if}
			</p>
		</Panel>

		<!-- 모험 지도 -->
		<Panel title="모험 지도" icon="🗺️">
			<ol class="map">
				{#each data.areas as state, i (state.area.id)}
					{@const area = state.area}
					<li class="node" class:locked={!state.unlocked}>
						{#if i > 0}<span class="path" aria-hidden="true"></span>{/if}

						<div class="marker" style="--accent:{area.accent}" aria-hidden="true">
							{state.unlocked ? area.emoji : '🔒'}
						</div>

						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<h3 class="font-display text-ink-900">{area.name}</h3>
								<Badge tone={state.unlocked ? 'magic' : 'sky'} size="sm">{area.grade}</Badge>
								{#if state.unlocked && state.learned >= area.hanjaCount}
									<Badge tone="gold" fill="solid" size="sm">완성!</Badge>
								{/if}
							</div>

							{#if state.unlocked}
								<p class="mt-0.5 text-sm text-ink-500">{area.mood}</p>
								<div class="mt-2 flex items-center gap-2">
									<ProgressBar
										value={state.learned}
										max={area.hanjaCount}
										tone="mint"
										size="sm"
										label="{area.name} 진행도"
										class="flex-1"
									/>
									<span class="shrink-0 font-display text-xs text-ink-500">
										{state.learned}/{area.hanjaCount}
									</span>
								</div>
							{:else}
								<p class="mt-0.5 text-sm text-ink-400">{state.lockedReason}</p>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
		</Panel>

		<div class="flex justify-center pb-2">
			<form method="POST" action="/logout">
				<Button type="submit" variant="ghost" size="sm">로그아웃</Button>
			</form>
		</div>
	</div>
</AppShell>

<style>
	.stage {
		background: linear-gradient(180deg, rgb(255 255 255 / 0.75) 0%, rgb(255 255 255 / 0.35) 100%);
	}

	.ground {
		position: absolute;
		inset: auto 0 0 0;
		height: 42px;
		background: linear-gradient(180deg, #b6e59a 0%, #8ecf74 100%);
		border-radius: 50% 50% 0 0 / 26px 26px 0 0;
	}

	.action {
		background: rgb(255 255 255 / 0.85);
		text-decoration: none;
		/* 터치 타깃 하한선 */
		min-height: var(--tap-min);
		transition:
			transform 0.18s var(--ease-pop),
			box-shadow 0.18s var(--ease-pop);
	}
	.action:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-float);
	}

	.action-icon {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		flex-shrink: 0;
		border-radius: 9999px;
		background: var(--color-magic-50);
		font-size: 1.5rem;
	}

	.map {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.node {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 0.85rem;
		padding: 0.6rem 0;
	}

	.node.locked {
		opacity: 0.62;
	}

	/* 지역을 잇는 길 — "이어진 여정"으로 보이게 한다 */
	.path {
		position: absolute;
		left: 1.4rem;
		top: -0.75rem;
		width: 3px;
		height: 0.95rem;
		background: repeating-linear-gradient(
			180deg,
			var(--color-magic-200) 0 5px,
			transparent 5px 10px
		);
	}

	.marker {
		display: grid;
		place-items: center;
		width: 2.8rem;
		height: 2.8rem;
		flex-shrink: 0;
		border-radius: 9999px;
		background: #fff;
		border: 3px solid var(--accent);
		font-size: 1.25rem;
		box-shadow: var(--shadow-soft);
	}
</style>
