<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import TopHud from '$lib/components/layout/TopHud.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Chip from '$lib/components/common/Chip.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import { sound } from '$lib/sound/index.svelte';
	import { SPRITES } from '$lib/game/characters';
	import { ALL_CLASSES, CHARACTERS, type CharacterClass } from '$lib/types/user';
	import { ITEMS, bonusFrom } from '$lib/types/item';

	let { data, form } = $props();

	let tab = $state<'character' | 'item'>('character');
	let busy = $state<string | null>(null);

	const owned = $derived(new Set<CharacterClass>(data.ownedCharacters));
	const ownedItems = $derived(new Set<string>(data.ownedItems));
	const bonus = $derived(bonusFrom(data.ownedItems));

	$effect(() => {
		if (!form) return;
		if (form.error) toasts.warn(form.error);
	});

	/** 구매/장착 폼의 공통 처리. SubmitFunction 타입을 쓰면 update 인자가 정확히 잡힌다. */
	function submitting(name: string): SubmitFunction {
		return () => {
			busy = name;
			return async ({ update, result }) => {
				await update({ reset: false });
				busy = null;
				if (result.type === 'success') sound.play('reward');
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
				보석은 퀴즈 · 대결 · 업적으로 모을 수 있어요.
				{#if bonus.attack > 0 || bonus.hp > 0}
					지금 장비 보너스 —
					<strong class="text-ember-500">공격 +{bonus.attack}</strong> ·
					<strong class="text-mint-600">HP +{bonus.hp}</strong>
				{/if}
			</p>
		</div>

		<div class="flex gap-2">
			<Chip selected={tab === 'character'} onclick={() => (tab = 'character')}>🧙 캐릭터</Chip>
			<Chip selected={tab === 'item'} onclick={() => (tab = 'item')}>⚔️ 장비</Chip>
		</div>

		{#if tab === 'character'}
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each ALL_CLASSES as cls (cls)}
					{@const info = CHARACTERS[cls]}
					{@const Sprite = SPRITES[cls]}
					{@const have = owned.has(cls)}
					{@const active = data.user.characterClass === cls}
					{@const canAfford = data.user.gems >= info.price}
					<article
						class="card relative isolate flex flex-col items-center gap-2 rounded-card p-4 shadow-card"
						class:active
					>
						{#if active}<Sparkle count={5} />{/if}

						<Sprite size={120} mood={active ? 'cheer' : 'happy'} />

						<div class="flex items-center gap-2">
							<h2 class="font-display text-lg text-ink-900">{info.label}</h2>
							{#if active}<Badge tone="magic" fill="solid" size="sm">사용 중</Badge>{/if}
						</div>

						<p class="text-center text-sm text-ink-500">{info.blurb}</p>

						<div class="flex gap-2">
							<span class="stat bg-mint-100 text-mint-700">HP {info.hp}</span>
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
							<form
								method="POST"
								action="?/buyCharacter"
								class="w-full"
								use:enhance={submitting(`buy-${cls}`)}
							>
								<input type="hidden" name="class" value={cls} />
								<button
									type="submit"
									class="cta cta--buy"
									class:poor={!canAfford}
									disabled={busy !== null || !canAfford}
								>
									💎 {info.price}
									{#if !canAfford}<span class="text-xs">보석이 모자라요</span>{/if}
								</button>
							</form>
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
									{item.kind === 'attack' ? '공격' : 'HP'} +{item.value}
								</Badge>
							</div>
							<p class="mt-0.5 text-sm text-ink-500">{item.description}</p>
						</div>

						{#if have}
							<span class="pill pill--have">보유 중</span>
						{:else}
							<form method="POST" action="?/buyItem" use:enhance={submitting(`item-${item.id}`)}>
								<input type="hidden" name="itemId" value={item.id} />
								<button
									type="submit"
									class="pill pill--buy"
									disabled={busy !== null || !canAfford}
									aria-label="{item.name} 사기 (보석 {item.price}개)"
								>
									💎 {item.price}
								</button>
							</form>
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
