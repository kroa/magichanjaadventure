<script lang="ts">
	import { anchorFor } from '$lib/game/characters';
	import { RANK_MAX } from '$lib/game/rank';
	import type { CharacterClass } from '$lib/types/user';

	interface Props {
		cls: CharacterClass | null | undefined;
		/** 0 = 아직 전직 전 (아무것도 안 그린다) */
		rank?: number;
		size?: number;
		/** 캐릭터 뒤에 깔릴지, 앞에 얹힐지 */
		layer?: 'back' | 'front';
	}

	let { cls, rank = 0, size = 120, layer = 'back' }: Props = $props();

	const a = $derived(anchorFor(cls));
	const step = $derived(Math.min(RANK_MAX, Math.max(0, Math.floor(rank))));

	/*
	 * 금속 네 단 × 핀 개수로 여덟 단계를 만든다.
	 *
	 * **단계마다 그림을 그리지 않는다.** 6종 × 8단계 = 48장을 손으로 그리면 품질이 무너진다.
	 * 여덟 살이 읽는 축은 "몇 개" 와 "무슨 색" 둘뿐이라, 그 둘만 움직여도 올라간 것이 보인다.
	 */
	const METAL = [
		{ core: '#C87B3C', edge: '#8A4E1E', glow: 'rgb(200 123 60 / .35)' }, // 청동
		{ core: '#DCE6F2', edge: '#7E93AD', glow: 'rgb(220 230 242 / .40)' }, // 은
		{ core: '#FFC93C', edge: '#D4860E', glow: 'rgb(255 201 60 / .45)' }, // 금
		{ core: '#FFF6D6', edge: '#B29CFF', glow: 'rgb(178 156 255 / .55)' } // 별빛
	] as const;

	const metal = $derived(METAL[Math.min(3, Math.floor((step - 1) / 2))] ?? METAL[0]);
	/** 링 위에 박히는 핀 개수 = 계급 */
	const pins = $derived(
		Array.from({ length: step }, (_, i) => {
			// 각도는 고정 계산이다. Math.random 을 쓰면 서버와 화면이 어긋난다
			const angle = (Math.PI * 2 * i) / Math.max(1, step) - Math.PI / 2;
			return {
				x: a.groundX + Math.cos(angle) * (a.ringRx + 3),
				y: a.groundY + Math.sin(angle) * (a.ringRx + 3) * 0.34
			};
		})
	);
</script>

<!--
	계급 표식 — 캐릭터 **위에 겹치는 장식 한 겹.**

	몸통 SVG 를 고치지 않는 것이 핵심이다. 고치면 6종의 idle 애니메이션 선택자와
	접근 이름이 전부 흔들리고, 출시된 그림이 되돌릴 수 없이 바뀐다.

	`aria-hidden` 이고 role 도 이름도 없다 — 캐릭터 옆에 같은 이름의 그림이 하나 더 생기면
	`getByRole('img', { name: '한자 기사' })` 가 둘을 잡아 테스트가 깨진다.

	계급 색을 **몸에 칠하지 않는다.** 청동은 여우 털에, 은은 도사 도포에, 별빛은
	마법사 로브에 묻힌다. 그래서 표식에만 쓰고, 흰 키라인으로 몸과 분리한다.
-->
{#if step > 0}
	<svg
		class="aura {layer}"
		viewBox="0 0 {a.vw} {a.vh}"
		width={size}
		height={(size * a.vh) / a.vw}
		aria-hidden="true"
		focusable="false"
	>
		{#if layer === 'back'}
			<!-- 발밑 링 — 계급이 오를수록 넓어진다 -->
			<ellipse
				cx={a.groundX}
				cy={a.groundY}
				rx={a.ringRx + step}
				ry={(a.ringRx + step) * 0.34}
				fill="none"
				stroke={metal.core}
				stroke-width="3"
				opacity="0.9"
			/>
			<ellipse
				cx={a.groundX}
				cy={a.groundY}
				rx={a.ringRx + step - 4}
				ry={(a.ringRx + step - 4) * 0.34}
				fill={metal.glow}
			/>
		{:else}
			{#each pins as pin, i (i)}
				<!-- 흰 키라인이 먼저. 몸 색과 계급 색이 붙으면 표식이 안 보인다 -->
				<circle cx={pin.x} cy={pin.y} r="3.4" fill="#fff" opacity="0.9" />
				<circle
					cx={pin.x}
					cy={pin.y}
					r="2.2"
					fill={metal.core}
					stroke={metal.edge}
					stroke-width="1"
				/>
			{/each}
		{/if}
	</svg>
{/if}

<style>
	.aura {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	.aura.back {
		z-index: 0;
	}

	.aura.front {
		z-index: 2;
	}
</style>
