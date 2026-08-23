<script lang="ts">
	import { RANK_MAX } from '$lib/game/rank';

	interface Props {
		rank?: number;
		size?: number;
	}

	let { rank = 0, size = 96 }: Props = $props();

	const step = $derived(Math.min(RANK_MAX, Math.max(0, Math.floor(rank))));

	/** RankAura 와 **같은 금속 사다리**를 쓴다. 두 표현이 갈라지면 같은 계급이 달라 보인다 */
	const METAL = [
		{ core: '#C87B3C', edge: '#8A4E1E' },
		{ core: '#DCE6F2', edge: '#7E93AD' },
		{ core: '#FFC93C', edge: '#D4860E' },
		{ core: '#FFF6D6', edge: '#B29CFF' }
	] as const;

	const metal = $derived(METAL[Math.min(3, Math.floor((step - 1) / 2))] ?? METAL[0]);
</script>

<!--
	작은 자리용 계급 표시.

	`RankAura` 는 링·후광·핀을 그리므로 노드가 늘어난다. 상점은 캐릭터 여섯을 동시에
	렌더하는데(실측 208노드 + 무한 애니메이션 28개), 거기에 풀 오라를 여섯 벌 얹으면
	노드가 두 배가 된다. 작은 크기에서는 어차피 핀이 안 보이므로 숫자 배지 하나로 줄인다.

	`aria-hidden` 이다 — 계급은 옆의 칭호 글자가 이미 말한다.
	여기에 이름을 붙이면 같은 정보를 두 번 읽어 준다.
-->
{#if step > 0}
	<span
		class="badge font-display"
		style="--core:{metal.core}; --edge:{metal.edge}; --s:{Math.max(16, Math.round(size * 0.22))}px"
		aria-hidden="true"
	>
		{step}
	</span>
{/if}

<style>
	.badge {
		position: absolute;
		right: 0;
		bottom: 0;
		z-index: 2;
		display: grid;
		width: var(--s);
		height: var(--s);
		place-items: center;
		border: 2px solid var(--edge);
		border-radius: 9999px;
		background: var(--core);
		color: var(--edge);
		font-size: calc(var(--s) * 0.56);
		line-height: 1;
		pointer-events: none;
	}
</style>
