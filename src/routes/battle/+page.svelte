<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import TopHud from '$lib/components/layout/TopHud.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Chip from '$lib/components/common/Chip.svelte';
	import ProgressBar from '$lib/components/common/ProgressBar.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import MonsterSprite from '$lib/components/art/MonsterSprite.svelte';
	import BattleCanvas from '$lib/components/battle/BattleCanvas.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import { announceReward } from '$lib/game/announce';
	import { sound } from '$lib/sound/index.svelte';
	import { expToNextLevel } from '$lib/game/exp';
	import type { Mood } from '$lib/types/ui';
	import type { BattleFinishResponse, QuizAnswerResponse } from '$lib/types/api';

	let { data } = $props();

	const Hero = $derived(data.user.characterClass === 'wizard' ? WizardSprite : KnightSprite);
	const sessionKey = crypto.randomUUID();
	const startedAt = Date.now();

	let index = $state(0);
	// load 로 한 번만 초기화한다. 이후 값은 서버 응답으로만 바꾸고, 새 판은 전체 새로고침한다.
	// svelte-ignore state_referenced_locally
	let playerHp = $state(data.playerHp);
	// svelte-ignore state_referenced_locally
	let enemyHp = $state(data.enemyHp);
	let combo = $state(0);
	let maxCombo = $state(0);
	// svelte-ignore state_referenced_locally
	let level = $state(data.user.level);
	// svelte-ignore state_referenced_locally
	let exp = $state(data.user.exp);
	// svelte-ignore state_referenced_locally
	let gems = $state(data.user.gems);

	let chosen = $state<string | null>(null);
	let result = $state<{ isCorrect: boolean; answer: string } | null>(null);
	let busy = $state(false);

	let attackTrigger = $state(0);
	let hitTrigger = $state(0);
	let victoryTrigger = $state(0);
	let lastDamage = $state(0);

	let outcome = $state<'fighting' | 'win' | 'lose'>('fighting');
	let settled = $state(false);

	const question = $derived(data.questions[index] ?? null);
	const heroMood = $derived<Mood>(
		outcome === 'win'
			? 'cheer'
			: outcome === 'lose'
				? 'sad'
				: result?.isCorrect === false
					? 'surprised'
					: 'happy'
	);
	const enemyMood = $derived<Mood>(
		outcome === 'win' ? 'sad' : result?.isCorrect ? 'surprised' : 'happy'
	);

	async function answer(option: string) {
		if (busy || result || !question || outcome !== 'fighting') return;
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
					sessionKey
				})
			});
			if (!response.ok) throw new Error('채점 실패');
			const payload = (await response.json()) as QuizAnswerResponse;

			combo = payload.combo;
			maxCombo = Math.max(maxCombo, combo);
			result = { isCorrect: payload.isCorrect, answer: payload.answer };

			if (payload.isCorrect) {
				// 콤보가 높을수록 세게 때린다 — 연속 정답의 보람
				lastDamage = data.playerAttack + Math.floor(combo / 3) * 2;
				enemyHp = Math.max(0, enemyHp - lastDamage);
				attackTrigger += 1;
			} else {
				playerHp = Math.max(0, playerHp - data.enemyAttack);
				hitTrigger += 1;
			}

			sound.play(payload.isCorrect ? 'correct' : 'wrong');

			if (payload.reward) {
				level = payload.reward.level;
				exp = payload.reward.exp;
				gems = payload.reward.gems;
			}
		} catch {
			toasts.warn('연결이 잠깐 끊겼어요. 다시 눌러 주세요.');
			chosen = null;
		} finally {
			busy = false;
		}
	}

	async function next() {
		chosen = null;
		result = null;

		if (enemyHp <= 0) return finish('win');
		if (playerHp <= 0) return finish('lose');

		if (index + 1 >= data.questions.length) {
			// 문제를 다 썼는데 적이 살아 있으면 패배로 친다
			return finish(enemyHp <= 0 ? 'win' : 'lose');
		}
		index += 1;
	}

	async function finish(kind: 'win' | 'lose') {
		if (settled) return;
		settled = true;
		outcome = kind;
		if (kind === 'win') victoryTrigger += 1;

		try {
			const response = await fetch('/api/battle/finish', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					sessionKey,
					npcId: data.area.boss.id,
					areaId: data.area.id,
					playerHpLeft: playerHp,
					enemyHpLeft: enemyHp,
					maxCombo,
					durationMs: Date.now() - startedAt,
					claimedWin: kind === 'win'
				})
			});
			if (!response.ok) return;
			const payload = (await response.json()) as BattleFinishResponse;

			sound.play(kind === 'win' ? 'victory' : 'wrong');

			if (payload.reward) {
				level = payload.reward.level;
				exp = payload.reward.exp;
				gems = payload.reward.gems;
				announceReward(payload.reward, data.user.characterClass);
			}
		} catch {
			// 기록 실패가 결과 화면을 막지 않게 한다
		}
	}
</script>

<svelte:head>
	<title>한자 대결 · 마법한자탐험대</title>
</svelte:head>

<AppShell night={data.area.id >= 6}>
	{#snippet hud()}
		<TopHud nickname={data.user.nickname} {level} {exp} expToNext={expToNextLevel(level)} {gems} />
	{/snippet}

	{#if data.questions.length === 0}
		<EmptyState
			icon="⚔️"
			title="아직 싸울 준비가 안 됐어요"
			description="한자를 몇 개 배우면 그 한자로 대결할 수 있어요."
		>
			{#snippet action()}
				<Button variant="magic" href="/learn">한자 배우러 가기</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap gap-2">
				{#each data.areas as area (area.id)}
					<Chip
						selected={area.id === data.area.id}
						onclick={() => (location.href = `/battle?area=${area.id}`)}
					>
						<span aria-hidden="true">{area.emoji}</span>
						{area.name}
					</Chip>
				{/each}
			</div>

			<!-- 배틀 무대 -->
			<div
				class="stage relative overflow-hidden rounded-panel p-4 shadow-card"
				style="--sky:{data.area.sky}"
				data-testid="battle-stage"
			>
				<BattleCanvas {attackTrigger} {hitTrigger} damage={lastDamage} {victoryTrigger} />

				<div class="relative flex items-end justify-between gap-2">
					<div class="flex w-[42%] flex-col items-center gap-2">
						<Hero size={110} mood={heroMood} />
						<ProgressBar
							value={playerHp}
							max={data.playerHp}
							tone="mint"
							size="sm"
							label="내 체력"
							class="w-full"
						/>
						<span class="font-display text-xs text-ink-700">{playerHp} / {data.playerHp}</span>
					</div>

					<span class="pb-10 font-display text-xl text-magic-500" aria-hidden="true">VS</span>

					<div class="flex w-[42%] flex-col items-center gap-2">
						<MonsterSprite kind={data.area.boss.id} size={110} mood={enemyMood} />
						<ProgressBar
							value={enemyHp}
							max={data.enemyHp}
							tone="ember"
							size="sm"
							label="{data.area.boss.name} 체력"
							class="w-full"
						/>
						<span class="font-display text-xs text-ink-700">{data.area.boss.name}</span>
					</div>
				</div>
			</div>

			{#if outcome !== 'fighting'}
				<div class="flex flex-col items-center gap-3 py-4 text-center" data-testid="battle-outcome">
					{#if outcome === 'win'}
						<h2 class="text-display-lg text-gold-600">승리!</h2>
						<p class="text-ink-700">{data.area.boss.name}을(를) 물리쳤어요! +50 EXP · 💎5</p>
					{:else}
						<h2 class="text-display-lg text-ink-700">아쉬워요</h2>
						<p class="text-ink-500">한자를 조금 더 익히고 다시 도전해 볼까요?</p>
					{/if}
					<div class="flex flex-wrap justify-center gap-3">
						<Button variant="magic" size="lg" href="/battle" data-sveltekit-reload>다시 대결</Button
						>
						<Button variant="gold" size="lg" href="/learn">한자 배우기</Button>
						<Button variant="ghost" size="lg" href="/">모험 지도</Button>
					</div>
				</div>
			{:else if question}
				<div class="glass rounded-panel px-4 py-5 text-center shadow-card">
					<div class="mb-2 flex items-center justify-center gap-2">
						<Badge tone="magic" size="sm">{index + 1} / {data.questions.length}</Badge>
						{#if combo >= 2}<Badge tone="gold" fill="solid" size="sm">🔥 {combo}</Badge>{/if}
					</div>
					<p class="text-sm text-ink-500">{question.prompt}</p>
					<p
						class="mt-1 leading-none text-magic-800 {question.subjectIsHanja
							? 'hanja text-hanja-card'
							: 'font-display text-display-md'}"
					>
						{question.subject}
					</p>
				</div>

				<div class="grid gap-3">
					{#each question.options as option (option)}
						{@const isAnswer = result && option === result.answer}
						<button
							type="button"
							class="option rounded-button px-5 font-display text-lg"
							class:correct={isAnswer}
							class:wrong={result && chosen === option && !result.isCorrect}
							disabled={!!result || busy}
							onclick={() => answer(option)}
						>
							<span class={question.type === 'character' ? 'hanja text-3xl' : ''}>{option}</span>
							{#if isAnswer}<span aria-hidden="true">⭕</span>{/if}
							{#if result && chosen === option && !result.isCorrect}<span aria-hidden="true"
									>❌</span
								>{/if}
						</button>
					{/each}
				</div>

				{#if result}
					<Button variant="magic" size="lg" fullWidth onclick={next}>
						{result.isCorrect ? '공격 성공! 다음' : '다음'}
					</Button>
				{/if}
			{/if}
		</div>
	{/if}
</AppShell>

<style>
	.stage {
		background: var(--sky);
		min-height: 260px;
	}

	.option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
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
