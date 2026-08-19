<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import SpeechBubble from '$lib/components/common/SpeechBubble.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>탐험대 입단 · 마법한자탐험대</title>
</svelte:head>

<AppShell nav={false}>
	<div class="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-4">
		<div class="relative text-center">
			<Sparkle count={6} />
			<h1 class="text-display-lg text-magic-700">마법한자탐험대</h1>
			<p class="mt-1 text-ink-500">한자를 배우며 떠나는 판타지 모험</p>
		</div>

		<div class="flex items-end gap-2">
			<KnightSprite size={92} />
			<SpeechBubble tail="bottom-center" tone="white">
				<p class="font-display">탐험대에 들어올래?</p>
			</SpeechBubble>
			<WizardSprite size={92} />
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
			<h2 class="text-display-sm text-ink-900">탐험대 입단</h2>

			<label class="flex flex-col gap-1.5">
				<span class="font-display text-sm text-ink-700">닉네임</span>
				<input
					name="nickname"
					type="text"
					required
					autocomplete="username"
					maxlength="12"
					value={form?.nickname ?? ''}
					placeholder="별빛기사"
					class="field"
				/>
				<span class="text-xs text-ink-400">한글·영어·숫자 2~12글자</span>
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="font-display text-sm text-ink-700">비밀번호</span>
				<input
					name="password"
					type="password"
					required
					autocomplete="new-password"
					minlength="6"
					placeholder="6글자 이상"
					class="field"
				/>
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="font-display text-sm text-ink-700">비밀번호 확인</span>
				<input
					name="confirm"
					type="password"
					required
					autocomplete="new-password"
					minlength="6"
					placeholder="한 번 더"
					class="field"
				/>
			</label>

			{#if form?.error}
				<p class="rounded-button bg-ember-100 px-4 py-3 text-sm text-ember-600" role="alert">
					{form.error}
				</p>
			{/if}

			<p class="text-xs text-ink-400">
				닉네임과 비밀번호만 받아요. 이메일·전화번호는 묻지 않습니다.
			</p>

			<Button type="submit" variant="magic" size="lg" fullWidth loading={submitting}>
				모험 시작하기
			</Button>

			<p class="text-center text-sm text-ink-500">
				이미 대원이라면 <a href="/login" class="text-magic-600 underline" data-allow-small>로그인</a
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
