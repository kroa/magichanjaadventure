<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import TopHud from '$lib/components/layout/TopHud.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Chip from '$lib/components/common/Chip.svelte';
	import LockedGoal from '$lib/components/shop/LockedGoal.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import { purchase } from '$lib/stores/purchase.svelte';
	import { sound } from '$lib/sound/index.svelte';
	import { SPRITES } from '$lib/game/characters';
	import { ALL_CLASSES, CHARACTERS, type CharacterClass } from '$lib/types/user';
	import { ITEMS, bonusFrom } from '$lib/types/item';

	// `form` 은 더 이상 쓰지 않는다 — 오류·구매 알림을 전부 enhance 콜백에서 처리한다
	let { data } = $props();

	let tab = $state<'character' | 'item'>('character');
	let busy = $state<string | null>(null);

	const owned = $derived(new Set<CharacterClass>(data.ownedCharacters));
	const ownedItems = $derived(new Set<string>(data.ownedItems));
	const bonus = $derived(bonusFrom(data.ownedItems));

	/**
	 * 구매/장착 폼의 공통 처리.
	 *
	 * **오류 알림도 여기서 한다.** 예전에는 `$effect` 안에서 토스트를 띄웠는데,
	 * 하이드레이션 도중 상태를 건드리면 클라이언트 JS 가 통째로 죽어 폼이
	 * 네이티브 POST 로 강등된다 — 배우기 화면이 이미 겪고 기록해 둔 사고다.
	 * 구매는 "반응해야 할 파생 상태" 가 아니라 "한 번 일어난 사건" 이다.
	 */
	function submitting(name: string): SubmitFunction {
		// 서버가 깎기 **전** 값을 잡아 둔다. update() 뒤에는 이미 줄어 있어 카운트다운 시작점이 없다
		const gemsBefore = data.user.gems;

		return () => {
			busy = name;
			return async ({ update, result }) => {
				await update({ reset: false });
				busy = null;

				if (result.type !== 'success') {
					toasts.warn('잠깐 문제가 생겼어요. 다시 눌러 주세요.');
					return;
				}

				const payload = result.data as
					| { error?: string; bought?: CharacterClass; boughtItem?: string; gems?: number }
					| undefined;

				if (payload?.error) {
					toasts.warn(payload.error);
					return;
				}

				if (payload?.bought) {
					purchase.show({
						title: CHARACTERS[payload.bought].label,
						characterClass: payload.bought,
						icon: null,
						gems: payload.gems ?? data.user.gems,
						gemsBefore
					});
					return;
				}

				if (payload?.boughtItem) {
					const item = ITEMS.find((i) => i.id === payload.boughtItem);
					purchase.show({
						title: item?.name ?? '새 장비',
						characterClass: null,
						icon: item?.icon ?? '⚔️',
						gems: payload.gems ?? data.user.gems,
						gemsBefore
					});
					return;
				}

				// 장착처럼 사건이 아닌 성공은 소리만
				sound.play('reward');
			};
		};
	}
</script>

<svelte:head>
	<title>상점 · 마법한자탐험대</title>
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

	<div class="flex flex-col gap-4">
		<div>
			<h1 class="text-display-lg text-magic-700">상점</h1>
			<p class="mt-1 text-sm text-ink-500">
				<!--
				예전에는 "퀴즈 · 대결 · 업적" 이라고 적혀 있었다. **퀴즈로는 한 개도 안 나온다.**
				아이가 그 말을 믿고 복습만 반복하면 영원히 아무것도 못 산다.
			-->
				보석은 <strong class="text-ember-500">대결에서 이기면</strong> 모여요. 업적으로도 조금씩
				받아요.
				{#if bonus.attack > 0 || bonus.hp > 0}
					지금 장비 보너스 —
					<strong class="text-ember-500">공격 +{bonus.attack}</strong> ·
					<strong class="text-mint-600">에너지 +{bonus.hp}</strong>
				{/if}
			</p>
		</div>

		<div class="flex gap-2">
			<Chip selected={tab === 'character'} onclick={() => (tab = 'character')}>🧙 캐릭터</Chip>
			<Chip selected={tab === 'item'} onclick={() => (tab = 'item')}>⚔️ 장비</Chip>
		</div>

		{#if tab === 'character'}
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
				{#each ALL_CLASSES as cls (cls)}
					{@const info = CHARACTERS[cls]}
					{@const Sprite = SPRITES[cls]}
					{@const have = owned.has(cls)}
					{@const active = data.user.characterClass === cls}
					{@const canAfford = data.user.gems >= info.price}
					<article
						class="card relative isolate flex flex-col items-center gap-1.5 rounded-card p-3 shadow-card sm:p-4"
						class:active
					>
						{#if active}<Sparkle count={5} />{/if}

						<Sprite size={92} mood={active ? 'cheer' : 'happy'} />

						<div class="flex flex-wrap items-center justify-center gap-1.5">
							<h2 class="font-display text-ink-900">{info.label}</h2>
							{#if active}<Badge tone="magic" fill="solid" size="sm">사용 중</Badge>{/if}
						</div>

						<p class="text-center text-xs leading-snug text-ink-500">{info.blurb}</p>

						<div class="flex gap-2">
							<span class="stat bg-mint-100 text-mint-700">에너지 {info.hp}</span>
							<span class="stat bg-ember-100 text-ember-600">공격 {info.attack}</span>
						</div>

						{#if active}
							<span class="cta cta--done">지금 함께 모험 중</span>
						{:else if have}
							<form
								method="POST"
								action="?/equip"
								class="w-full"
								use:enhance={submitting(`eq-${cls}`)}
							>
								<input type="hidden" name="class" value={cls} />
								<button type="submit" class="cta cta--equip" disabled={busy !== null}>
									{busy === `eq-${cls}` ? '바꾸는 중…' : '이 친구로 바꾸기'}
								</button>
							</form>
						{:else}
							{#if canAfford}
								<form
									method="POST"
									action="?/buyCharacter"
									class="w-full"
									use:enhance={submitting(`buy-${cls}`)}
								>
									<input type="hidden" name="class" value={cls} />
									<button type="submit" class="cta cta--buy" disabled={busy !== null}>
										💎 {info.price}
									</button>
								</form>
							{:else}
								<!-- 닫힌 문이 아니라 목표로 보여 준다. 폼 밖에 둔다 -->
								<LockedGoal
									price={info.price}
									gems={data.user.gems}
									gemsPerWin={data.gemsPerBattleWin}
									label={info.label}
								/>
							{/if}
						{/if}
					</article>
				{/each}
			</div>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2">
				{#each ITEMS as item (item.id)}
					{@const have = ownedItems.has(item.id)}
					{@const canAfford = data.user.gems >= item.price}
					<article
						class="card flex items-center gap-4 rounded-card p-4 shadow-card"
						class:active={have}
					>
						<span class="item-icon" aria-hidden="true">{item.icon}</span>

						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="font-display text-ink-900">{item.name}</h2>
								<Badge tone={item.kind === 'attack' ? 'ember' : 'mint'} size="sm">
									{item.kind === 'attack' ? '공격' : '에너지'} +{item.value}
								</Badge>
							</div>
							<p class="mt-0.5 text-sm text-ink-500">{item.description}</p>
						</div>

						{#if have}
							<span class="pill pill--have">보유 중</span>
						{:else if canAfford}
							<form method="POST" action="?/buyItem" use:enhance={submitting(`item-${item.id}`)}>
								<input type="hidden" name="itemId" value={item.id} />
								<button
									type="submit"
									class="pill pill--buy"
									disabled={busy !== null}
									aria-label="{item.name} 사기 (보석 {item.price}개)"
								>
									💎 {item.price}
								</button>
							</form>
						{:else}
							<!--
								예전에는 회색 버튼 하나가 전부였다. 접근 이름은 "사기" 라고 했는데
								실제로는 못 사는 상태라 말과 상태가 어긋나기도 했다.
							-->
							<div
								class="w-32 shrink-0"
								aria-label="{item.name} 잠김 — 보석 {item.price}개 중 {data.user.gems}개 모음"
							>
								<LockedGoal
									price={item.price}
									gems={data.user.gems}
									gemsPerWin={data.gemsPerBattleWin}
									label={item.name}
								/>
							</div>
						{/if}
					</article>
				{/each}
			</div>

			<p class="text-center text-sm text-ink-400">
				장비는 한 번 사면 계속 적용돼요. 장착·해제를 따로 하지 않아도 됩니다.
			</p>
		{/if}
	</div>
</AppShell>

<style>
	.card {
		background: rgb(255 255 255 / 0.85);
		border: 3px solid transparent;
		transition:
			transform 0.18s var(--ease-pop),
			border-color 0.18s ease;
	}
	.card:hover {
		transform: translateY(-3px);
	}
	.card.active {
		border-color: var(--color-magic-400);
	}

	.stat {
		border-radius: 9999px;
		padding: 0.2rem 0.65rem;
		font-size: 0.78rem;
		font-family: var(--font-display);
	}

	.item-icon {
		display: grid;
		place-items: center;
		width: 3.25rem;
		height: 3.25rem;
		flex-shrink: 0;
		border-radius: 9999px;
		background: var(--color-magic-50);
		font-size: 1.6rem;
	}

	.cta {
		display: grid;
		place-items: center;
		gap: 0.15rem;
		width: 100%;
		min-height: var(--tap-min);
		margin-top: 0.25rem;
		padding: 0 1rem;
		border: none;
		border-radius: var(--radius-button);
		font-family: var(--font-display);
		cursor: pointer;
		transition: filter 0.15s ease;
	}
	.cta--buy {
		background: var(--gradient-gold);
		color: var(--color-ink-900);
		box-shadow: 0 4px 0 var(--color-gold-700);
	}
	.cta--equip {
		background: var(--gradient-magic);
		color: #fff;
		box-shadow: 0 4px 0 var(--color-magic-700);
	}
	.cta--done {
		background: var(--color-magic-50);
		color: var(--color-magic-600);
	}
	.cta:disabled {
		cursor: not-allowed;
		filter: grayscale(0.5);
		opacity: 0.65;
	}

	.pill {
		display: grid;
		place-items: center;
		min-width: 5rem;
		min-height: var(--tap-min);
		padding: 0 0.9rem;
		border: none;
		border-radius: 9999px;
		font-family: var(--font-display);
		white-space: nowrap;
	}
	.pill--buy {
		background: var(--gradient-gold);
		color: var(--color-ink-900);
		box-shadow: 0 4px 0 var(--color-gold-700);
		cursor: pointer;
	}
	.pill--buy:disabled {
		cursor: not-allowed;
		filter: grayscale(0.5);
		opacity: 0.6;
	}
	.pill--have {
		background: var(--color-mint-100);
		color: var(--color-mint-700);
	}
</style>
