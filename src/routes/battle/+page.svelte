<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Button from '$lib/components/common/Button.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Chip from '$lib/components/common/Chip.svelte';
	import ProgressBar from '$lib/components/common/ProgressBar.svelte';
	import EmptyState from '$lib/components/common/EmptyState.svelte';
	import KnightSprite from '$lib/components/art/KnightSprite.svelte';
	import WizardSprite from '$lib/components/art/WizardSprite.svelte';
	import MonsterSprite from '$lib/components/art/MonsterSprite.svelte';
	import BattleCanvas from '$lib/components/battle/BattleCanvas.svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { invalidateAll } from '$app/navigation';
	import { toasts } from '$lib/stores/toast.svelte';
	import { announceReward } from '$lib/game/announce';
	import { sound } from '$lib/sound/index.svelte';
	import type { Mood } from '$lib/types/ui';
	import type { BattleFinishResponse, QuizAnswerResponse } from '$lib/types/api';

	let { data } = $props();

	const Hero = $derived(data.user.characterClass === 'wizard' ? WizardSprite : KnightSprite);

	/*
	 * 넓은 화면에서는 무대를 좌우로 나누면서 세로 여유가 생긴다.
	 * 그 공간을 비워 두지 말고 캐릭터를 키운다 — 대결의 주인공이 작으면 대결처럼 보이지 않는다.
	 */
	const wide = new MediaQuery('(min-width: 900px)');
	const spriteSize = $derived(wide.current ? 210 : 110);
	let sessionKey = $state(crypto.randomUUID());
	let startedAt = $state(Date.now());
	let restarting = $state(false);

	let index = $state(0);
	// load 로 한 번만 초기화한다. 이후 값은 서버 응답으로만 바꾸고, 새 판은 전체 새로고침한다.
	// svelte-ignore state_referenced_locally
	let playerHp = $state(data.playerHp);
	// svelte-ignore state_referenced_locally
	let enemyHp = $state(data.enemyHp);
	let combo = $state(0);
	let maxCombo = $state(0);

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

	/**
	 * 새 대결을 시작한다.
	 *
	 * 같은 URL 로 링크 이동하면 컴포넌트가 재생성되지 않아 결과 화면이 그대로 남는다.
	 * 그래서 새 문제를 받아온 뒤 상태를 하나씩 되돌린다.
	 */
	async function restart() {
		if (restarting) return;
		restarting = true;
		try {
			await invalidateAll();

			index = 0;
			playerHp = data.playerHp;
			enemyHp = data.enemyHp;
			combo = 0;
			maxCombo = 0;
			chosen = null;
			result = null;
			outcome = 'fighting';
			settled = false;
			lastDamage = 0;
			sessionKey = crypto.randomUUID();
			startedAt = Date.now();
		} finally {
			restarting = false;
		}
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

<!--
	대결도 퀴즈와 같은 **집중 모드**다.
	 - 하단 네비게이션과 상단 HUD 를 숨긴다: 세로 공간 170px 을 되찾고, 오터치도 막는다
	   (레벨·보석은 모험 지도에서 보고, 레벨업은 전체 화면 연출로 크게 알려 준다)
	 - 대신 헤더에 나가기 버튼을 둔다 (메뉴를 끈 화면에는 반드시 나갈 길이 있어야 한다)
	 - 390×844 화면에서 마지막 보기가 화면 밖으로 밀려나 스크롤해야 했다. 그래서 격자로 묶었다.
-->
<AppShell nav={false} night={data.area.id >= 6}>
	{#if data.questions.length === 0}
		<EmptyState
			icon="⚔️"
			title="아직 싸울 준비가 안 됐어요"
			description="한자를 몇 개 배우면 그 한자로 대결할 수 있어요."
		>
			{#snippet action()}
				<Button variant="magic" href="/learn">한자 배우러 가기</Button>
				<Button variant="ghost" href="/">모험 지도로</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="stage-grid">
			<!-- 나가기 + 지역 선택. 지역이 늘어나도 줄바꿈되지 않게 가로로 스크롤한다. -->
			<header class="flex items-center gap-2">
				<a href="/" class="exit" aria-label="모험 지도로 나가기">✕</a>
				<div class="areas flex gap-2 overflow-x-auto">
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
			</header>

			<!-- 배틀 무대 -->
			<div
				class="stage relative overflow-hidden rounded-panel p-4 shadow-card"
				style="--sky:{data.area.sky}"
				data-testid="battle-stage"
			>
				<BattleCanvas {attackTrigger} {hitTrigger} damage={lastDamage} {victoryTrigger} />

				<div class="fight relative flex items-end justify-between gap-2">
					<div class="flex w-[42%] flex-col items-center gap-2">
						<Hero size={spriteSize} mood={heroMood} />
						<ProgressBar
							value={playerHp}
							max={data.playerHp}
							tone="mint"
							size="sm"
							label="내 에너지"
							class="w-full"
						/>
						<span class="fighter-label font-display text-xs text-ink-700"
							>{playerHp} / {data.playerHp}</span
						>
					</div>

					<span class="pb-10 font-display text-xl text-magic-500" aria-hidden="true">VS</span>

					<div class="flex w-[42%] flex-col items-center gap-2">
						<MonsterSprite kind={data.area.boss.id} size={spriteSize} mood={enemyMood} />
						<ProgressBar
							value={enemyHp}
							max={data.enemyHp}
							tone="ember"
							size="sm"
							label="{data.area.boss.name} 에너지"
							class="w-full"
						/>
						<span class="fighter-label font-display text-xs text-ink-700"
							>{data.area.boss.name}</span
						>
					</div>
				</div>
			</div>

			{#if outcome !== 'fighting'}
				<div
					class="outcome flex flex-col items-center justify-center gap-3 py-4 text-center"
					data-testid="battle-outcome"
				>
					{#if outcome === 'win'}
						<h2 class="text-display-lg text-gold-600">승리!</h2>
						<p class="text-ink-700">{data.area.boss.name}을(를) 물리쳤어요! +50 EXP · 💎5</p>
					{:else}
						<h2 class="text-display-lg text-ink-700">아쉬워요</h2>
						<p class="text-ink-500">한자를 조금 더 익히고 다시 도전해 볼까요?</p>
					{/if}
					<div class="flex flex-wrap justify-center gap-3">
						<Button variant="magic" size="lg" onclick={restart} loading={restarting}
							>다시 대결</Button
						>
						<Button variant="gold" size="lg" href="/learn">한자 배우기</Button>
						<Button variant="ghost" size="lg" href="/">모험 지도</Button>
					</div>
				</div>
			{:else if question}
				<div class="play">
					<div class="glass rounded-panel px-4 py-3 text-center shadow-card">
						<div class="mb-1 flex items-center justify-center gap-2">
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

					<div class="grid gap-2">
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
				</div>

				<!--
					답을 고른 뒤 '다음'을 누르려고 스크롤을 내려야 하면 리듬이 끊긴다.
					화면 아래에 붙여 두어 손가락이 있던 자리에서 바로 이어지게 한다.
				-->
				<div class="result-bar">
					{#if result}
						<Button variant="magic" size="lg" fullWidth onclick={next}>
							{result.isCorrect ? '공격 성공! 다음' : '다음'}
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</AppShell>

<style>
	/*
	 * 한 화면에 담기 위한 격자.
	 * 헤더·무대는 자기 높이만큼, 남는 공간은 보기 영역이 흡수하고,
	 * '다음' 버튼은 항상 화면 아래에 붙는다.
	 *
	 * 390×844 에서 이 격자가 없을 때 문서 높이가 952px 이라
	 * 마지막 보기를 보려면 스크롤을 내려야 했다.
	 */
	.stage-grid {
		display: grid;
		grid-template-rows: auto auto 1fr auto;
		gap: 0.6rem;
		min-height: calc(100dvh - 4rem);
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

	/* 스크롤 막대가 세로 공간을 먹지 않게 숨긴다 (칩은 손가락으로 밀어서 넘긴다) */
	.areas {
		scrollbar-width: none;
	}

	.areas::-webkit-scrollbar {
		display: none;
	}

	.play {
		display: flex;
		min-height: 0;
		flex-direction: column;
		gap: 0.6rem;
	}

	.result-bar {
		position: sticky;
		bottom: 0;
		padding-bottom: env(safe-area-inset-bottom);
	}

	/*
	 * 넓은 화면(노트북 1280×800)은 **가로가 남고 세로가 모자란다.**
	 * 세로로만 쌓으면 966px 이 되어 보기가 화면 밖으로 밀린다.
	 * 그래서 무대와 문제를 좌우로 나눠 세로 높이를 절반 가까이 줄인다.
	 */
	@media (min-width: 900px) {
		.stage-grid {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: auto 1fr auto;
			grid-template-areas:
				'header header'
				'stage  play'
				'stage  bar';
			gap: 0.75rem 1rem;
			min-height: calc(100dvh - 5rem);
		}

		header {
			grid-area: header;
		}

		.stage {
			grid-area: stage;
		}

		/* 무대가 커진 만큼 이름·체력 숫자도 같이 키운다 */
		.fighter-label {
			font-size: 1rem;
		}

		.play {
			grid-area: play;
			justify-content: center;
		}

		.outcome {
			grid-area: play;
		}

		.result-bar {
			grid-area: bar;
		}
	}

	.stage {
		display: grid;
		align-content: center;
		background: var(--sky);
		min-height: 200px;
	}

	@media (min-height: 780px) {
		.stage {
			min-height: 260px;
		}
	}

	.option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		/* 아이 손가락 기준 하한선(48px)보다는 넉넉하게 유지한다 */
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
