<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import SpeechBubble from '$lib/components/common/SpeechBubble.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>로그인 · 마법한자탐험대</title>
</svelte:head>

<AppShell nav={false}>
	<div class="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-4">
		<div class="relative text-center">
			<Sparkle count={6} />
			<h1 class="text-display-lg text-magic-700">마법한자탐험대</h1>
			<p class="mt-1 text-ink-500">다시 만나서 반가워요!</p>
		</div>

		<div class="flex items-end gap-2">
			<WizardSprite size={100} />
			<SpeechBubble tail="bottom-left">
				<p class="font-display">오늘은 어떤 모험을 할까?</p>
			</SpeechBubble>
		</div>

		<form
			method="POST"
			class="glass flex w-full flex-col gap-4 rounded-panel p-6 shadow-card"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<h2 class="text-display-sm text-ink-900">로그인</h2>

			<label class="flex flex-col gap-1.5">
				<span class="font-display text-sm text-ink-700">닉네임</span>
				<input
					name="nickname"
					type="text"
					required
					autocomplete="username"
					value={form?.nickname ?? ''}
					class="field"
				/>
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="font-display text-sm text-ink-700">비밀번호</span>
				<input
					name="password"
					type="password"
					required
					autocomplete="current-password"
					class="field"
				/>
			</label>

			{#if form?.error}
				<p class="rounded-button bg-ember-100 px-4 py-3 text-sm text-ember-600" role="alert">
					{form.error}
				</p>
			{/if}

			<Button type="submit" variant="magic" size="lg" fullWidth loading={submitting}>
				모험 이어하기
			</Button>

			<p class="text-center text-sm text-ink-500">
				처음이라면 <a href="/register" class="text-magic-600 underline" data-allow-small
					>탐험대 입단</a
				>
			</p>
		</form>
	</div>
</AppShell>

<style>
	.field {
		min-height: var(--tap-min);
		padding: 0.75rem 1rem;
		border: 2px solid var(--color-magic-200);
		border-radius: var(--radius-button);
		background: #fff;
		font-size: 1rem;
		color: var(--color-ink-900);
		transition: border-color 0.15s ease;
	}
	.field:focus {
		border-color: var(--color-magic-500);
	}
</style>
