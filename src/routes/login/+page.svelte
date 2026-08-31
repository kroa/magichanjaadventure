<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import SpeechBubble from '$lib/components/common/SpeechBubble.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import FloatingGlyphs from '$lib/components/effects/FloatingGlyphs.svelte';
	import type { Mood } from '$lib/types/ui';

	let { form } = $props();
	let submitting = $state(false);
	let focused = $state<'none' | 'nickname' | 'password'>('none');

	/*
	 * 캐릭터가 아이를 **쳐다본다.**
	 * 비밀번호를 칠 때는 고개를 돌리고 안 보겠다고 한다 — 이 한 가지가
	 * "폼을 채우는 중" 을 "누가 나를 기다리는 중" 으로 바꾼다.
	 */
	const mood = $derived<Mood>(
		focused === 'password' ? 'happy' : focused === 'nickname' ? 'cheer' : 'happy'
	);
	const line = $derived(
		focused === 'password'
			? '눈 감고 있을게, 약속!'
			: focused === 'nickname'
				? '이름이 뭐였더라?'
				: '오늘은 어떤 모험을 할까?'
	);
</script>

<svelte:head>
	<title>로그인 · 마법한자탐험대</title>
	<!-- 로그인 폼이 검색결과에 뜨는 것은 아무에게도 도움이 안 된다 -->
	<meta name="robots" content="noindex" />
</svelte:head>

<!--
	로그인 — 폼이 아니라 **문 앞**이다.

	예전 화면은 라벨 두 개와 흰 카드가 전부라 어느 웹사이트에나 있는 폼이었다.
	여기서 아이가 받아야 할 인상은 "가입 절차" 가 아니라 "저 안에 뭔가 있다" 여야 한다.
	 - 배경에 그림 한자가 떠다닌다: 글자 한 줄 없이 여기가 어떤 곳인지 알려 준다
	 - 캐릭터가 입력에 반응한다: 기다리는 사람이 있다는 감각
	 - 라벨을 지우고 아이콘을 넣었다: 읽을 것을 줄인다
-->
<AppShell nav={false}>
	<div class="gate relative isolate">
		<FloatingGlyphs count={9} />

		<div class="relative isolate text-center">
			<Sparkle count={6} />
			<h1 class="title on-sky text-display-lg">마법한자탐험대</h1>
			<!--
				여기가 무엇을 하는 곳인지 한 줄로.
				처음 연 부모도 아이도 "한자 앱" 이라는 것만 알고 무엇이 다른지는 몰랐다.
			-->
			<p class="pitch on-sky">한자를 외우지 않아요.<br />조각을 붙여 만들면서 배워요.</p>
		</div>

		<div class="greet">
			<div class="hero" class:turned={focused === 'password'}>
				<WizardSprite size={104} {mood} shy={focused === 'password'} />
			</div>
			<SpeechBubble tail="bottom-left">
				<p class="font-display">{line}</p>
			</SpeechBubble>
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
					placeholder="닉네임"
					aria-label="닉네임"
					value={form?.nickname ?? ''}
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
					autocomplete="current-password"
					placeholder="비밀번호"
					aria-label="비밀번호"
					onfocus={() => (focused = 'password')}
					onblur={() => (focused = 'none')}
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

			<!--
				**처음 온 아이에게는 이 버튼이 가장 중요하다.**
				예전에는 밑줄 친 작은 글자 링크였고, 48px 탭 하한을 면제받는
				`data-allow-small` 까지 붙어 있었다 — 화면에서 가장 작은 것이
				가장 중요한 길이었던 셈이다. 크기와 무게를 되찾아 준다.
			-->
			<div class="or" aria-hidden="true"><span>처음이라면</span></div>
			<Button variant="mint" size="lg" fullWidth href="/register">탐험대 입단하기</Button>
		</form>

		<p class="made-by on-sky">만든 사람 · 김태윤 아빠</p>
	</div>
</AppShell>

<style>
	.pitch {
		margin-top: 0.35rem;
		font-size: 0.95rem;
		line-height: 1.5;
		text-align: center;
	}

	/* 로그인과 입단 사이의 경계. 둘이 다른 길이라는 것을 한눈에 보여 준다 */
	.or {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		color: var(--color-ink-500);
		font-size: 0.8rem;
	}

	.or::before,
	.or::after {
		flex: 1;
		height: 1px;
		background: var(--color-magic-200, rgb(221 213 255));
		content: '';
	}

	.made-by {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		opacity: 0.85;
	}

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

	/* 제목이 위에서 통통 내려온다. 화면이 열리는 느낌을 만드는 가장 싼 방법이다 */
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
		gap: 0.5rem;
	}

	/* 캐릭터가 가만히 숨 쉰다 */
	/*
	 * **고개 돌리기는 `transform` 이 아니라 `rotate`/`translate` 로 한다.**
	 *
	 * `hero-bob` 무한 애니메이션이 `transform` 을 쥐고 있어서, 애니메이션 오리진이
	 * 저자 선언을 이긴다. 그래서 `.hero.turned { transform: rotate(...) }` 는
	 * **한 번도 적용된 적이 없었다** — 실측 computed transform 은 회전 0 이었다.
	 * 개별 속성은 transform 과 따로 합성되므로 keyframes 에 안 먹힌다.
	 */
	.hero {
		animation: hero-bob 3.4s ease-in-out infinite;
		transition:
			rotate 0.35s var(--ease-pop, cubic-bezier(0.34, 1.56, 0.64, 1)),
			translate 0.35s var(--ease-pop, cubic-bezier(0.34, 1.56, 0.64, 1));
	}

	/* 비밀번호를 칠 때 고개를 돌린다 */
	.hero.turned {
		rotate: -16deg;
		translate: -6px 0;
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

	/* 지금 쓰는 칸이 살짝 커지며 빛난다 */
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
		/*
		 * 입력칸 자체가 손가락 하한선을 넘어야 한다.
		 * 감싼 상자만 크게 하면 실제로 눌리는 <input> 은 26px 밖에 안 돼서
		 * 아이가 정확히 겨냥해야 커서가 들어간다 (레이아웃 검사가 이걸 잡아냈다).
		 */
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
