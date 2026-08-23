<script lang="ts">
	import { battlesToAfford } from '$lib/game/economy';

	interface Props {
		price: number;
		gems: number;
		gemsPerWin: number;
		/** 무엇을 사려는지 — 안내 문구에 쓴다 */
		label: string;
	}

	let { price, gems, gemsPerWin, label }: Props = $props();

	const short = $derived(Math.max(0, price - gems));
	const battles = $derived(
		gemsPerWin > 0 ? Math.ceil(short / gemsPerWin) : battlesToAfford(price, gems)
	);
	const ratio = $derived(price > 0 ? Math.min(1, Math.max(0, gems / price)) : 1);
</script>

<!--
	못 사는 것을 **벽이 아니라 목표**로 보여 준다.

	예전에는 "보석이 모자라요" 한 줄이 전부였다. 아이 입장에서는 닫힌 문이고,
	얼마나 더 하면 열리는지도, 무엇을 해야 보석이 생기는지도 알 수 없었다.
	(게다가 화면 위쪽 안내는 "퀴즈로도 모을 수 있다" 고 **거짓말**을 하고 있었다 —
	보석이 반복해서 나오는 곳은 대결 승리 하나뿐이다.)

	카드 전체를 버튼으로 만들지 않는다. 안쪽 「대결하러 가기」가 버튼 속 버튼이 되면
	파서가 그걸 밖으로 끌어내 서버·화면 구조가 어긋난다.
	말풍선을 띄우지도 않는다 — 390px 2열에서 옆 카드 버튼과 겹친다. 흐름 안에 그린다.
-->
<div class="goal" data-testid="locked-goal">
	<p class="count font-display">
		<span aria-hidden="true">💎</span>
		{gems} / {price}
	</p>

	<div
		class="bar"
		role="progressbar"
		aria-valuemin={0}
		aria-valuemax={price}
		aria-valuenow={Math.min(gems, price)}
		aria-label="{label} 모으는 중"
	>
		<!-- 0개일 때도 씨앗만큼은 남긴다. 텅 빈 막대는 "시작도 안 했다" 로만 읽힌다 -->
		<span class="fill" style="--ratio:{ratio}"></span>
	</div>

	<p class="hint">
		대결 <strong>{battles}</strong>번 이기면 데려갈 수 있어요
	</p>
	<a class="go tappable font-display" href="/battle">대결하러 가기</a>
</div>

<style>
	.goal {
		display: grid;
		width: 100%;
		justify-items: center;
		gap: 0.3rem;
	}

	.count {
		color: var(--color-ink-700);
		font-size: 0.8rem;
	}

	.bar {
		width: 100%;
		height: 0.5rem;
		overflow: hidden;
		border-radius: 9999px;
		background: var(--color-magic-100, rgb(237 232 255));
	}

	.fill {
		display: block;
		/* 0% 여도 4px 은 남는다 */
		width: max(4px, calc(var(--ratio) * 100%));
		height: 100%;
		border-radius: 9999px;
		background: var(--gradient-gold);
		transition: width 0.4s var(--ease-pop, cubic-bezier(0.34, 1.56, 0.64, 1));
	}

	.hint {
		color: var(--color-ink-500);
		font-size: 0.7rem;
		line-height: 1.3;
		text-align: center;
	}

	.hint strong {
		color: var(--color-ember-600, #d4483f);
	}

	.go {
		display: grid;
		place-items: center;
		width: 100%;
		/* 아이 손가락 기준 하한선 */
		min-height: var(--tap-min);
		padding: 0 0.5rem;
		border-radius: var(--radius-button);
		background: var(--gradient-ember, linear-gradient(135deg, #ff8b8b, #e85252));
		box-shadow: 0 4px 0 #c33f3f;
		color: #fff;
		font-size: 0.8rem;
		text-decoration: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}
	}
</style>
