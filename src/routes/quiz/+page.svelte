<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import TopHud from '$lib/components/layout/TopHud.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import ProgressBar from '$lib/components/common/ProgressBar.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import ParticleBurst from '$lib/components/effects/ParticleBurst.svelte';
	import Sparkle from '$lib/components/effects/Sparkle.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import MonsterSprite from '$lib/components/art/MonsterSprite.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import { announceReward } from '$lib/game/announce';
	import { sound } from '$lib/sound/index.svelte';
	import { expToNextLevel, isSpecialCombo } from '$lib/game/exp';
	import type { Mood } from '$lib/types/ui';
	import type { QuizAnswerResponse } from '$lib/types/api';

	let { data } = $props();

	const Hero = $derived(data.user.characterClass === 'wizard' ? WizardSprite : KnightSprite);

	let index = $state(0);
	let combo = $state(0);
	let correctCount = $state(0);
	// load 로 한 번만 초기화한다. 이후 값은 서버 응답으로만 바꾸고, 새 판은 전체 새로고침한다.
	// svelte-ignore state_referenced_locally
	let level = $state(data.user.level);
	// svelte-ignore state_referenced_locally
	let exp = $state(data.user.exp);
	// svelte-ignore state_referenced_locally
	let gems = $state(data.user.gems);

	let chosen = $state<string | null>(null);
	let result = $state<{ isCorrect: boolean; answer: string; expGained: number } | null>(null);
	let busy = $state(false);
	let burst = $state(0);
	let askedAt = $state(Date.now());

	const question = $derived(data.questions[index] ?? null);
	const finished = $derived(index >= data.questions.length);
	const heroMood = $derived<Mood>(result ? (result.isCorrect ? 'cheer' : 'sad') : 'happy');
	const enemyMood = $derived<Mood>(result?.isCorrect ? 'surprised' : 'happy');

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

			if (payload.reward) {
				level = payload.reward.level;
				exp = payload.reward.exp;
				gems = payload.reward.gems;
				announceReward(payload.reward, data.user.characterClass);
			}

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

<AppShell>
	{#snippet hud()}
		<TopHud nickname={data.user.nickname} {level} {exp} expToNext={expToNextLevel(level)} {gems} />
	{/snippet}

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
		<div class="flex flex-col items-center gap-4 py-6 text-center" data-testid="quiz-finished">
			<div class="relative">
				<Sparkle count={8} />
				<Hero size={170} mood="cheer" />
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
		<div class="flex flex-col gap-4">
			<!-- 진행도 + 콤보 -->
			<div class="flex items-center gap-3">
				<ProgressBar
					value={index}
					max={data.questions.length}
					tone="magic"
					size="sm"
					label="퀴즈 진행도"
					class="flex-1"
				/>
				<span class="shrink-0 font-display text-sm text-ink-500">
					{index + 1} / {data.questions.length}
				</span>
				{#if combo >= 2}
					<Badge tone="gold" fill="solid" size="sm">🔥 {combo}</Badge>
				{/if}
			</div>

			<!-- 대결 무대 -->
			<div class="arena relative overflow-hidden rounded-panel px-3 py-4 shadow-card">
				<ParticleBurst trigger={burst} />
				<div class="flex items-end justify-between gap-2">
					<Hero size={96} mood={heroMood} />
					<span class="pb-6 font-display text-2xl text-magic-400" aria-hidden="true">VS</span>
					<MonsterSprite size={96} mood={enemyMood} />
				</div>
			</div>

			<!-- 문제 -->
			<div
				class="glass rounded-panel px-4 py-6 text-center shadow-card"
				data-testid="quiz-question"
			>
				<p class="text-sm text-ink-500">{question.prompt}</p>
				<p
					class="mt-2 leading-none text-magic-800 {question.subjectIsHanja
						? 'hanja text-hanja-hero'
						: 'font-display text-display-lg'}"
				>
					{question.subject}
				</p>
			</div>

			<!-- 보기: 모바일에서 1열 세로 스택 (2×2 그리드는 오답 터치를 유발한다) -->
			<div class="grid gap-3">
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

			{#if result}
				<div class="flex flex-col items-center gap-3" data-testid="quiz-result">
					<p
						class="font-display text-lg {result.isCorrect ? 'text-mint-600' : 'text-ember-500'}"
						role="status"
					>
						{#if result.isCorrect}
							정답이에요! +{result.expGained} EXP
						{:else}
							아쉬워요. 정답은 <strong>{result.answer}</strong> 예요.
						{/if}
					</p>
					<Button variant="magic" size="lg" onclick={next} fullWidth>
						{index + 1 === data.questions.length ? '결과 보기' : '다음 문제'}
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</AppShell>

<style>
	.arena {
		background: linear-gradient(180deg, #dff1ff 0%, #f2e9ff 100%);
	}

	.option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		/* 아이 손가락 기준 하한선보다 넉넉하게 */
		min-height: 3.5rem;
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
</style>
