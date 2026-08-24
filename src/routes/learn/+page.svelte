<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import TopHud from '$lib/components/layout/TopHud.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Chip from '$lib/components/common/Chip.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import HanjaReveal from '$lib/components/hanja/HanjaReveal.svelte';
	import TraceGlyph from '$lib/components/play/TraceGlyph.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import { announceReward } from '$lib/game/announce';
	import { sound } from '$lib/sound/index.svelte';
	import { expToNextLevel } from '$lib/game/exp';
	import type { RewardDto } from '$lib/types/api';

	let { data } = $props();

	let claimed = $state(false);
	/** 폼을 대신 눌러 주기 위한 참조 — 다 쓰면 그때 제출한다 */
	let claimForm = $state<HTMLFormElement | null>(null);
	let submitting = $state(false);
	let reward = $state<RewardDto | null>(null);
	let loadingNext = $state(false);

	/*
	 * 보상 알림은 $effect 가 아니라 **enhance 콜백**에서 띄운다.
	 *
	 * $effect 안에서 토스트 상태를 건드리면 하이드레이션 도중 unsafe mutation 이 되어
	 * 클라이언트 JS 가 통째로 죽는다. 그러면 폼이 use:enhance 를 타지 않고
	 * 네이티브 POST 로 떨어져 화면 상태가 초기화된다. 실제로 그 버그를 겪었다.
	 *
	 * 보상은 "반응해야 할 파생 상태"가 아니라 "한 번 일어난 사건"이므로
	 * 사건이 발생한 자리에서 처리하는 것이 옳다.
	 */

	// 서버가 확정한 값만 화면에 반영한다
	const level = $derived(reward?.level ?? data.user.level);
	const exp = $derived(reward?.exp ?? data.user.exp);
	const gems = $derived(reward?.gems ?? data.user.gems);

	/**
	 * 다음 한자로 넘어간다.
	 *
	 * **순서가 중요하다.** `claimed = false` 를 먼저 하면 아직 갱신되지 않은 *같은* 한자로
	 * "배우기" 버튼이 살아나고, 빠르게 누르면 이미 배운 한자를 다시 배우게 된다
	 * (서버는 ON CONFLICT DO NOTHING 이라 조용히 무시 → 아이 입장에선 진도가 안 나간다).
	 * 실제로 4자를 배웠는데 2자만 도감에 들어간 버그가 있었다.
	 *
	 * 그래서 새 데이터를 **먼저 받고** 나서 화면을 되돌린다.
	 */
	async function next() {
		loadingNext = true;
		try {
			await invalidateAll();
			claimed = false;
			reward = null;
		} finally {
			loadingNext = false;
		}
	}
</script>

<svelte:head>
	<title>한자 배우기 · 마법한자탐험대</title>
</svelte:head>

<AppShell>
	{#snippet hud()}
		<TopHud nickname={data.user.nickname} {level} {exp} expToNext={expToNextLevel(level)} {gems} />
	{/snippet}

	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-center gap-2">
			{#each data.areas as area (area.id)}
				<Chip
					selected={area.id === data.areaId}
					onclick={() => (location.href = `/learn?area=${area.id}`)}
				>
					<span aria-hidden="true">{area.emoji}</span>
					{area.name}
					<span class="text-xs opacity-70">{area.learned}/{area.total}</span>
				</Chip>
			{/each}
		</div>

		{#if data.areaDone || !data.hanja}
			<EmptyState
				icon="🎉"
				title="{data.areaName}의 한자를 모두 모았어요!"
				description="다른 지역으로 가거나 퀴즈로 복습해 볼까요?"
			>
				{#snippet action()}
					<div class="flex flex-wrap justify-center gap-3">
						<Button variant="gold" href="/quiz">퀴즈 풀기</Button>
						<Button variant="ghost" href="/">모험 지도</Button>
					</div>
				{/snippet}
			</EmptyState>
		{:else}
			{#if claimed}
				<!-- 다 쓰고 나서야 뜻·음·예시가 나온다. 읽는 것이 **보상**이 되도록 순서를 뒤집었다 -->
				<HanjaReveal
					character={data.hanja.character}
					reading={data.hanja.reading}
					meaning={data.hanja.meaning}
					gradeLabel={data.hanja.gradeLabel}
					strokeCount={data.hanja.strokeCount}
					description={data.hanja.description}
					exampleWords={data.hanja.exampleWords}
					{claimed}
				/>
			{:else}
				<!--
					**아이가 손으로 글자를 나타나게 한다.**
					예전에는 카드에 적힌 뜻·음·획수·설명을 읽고 버튼을 누르는 것이 전부였다.
					지금은 흙을 문지르면 손이 지나간 자리만 드러난다 —
					이 앱이 하는 일을 한 장면으로 보여 준다.

					그리고 그 무대가 **지역마다 다르다.**

					AREAS 에 지역마다 하늘·대표색·분위기·흙이 다 정의돼 있는데 화면이 하나도 안 썼다.
					그래서 새싹 마을과 반짝 시냇가가 보기에 완전히 같았고, 나오는 한자만 달랐다.

					전역 배경(SkyBackground)을 바꾸지 않고 **패널 안에 가둔다** —
					9곳 중 6곳이 밝은 파스텔이라 전역을 바꾸면 흰 글씨와 유리 패널이 전부 대비를 잃는다.
					대결 화면이 이미 쓰는 `--sky` 방식과 같다.
				-->
				<section
					class="area-stage"
					data-testid="area-stage"
					data-area={data.area.id}
					style="--area-sky:{data.area.sky}"
				>
					<p class="stage-line">
						<span aria-hidden="true">{data.area.emoji}</span>
						{data.area.mood}
					</p>
					<TraceGlyph
						character={data.hanja.character}
						size={208}
						texture={data.area.soil}
						accent={data.area.accent}
						strokes={data.strokes}
						oncomplete={() => claimForm?.requestSubmit()}
					/>
					<p class="stage-line">
						{#if data.strokes}
							쓰는 순서를 보여 줄게요 · 금색 선을 따라 한 획씩 그어 보세요
						{:else}
							흙을 문질러 한자를 파내 보세요
						{/if}
					</p>
				</section>
			{/if}

			{#if claimed}
				<div class="flex flex-col items-center gap-3" data-testid="learn-done">
					<p class="font-display text-lg text-mint-600">
						새로운 한자를 발견했어요! +{reward?.expGained ?? 20} EXP
					</p>
					<div class="flex w-full flex-wrap justify-center gap-3">
						<Button variant="magic" size="lg" onclick={next} loading={loadingNext}
							>다음 한자 배우기</Button
						>
						<!--
							**지킬 수 있는 약속만 한다.**

							예전에는 무조건 "방금 배운 걸로 복습" 이라 쓰고 `/quiz?focus=` 로 보냈다.
							그 약속이 실제로 지켜지는 글자는 1000자 중 26자뿐이었다 —
							나머지 974번은 상관없는 판을 내주면서 "방금 배운 걸로" 라고 말한 셈이다.
							지금은 서버(`pickNextPlay`)가 미리 보고 문구와 목적지를 맞춘다.
							금색은 "지금 바로 된다" 는 신호로만 남긴다.
						-->
						{#if data.nextPlay?.kind === 'ready'}
							<Button variant="gold" size="lg" href={data.nextPlay.href}>
								{#if data.nextPlay.doubled}
									{data.hanja.character} 두 개 붙여 보기
								{:else}
									{data.hanja.character} 와 {data.nextPlay.partner} 붙여 보기
								{/if}
							</Button>
						{:else if data.nextPlay?.kind === 'word'}
							<!--
								**낱말 축.** 조합으로는 못 쓰는 글자가 950자다 —
								사용자가 場 과 室 로 두 번 신고한 그 문제다. 낱말은 955자를 덮는다.
							-->
							<Button variant="gold" size="lg" href={data.nextPlay.href}>
								{data.nextPlay.partner} 와 붙여 「{data.nextPlay.result}」 만들기
							</Button>
						{:else if data.nextPlay?.kind === 'review'}
							<Button variant="magic" size="lg" href={data.nextPlay.href}>
								지금까지 배운 걸로 놀기
							</Button>
						{:else}
							<Button variant="magic" size="lg" href={data.nextPlay?.href ?? '/fusion'}>
								합체 공방으로
							</Button>
						{/if}
					</div>
				</div>
			{:else}
				<form
					method="POST"
					action="?/learn"
					bind:this={claimForm}
					class="flex justify-center"
					use:enhance={() => {
						submitting = true;
						return async ({ result }) => {
							submitting = false;

							if (result.type !== 'success') {
								toasts.warn('잠깐 문제가 생겼어요. 다시 눌러 주세요.');
								return;
							}

							const payload = result.data as {
								ok: boolean;
								alreadyKnown?: boolean;
								reward?: RewardDto | null;
							};

							claimed = true;
							reward = payload?.reward ?? null;

							sound.play('discover');
							announceReward(reward, data.user.characterClass);
						};
					}}
				>
					<input type="hidden" name="hanjaId" value={data.hanja.id} />
					<!--
						글자를 다 쓰면 이 버튼이 대신 눌린다.
						버튼 자체도 남겨 둔다 — 손가락이 서툰 아이, 키보드 사용자, JS 가 죽은 경우를 위해서다.
					-->
					<Button type="submit" variant="ghost" size="sm" loading={submitting}>
						이 한자 배우기
					</Button>
				</form>
			{/if}
		{/if}
	</div>
</AppShell>

<style>
	/* 지역 무대 — 여기가 "어느 곳인지" 를 보여 주는 유일한 자리다 */
	.area-stage {
		display: grid;
		justify-items: center;
		gap: 0.6rem;
		padding: 0.75rem;
		border-radius: var(--radius-panel);
		background: var(--area-sky);
		box-shadow: var(--shadow-card);
	}

	/*
	 * 하늘 아홉 개 중 여섯은 밝은 파스텔이고 셋은 어둡다.
	 * 어디서나 읽히는 한 벌은 "어두운 알약 + 흰 글씨" 뿐이라 그걸로 통일한다.
	 * 고정 높이나 nowrap 을 주지 않는다 — 분위기 문구가 길어 두 줄이 되는 지역이 있다.
	 */
	.stage-line {
		max-width: 100%;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		background: rgb(28 20 58 / 0.78);
		color: #fff;
		font-size: 0.75rem;
		text-align: center;
	}
</style>
