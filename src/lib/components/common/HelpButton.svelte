<script lang="ts">
	interface Props {
		onclick: () => void;
		/**
		 * 남은 **강한 도움** 횟수. `null` 이면 예산이 없는 화면이다 (공방).
		 * 0 이어도 버튼은 살아 있다 — 약한 도움으로 낮아질 뿐이다.
		 */
		left?: number | null;
		/** 전체 예산 (점을 몇 개 그릴지) */
		total?: number;
		disabled?: boolean;
		class?: string;
	}

	let {
		onclick,
		left = null,
		total = 2,
		disabled = false,
		class: className = ''
	}: Props = $props();

	const budgeted = $derived(left !== null);
	const label = $derived(
		budgeted ? (left! > 0 ? `도와줘, ${left}번 남았어요` : '도와줘, 조금만 알려 줄게요') : '도와줘'
	);
</script>

<!--
	도움 버튼 — 대결·복습·공방이 **같은 모양, 같은 자리**를 쓴다.

	**남은 횟수를 버튼 안에 그린다.** 옆에 따로 두면 390px 헤더의 가로 예산을 먹는다.
	점은 48px 안에 들어가므로 가로 증가분이 0 이다.

	예산이 0 이어도 **버튼을 죽이지 않는다.** 아이가 갇히면 그건 실패다 —
	금색이 연보라로 바뀌고, 누르면 짝 중 한 조각만 빛난다. 그 약한 도움은 무제한이다.

	소리는 여기서 내지 않는다. 부르는 쪽의 `askHint` 가 이미 낸다.
-->
<button
	type="button"
	class="help tappable {className}"
	class:spent={budgeted && left === 0}
	{onclick}
	{disabled}
	aria-label={label}
	data-hint-left={budgeted ? left : undefined}
>
	<span class="mark" aria-hidden="true">?</span>
	{#if budgeted}
		<span class="pips" aria-hidden="true">
			{#each Array(total), i (i)}
				<span class="pip" class:on={i < left!}></span>
			{/each}
		</span>
	{/if}
</button>

<style>
	.help {
		display: grid;
		place-items: center;
		/* 아이 손가락 기준 하한선 */
		width: var(--tap-min);
		height: var(--tap-min);
		flex-shrink: 0;
		gap: 1px;
		border: 3px solid var(--color-gold-400);
		border-radius: 9999px;
		background: #fff;
		color: var(--color-gold-700);
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
	}

	.mark {
		font-size: 1.05rem;
	}

	.pips {
		display: flex;
		gap: 3px;
	}

	.pip {
		width: 5px;
		height: 5px;
		border: 1px solid var(--color-gold-400);
		border-radius: 9999px;
	}

	.pip.on {
		background: var(--color-gold-400);
	}

	/* 다 썼다 — 꺼진 것이 아니라 약해진 것이다 */
	.help.spent {
		border-color: var(--color-magic-300, #c4b5fd);
		color: var(--color-magic-600);
	}

	.help.spent .pip {
		border-color: var(--color-magic-300, #c4b5fd);
	}

	.help:disabled {
		cursor: default;
		opacity: 0.5;
	}
</style>
