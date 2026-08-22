<script lang="ts">
	import type { Mood } from '$lib/types/ui';

	interface Props {
		size?: number;
		mood?: Mood;
		idle?: boolean;
		class?: string;
	}

	let { size = 160, mood = 'happy', idle = true, class: className = '' }: Props = $props();

	/*
	 * 그라디언트 id 를 **인스턴스마다** 다르게 만든다.
	 *
	 * id 가 하드코딩이라 같은 캐릭터가 한 화면에 둘 뜨면 SVG 규칙상 문서에서
	 * **먼저 나온 정의만** 살아남는다. 두 번째 스프라이트는 첫 번째의 그라디언트를
	 * 참조하게 되고, 그 첫 번째가 사라지면 색이 통째로 빠진다.
	 * 상점·도감·스타일가이드처럼 여러 개가 같이 뜨는 화면에서 실제로 터진다.
	 */
	const uid = $props.id();

	/*
	 * 한자 마법사 — 자체 제작 인라인 SVG.
	 * 모자가 몸통보다 크다. 이 과장이 "귀여운 마법사"를 만든다.
	 *
	 * 지팡이는 **머리/모자 다음에** 그린다. 그러지 않으면 모자챙이 마법 구슬을 덮어버린다.
	 * 구슬은 마법사의 상징이므로 반드시 보여야 한다.
	 */
</script>

<svg
	viewBox="0 0 120 152"
	width={size}
	height={(size * 152) / 120}
	class="wizard {className}"
	class:idle
	role="img"
	aria-label="한자 마법사"
>
	<defs>
		<linearGradient id="{uid}-w-robe" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="#A98CFF" />
			<stop offset="100%" stop-color="#6742E8" />
		</linearGradient>
		<linearGradient id="{uid}-w-hat" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#B29CFF" />
			<stop offset="100%" stop-color="#5231BC" />
		</linearGradient>
		<radialGradient id="{uid}-w-orb">
			<stop offset="0%" stop-color="#FFF6D6" />
			<stop offset="55%" stop-color="#FFD25E" />
			<stop offset="100%" stop-color="#F5A623" />
		</radialGradient>
	</defs>

	<ellipse cx="58" cy="146" rx="27" ry="6" fill="#3E2590" opacity="0.14" />

	<g class="body">
		<!-- 망토: 로브보다 먼저 그리되 왼쪽으로 삐져나오게 한다 -->
		<path
			class="cape"
			d="M40 84c-10 6-17 20-19 36 8-7 15-11 23-12-4-7-5-16-4-24z"
			fill="#4A2E9E"
			stroke="#3B2287"
			stroke-width="2"
			stroke-linejoin="round"
		/>

		<!-- 로브 (다리는 로브에 가린다 — 실루엣이 단순해야 귀엽다) -->
		<path
			d="M58 82c-14 0-22 8-25 22l-5 24c-1 5 2 8 7 8h46c5 0 8-3 7-8l-5-24c-3-14-11-22-25-22z"
			fill="url(#{uid}-w-robe)"
			stroke="#4A2E9E"
			stroke-width="2.5"
		/>
		<rect
			x="40"
			y="102"
			width="36"
			height="8"
			rx="4"
			fill="#5EEAD4"
			stroke="#0F9488"
			stroke-width="2"
		/>

		<!-- 왼팔 -->
		<rect
			x="26"
			y="92"
			width="16"
			height="13"
			rx="6.5"
			fill="#9575FF"
			stroke="#4A2E9E"
			stroke-width="2.5"
		/>
	</g>

	<g class="head">
		<!-- 얼굴 -->
		<ellipse cx="58" cy="57" rx="25" ry="23" fill="#FFDFC0" stroke="#E8B894" stroke-width="2" />

		<!-- 모자: 몸통보다 크게 -->
		<g class="hat">
			<path
				d="M58 2c-4 0-7 3-9 9L35 43c-2 5 1 8 6 8h34c5 0 8-3 6-8L67 11c-2-6-5-9-9-9z"
				fill="url(#{uid}-w-hat)"
				stroke="#4A2E9E"
				stroke-width="2.5"
				stroke-linejoin="round"
			/>
			<ellipse cx="58" cy="48" rx="34" ry="9" fill="#7C5CFF" stroke="#4A2E9E" stroke-width="2.5" />
			<path
				class="hat-star"
				d="M58 19l3.4 7 7.6 1-5.5 5.4 1.3 7.6L58 36.4 51.2 40l1.3-7.6L47 27l7.6-1z"
				fill="#FFD25E"
				stroke="#D4860E"
				stroke-width="1.6"
				stroke-linejoin="round"
			/>
		</g>

		<ellipse cx="40" cy="64" rx="6" ry="4" fill="#FF9EC4" opacity="0.55" />
		<ellipse cx="76" cy="64" rx="6" ry="4" fill="#FF9EC4" opacity="0.55" />

		<g class="eyes">
			{#if mood === 'surprised'}
				<circle cx="48" cy="58" r="7.5" fill="#2A2050" />
				<circle cx="68" cy="58" r="7.5" fill="#2A2050" />
			{:else}
				<ellipse cx="48" cy="58" rx="6" ry="7.5" fill="#2A2050" />
				<ellipse cx="68" cy="58" rx="6" ry="7.5" fill="#2A2050" />
			{/if}
			<circle cx="50.4" cy="55" r="2.6" fill="#fff" />
			<circle cx="70.4" cy="55" r="2.6" fill="#fff" />
			<circle cx="46" cy="61" r="1.3" fill="#fff" opacity="0.85" />
			<circle cx="66" cy="61" r="1.3" fill="#fff" opacity="0.85" />
		</g>

		{#if mood === 'surprised'}
			<ellipse cx="58" cy="72" rx="4.5" ry="5.5" fill="#C1547A" />
		{:else if mood === 'cheer'}
			<path
				d="M49 68 Q58 80 67 68 Z"
				fill="#C1547A"
				stroke="#A03C60"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
		{:else if mood === 'sad'}
			<path
				d="M50 76 Q58 69 66 76"
				fill="none"
				stroke="#A03C60"
				stroke-width="2.6"
				stroke-linecap="round"
			/>
		{:else}
			<path
				d="M50 70 Q58 77 66 70"
				fill="none"
				stroke="#A03C60"
				stroke-width="2.6"
				stroke-linecap="round"
			/>
		{/if}
	</g>

	<!-- 오른팔 + 지팡이 — 모자 **다음에** 그려야 구슬이 보인다 -->
	<g class="staff-arm">
		<rect
			x="76"
			y="92"
			width="22"
			height="13"
			rx="6.5"
			fill="#9575FF"
			stroke="#4A2E9E"
			stroke-width="2.5"
		/>
		<rect
			x="95"
			y="34"
			width="7"
			height="88"
			rx="3.5"
			fill="#B98A5A"
			stroke="#8A6238"
			stroke-width="2"
		/>
		<g class="orb-group">
			<circle
				class="orb"
				cx="98.5"
				cy="26"
				r="12"
				fill="url(#{uid}-w-orb)"
				stroke="#D4860E"
				stroke-width="2.2"
			/>
			<circle cx="94.5" cy="22" r="3.2" fill="#fff" opacity="0.8" />
		</g>
	</g>
</svg>

<style>
	.wizard {
		display: block;
		overflow: visible;
	}

	.wizard.idle .head {
		animation: wiz-head 3.6s ease-in-out infinite;
		transform-origin: 58px 80px;
	}
	.wizard.idle .body {
		animation: wiz-body 3.6s ease-in-out infinite;
		transform-origin: 58px 140px;
	}
	.wizard.idle .staff-arm {
		animation: wiz-staff 3.6s ease-in-out infinite;
		transform-origin: 84px 100px;
	}
	.wizard.idle .hat-star {
		animation: var(--animate-twinkle);
		transform-origin: 58px 29px;
	}
	.wizard.idle .orb {
		animation: wiz-orb 2.4s ease-in-out infinite;
		transform-origin: 98.5px 26px;
	}
	.wizard.idle .cape {
		animation: wiz-cape 3s ease-in-out infinite;
		transform-origin: 40px 86px;
	}
	.wizard.idle .eyes {
		animation: wiz-blink 5.2s infinite;
		transform-origin: 58px 58px;
	}

	@keyframes wiz-head {
		0%,
		100% {
			transform: translateY(0) rotate(1deg);
		}
		50% {
			transform: translateY(-4px) rotate(-1.5deg);
		}
	}
	@keyframes wiz-body {
		0%,
		100% {
			transform: scaleY(1);
		}
		50% {
			transform: scaleY(1.02);
		}
	}
	@keyframes wiz-staff {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(3deg);
		}
	}
	@keyframes wiz-orb {
		0%,
		100% {
			transform: scale(1);
			filter: drop-shadow(0 0 3px #ffd25e);
		}
		50% {
			transform: scale(1.1);
			filter: drop-shadow(0 0 14px #ffd25e);
		}
	}
	@keyframes wiz-cape {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(-4deg);
		}
	}
	@keyframes wiz-blink {
		0%,
		94%,
		100% {
			transform: scaleY(1);
		}
		97% {
			transform: scaleY(0.1);
		}
	}
</style>
