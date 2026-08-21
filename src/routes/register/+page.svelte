<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import SpeechBubble from '$lib/components/common/SpeechBubble.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import FloatingGlyphs from '$lib/components/effects/FloatingGlyphs.svelte';
	import type { Mood } from '$lib/types/ui';

	let { form } = $props();
	let submitting = $state(false);
	let focused = $state<'none' | 'nickname' | 'password'>('none');

	/* 비밀번호를 칠 때는 둘 다 고개를 돌린다 — 로그인 화면과 같은 약속이다 */
	const mood = $derived<Mood>(
		focused === 'password' ? 'surprised' : focused === 'nickname' ? 'cheer' : 'happy'
	);
	const line = $derived(
		focused === 'password'
			? '안 볼게, 약속!'
			: focused === 'nickname'
				? '뭐라고 부를까?'
				: '탐험대에 들어올래?'
	);
</script>

<svelte:head>
	<title>탐험대 입단 · 마법한자탐험대</title>
</svelte:head>

<AppShell nav={false}>
	<div class="gate relative isolate">
		<FloatingGlyphs count={9} />

		<div class="relative isolate text-center">
			<Sparkle count={6} />
			<h1 class="title text-display-lg text-magic-700">마법한자탐험대</h1>
		</div>

		<div class="greet">
			<div class="hero" class:turned={focused === 'password'}>
				<KnightSprite size={88} {mood} />
			</div>
			<SpeechBubble tail="bottom-center" tone="white">
				<p class="font-display">{line}</p>
			</SpeechBubble>
			<div class="hero late" class:turned={focused === 'password'}>
				<WizardSprite size={88} {mood} />
			</div>
		</div>

		<form
			method="POST"
			class="card"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<!-- 라벨 대신 아이콘. 읽지 않아도 무엇을 넣는 칸인지 안다 -->
			<label class="field" class:on={focused === 'nickname'}>
				<span class="icon" aria-hidden="true">🙂</span>
				<input
					name="nickname"
					type="text"
					required
					autocomplete="username"
					maxlength="12"
					value={form?.nickname ?? ''}
					placeholder="별빛기사"
					aria-label="닉네임 (한글·영어·숫자 2~12글자)"
					onfocus={() => (focused = 'nickname')}
					onblur={() => (focused = 'none')}
				/>
			</label>

			<label class="field" class:on={focused === 'password'}>
				<span class="icon" aria-hidden="true">🔑</span>
				<input
					name="password"
					type="password"
					required
					autocomplete="new-password"
					minlength="6"
					placeholder="비밀번호 (6글자 이상)"
					aria-label="비밀번호"
					onfocus={() => (focused = 'password')}
					onblur={() => (focused = 'none')}
				/>
			</label>

			<label class="field" class:on={focused === 'password'}>
				<span class="icon" aria-hidden="true">🔁</span>
				<input
					name="confirm"
					type="password"
					required
					autocomplete="new-password"
					minlength="6"
					placeholder="한 번 더"
					aria-label="비밀번호 확인"
					onfocus={() => (focused = 'password')}
					onblur={() => (focused = 'none')}
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
	.gate {
		display: flex;
		width: 100%;
		max-width: 26rem;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		margin: 0 auto;
		padding: 0.5rem 0;
	}

	.title {
		animation: title-drop 0.7s var(--ease-pop, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
	}

	@keyframes title-drop {
		from {
			opacity: 0;
			transform: translateY(-26px) scale(0.86);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.greet {
		display: flex;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.hero {
		animation: hero-bob 3.4s ease-in-out infinite;
		transition: transform 0.35s var(--ease-pop, cubic-bezier(0.34, 1.56, 0.64, 1));
	}

	/* 둘이 똑같이 흔들리면 인형 같다. 한 박자 어긋나야 살아 있어 보인다 */
	.hero.late {
		animation-delay: -1.2s;
	}

	.hero.turned {
		transform: rotate(-16deg) translateX(-4px);
	}

	.hero.late.turned {
		transform: rotate(16deg) translateX(4px);
	}

	@keyframes hero-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-7px);
		}
	}

	.card {
		display: flex;
		width: 100%;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1.25rem;
		border-radius: var(--radius-panel);
		background: rgb(255 255 255 / 0.82);
		backdrop-filter: blur(10px);
		box-shadow: var(--shadow-card);
		animation: card-rise 0.6s ease-out 0.15s both;
	}

	@keyframes card-rise {
		from {
			opacity: 0;
			transform: translateY(18px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.field {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		/* 아이 손가락 기준 하한선보다 넉넉하게 */
		min-height: 3.5rem;
		padding: 0 1rem;
		border: 3px solid var(--color-magic-200);
		border-radius: var(--radius-button);
		background: #fff;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			transform 0.15s var(--ease-pop, cubic-bezier(0.34, 1.56, 0.64, 1));
	}

	.field.on {
		transform: translateY(-2px);
		border-color: var(--color-magic-400);
		box-shadow: 0 0 0 4px rgb(124 92 255 / 0.18);
	}

	.field .icon {
		font-size: 1.25rem;
		line-height: 1;
	}

	.field input {
		/* 실제로 눌리는 것은 <input> 이다. 감싼 상자만 키우면 타깃이 26px 밖에 안 된다 */
		width: 100%;
		align-self: stretch;
		min-height: var(--tap-min);
		border: 0;
		background: none;
		color: var(--color-ink-900);
		font-size: 1rem;
		outline: none;
	}

	.field input::placeholder {
		color: var(--color-ink-500);
	}

	@media (prefers-reduced-motion: reduce) {
		.title,
		.card,
		.hero {
			animation: none;
		}
	}
</style>
