<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import ProgressBar from '$lib/components/common/ProgressBar.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import ParticleBurst from '$lib/components/effects/ParticleBurst.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import MonsterSprite from '$lib/components/art/MonsterSprite.svelte';
	import { isSpecialCombo } from '$lib/game/exp';
	import { toasts } from '$lib/stores/toast.svelte';
	import { announceReward } from '$lib/game/announce';
	import { sound } from '$lib/sound/index.svelte';
	import { spriteFor } from '$lib/game/characters';
	import type { Mood } from '$lib/types/ui';
	import type { QuizAnswerResponse } from '$lib/types/api';

	let { data } = $props();

	const Hero = $derived(spriteFor(data.user.characterClass));

	let index = $state(0);
	let combo = $state(0);
	let correctCount = $state(0);

	let chosen = $state<string | null>(null);
	let result = $state<{ isCorrect: boolean; answer: string; expGained: number } | null>(null);
	let busy = $state(false);
	let burst = $state(0);
	let askedAt = $state(Date.now());

	const question = $derived(data.questions[index] ?? null);
	const finished = $derived(index >= data.questions.length);
	const heroMood = $derived<Mood>(result ? (result.isCorrect ? 'cheer' : 'sad') : 'happy');
	const enemyMood = $derived<Mood>(result?.isCorrect ? 'surprised' : 'happy');
	const isLast = $derived(index + 1 === data.questions.length);

	async function answer(option: string) {
		if (busy || result || !question) return;
		busy = true;
		chosen = option;

		try {
			const response = await fetch('/api/quiz/answer', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					hanjaId: question.hanjaId,
					type: question.type,
					chosen: option,
					combo,
					answerMs: Date.now() - askedAt,
					sessionKey: data.sessionKey
				})
			});

			if (!response.ok) throw new Error('채점에 실패했어요');
			const payload = (await response.json()) as QuizAnswerResponse;

			// 화면에 반영하는 값은 전부 서버가 확정한 것이다
			combo = payload.combo;
			result = {
				isCorrect: payload.isCorrect,
				answer: payload.answer,
				expGained: payload.breakdown.total
			};

			if (payload.isCorrect) {
				correctCount += 1;
				burst += 1;
			}

			sound.play(payload.isCorrect ? 'correct' : 'wrong');

			announceReward(payload.reward, data.user.characterClass);

			if (isSpecialCombo(payload.combo)) toasts.success(`${payload.combo} 콤보! 🔥`);
		} catch {
			toasts.warn('연결이 잠깐 끊겼어요. 다시 눌러 주세요.');
			chosen = null;
		} finally {
			busy = false;
		}
	}

	function next() {
		index += 1;
		chosen = null;
		result = null;
		askedAt = Date.now();
	}
</script>

<svelte:head>
	<title>한자 퀴즈 · 마법한자탐험대</title>
</svelte:head>

<!--
	퀴즈는 **집중 모드**다.
	 - 하단 네비게이션을 숨긴다: 문제를 푸는 중 오터치를 막고, 화면 세로 공간 72px 을 되찾는다
	 - 대신 헤더에 나가기 버튼을 둔다
	 - 결과/다음 버튼은 sticky 로 항상 화면 안에 있다 (스크롤해서 찾지 않아도 된다)
-->
<AppShell nav={false} class="quiz-shell">
	{#if data.questions.length === 0}
		<EmptyState
			icon="✨"
			title="아직 퀴즈를 낼 한자가 없어요"
			description="한자를 먼저 배우면 그 한자로 퀴즈가 만들어져요."
		>
			{#snippet action()}
				<Button variant="magic" href="/learn">한자 배우러 가기</Button>
			{/snippet}
		</EmptyState>
	{:else if finished}
		<div class="flex flex-col items-center gap-4 py-4 text-center" data-testid="quiz-finished">
			<div class="relative isolate">
				<Sparkle count={8} />
				<Hero size={150} mood="cheer" />
			</div>
			<h1 class="text-display-lg text-magic-700">모험 끝!</h1>
			<p class="text-ink-700">
				{data.questions.length}문제 중 <strong class="text-mint-600">{correctCount}문제</strong> 정답
			</p>
			<div class="flex flex-wrap justify-center gap-3">
				<Button variant="magic" size="lg" href="/quiz" data-sveltekit-reload>한 판 더!</Button>
				<Button variant="ghost" size="lg" href="/">모험 지도로</Button>
			</div>
		</div>
	{:else if question}
		<div class="stage-grid">
			<!-- 헤더: 나가기 · 진행도 · 콤보 · 젬 -->
			<header class="flex items-center gap-2">
				<a href="/" class="exit" aria-label="모험 지도로 나가기">✕</a>
				<ProgressBar
					value={index}
					max={data.questions.length}
					tone="magic"
					size="sm"
					label="퀴즈 진행도"
					class="flex-1"
				/>
				<span class="shrink-0 font-display text-sm text-ink-500">
					{index + 1}/{data.questions.length}
				</span>
				{#if combo >= 2}
					<Badge tone="gold" fill="solid" size="sm">🔥{combo}</Badge>
				{/if}
			</header>

			<!-- 대결 무대 + 문제를 한 카드로 합쳤다 (카드 두 개는 세로 공간을 너무 먹는다) -->
			<section class="arena relative isolate overflow-hidden rounded-panel shadow-card">
				<ParticleBurst trigger={burst} />

				<div class="flex items-end justify-between px-3 pt-3">
					<Hero size={72} mood={heroMood} />
					<span class="pb-4 font-display text-lg text-magic-400" aria-hidden="true">VS</span>
					<MonsterSprite size={72} mood={enemyMood} />
				</div>

				<div class="px-4 pb-4 text-center" data-testid="quiz-question">
					<p class="text-sm text-ink-500">{question.prompt}</p>
					<p
						class="leading-none text-magic-800 {question.subjectIsHanja
							? 'hanja text-hanja-quiz'
							: 'font-display text-display-lg'}"
					>
						{question.subject}
					</p>
				</div>
			</section>

			<!-- 보기: 모바일에서 1열 세로 스택 (2×2 그리드는 오답 터치를 유발한다) -->
			<div class="grid content-start gap-2.5">
				{#each question.options as option (option)}
					{@const isAnswer = result && option === result.answer}
					{@const isChosen = chosen === option}
					<button
						type="button"
						class="option rounded-button px-5 font-display text-lg"
						class:correct={isAnswer}
						class:wrong={result && isChosen && !result.isCorrect}
						disabled={!!result || busy}
						onclick={() => answer(option)}
					>
						<span class={question.type === 'character' ? 'hanja text-3xl' : ''}>{option}</span>
						{#if isAnswer}<span aria-hidden="true">⭕</span>{/if}
						{#if result && isChosen && !result.isCorrect}<span aria-hidden="true">❌</span>{/if}
					</button>
				{/each}
			</div>

			<!--
				결과 바는 sticky 다. 답을 고르면 **스크롤하지 않아도** 바로 다음으로 갈 수 있다.
				(예전엔 보기 아래에 있어서 아이가 버튼을 찾아 내려야 했다)
			-->
			{#if result}
				<footer class="result-bar" data-testid="quiz-result">
					<p
						class="font-display text-base {result.isCorrect ? 'text-mint-600' : 'text-ember-500'}"
						role="status"
					>
						{#if result.isCorrect}
							정답이에요! +{result.expGained} EXP
						{:else}
							정답은 <strong>{result.answer}</strong> 예요
						{/if}
					</p>
					<Button variant="magic" size="lg" onclick={next} fullWidth>
						{isLast ? '결과 보기' : '다음 문제'}
					</Button>
				</footer>
			{/if}
		</div>
	{/if}
</AppShell>

<style>
	/*
	 * 한 화면에 담기 위한 격자.
	 * 헤더·무대·보기는 자기 높이만큼, 남는 공간은 보기 영역이 흡수한다.
	 */
	.stage-grid {
		display: grid;
		grid-template-rows: auto auto 1fr auto;
		gap: 0.75rem;
		min-height: calc(100dvh - 3rem);
	}

	.exit {
		display: grid;
		place-items: center;
		/* 아이 손가락 기준 하한선 */
		width: var(--tap-min);
		height: var(--tap-min);
		flex-shrink: 0;
		border-radius: 9999px;
		background: rgb(255 255 255 / 0.85);
		color: var(--color-ink-500);
		text-decoration: none;
		font-size: 1rem;
		box-shadow: var(--shadow-soft);
	}

	.arena {
		background: linear-gradient(180deg, #dff1ff 0%, #f2e9ff 100%);
	}

	.option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		/* 아이 손가락 기준 하한선보다 넉넉하게 */
		min-height: 3.25rem;
		border: 3px solid var(--color-magic-200);
		border-radius: var(--radius-button);
		background: #fff;
		color: var(--color-ink-900);
		cursor: pointer;
		transition:
			transform 0.15s var(--ease-pop),
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.option:hover:not(:disabled) {
		transform: translateY(-2px);
		border-color: var(--color-magic-400);
	}

	.option:disabled {
		cursor: default;
	}

	/* 정답/오답을 색으로만 알리지 않는다 — 아이콘과 텍스트를 함께 쓴다 */
	.option.correct {
		border-color: var(--color-mint-500);
		background: var(--color-mint-100);
	}

	.option.wrong {
		border-color: var(--color-ember-500);
		background: var(--color-ember-100);
		animation: var(--animate-shake);
	}

	.result-bar {
		position: sticky;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 0 max(0.75rem, env(safe-area-inset-bottom));
		background: linear-gradient(180deg, rgb(246 238 255 / 0) 0%, rgb(246 238 255 / 0.95) 35%);
		backdrop-filter: blur(6px);
	}

	.result-bar :global(a),
	.result-bar :global(button) {
		max-width: 24rem;
	}
</style>
