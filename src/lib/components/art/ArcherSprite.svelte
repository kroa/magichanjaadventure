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
	 * 한자 궁수 — 자체 제작 인라인 SVG.
	 * 같은 규칙: 2등신, 큰 눈 + 하이라이트 2개, 외곽선은 자기 색의 어두운 톤.
	 * 손에 든 활은 **머리 다음에** 그려야 가려지지 않는다.
	 */
</script>

<svg
	viewBox="0 0 120 152"
	width={size}
	height={(size * 152) / 120}
	class="archer {className}"
	class:idle
	role="img"
	aria-label="한자 궁수"
>
	<defs>
		<linearGradient id="a-tunic" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="#8FD99A" />
			<stop offset="100%" stop-color="#3E9C5A" />
		</linearGradient>
	</defs>

	<ellipse cx="60" cy="146" rx="28" ry="6" fill="#3E2590" opacity="0.14" />

	<g class="body">
		<rect x="46" y="118" width="12" height="20" rx="6" fill="#5A4028" />
		<rect x="62" y="118" width="12" height="20" rx="6" fill="#5A4028" />
		<ellipse cx="52" cy="139" rx="9" ry="5" fill="#42301E" />
		<ellipse cx="68" cy="139" rx="9" ry="5" fill="#42301E" />

		<!-- 화살통 (등 뒤) -->
		<g class="quiver">
			<rect
				x="20"
				y="76"
				width="16"
				height="34"
				rx="7"
				fill="#8A6238"
				stroke="#5A4028"
				stroke-width="2.5"
			/>
			<path
				d="M24 78v-12M28 78v-14M32 78v-11"
				stroke="#E7C08A"
				stroke-width="3"
				stroke-linecap="round"
			/>
			<path d="M24 66l-2.5 4h5zM28 64l-2.5 4h5zM32 67l-2.5 4h5z" fill="#FF7AAE" />
		</g>

		<!-- 몸통 (초록 튜닉) -->
		<path
			d="M60 82c-16 0-25 8-25 20v12c0 5 4 8 10 8h30c6 0 10-3 10-8v-12c0-12-9-20-25-20z"
			fill="url(#a-tunic)"
			stroke="#2E7A45"
			stroke-width="2.5"
		/>
		<rect
			x="35"
			y="106"
			width="50"
			height="8"
			rx="4"
			fill="#B98A5A"
			stroke="#8A6238"
			stroke-width="2"
		/>

		<!-- 왼팔 -->
		<rect
			x="24"
			y="92"
			width="16"
			height="13"
			rx="6.5"
			fill="#6FC286"
			stroke="#2E7A45"
			stroke-width="2.5"
		/>
	</g>

	<g class="head">
		<!-- 얼굴 -->
		<ellipse cx="60" cy="54" rx="25" ry="23" fill="#FFDFC0" stroke="#E8B894" stroke-width="2" />

		<!-- 후드 -->
		<path
			d="M60 12c-19 0-32 14-32 32 0 4 1 7 2 10 3-14 15-22 30-22s27 8 30 22c1-3 2-6 2-10 0-18-13-32-32-32z"
			fill="#4FAE6B"
			stroke="#2E7A45"
			stroke-width="2.5"
			stroke-linejoin="round"
		/>
		<!-- 후드 깃털 -->
		<path
			class="feather"
			d="M88 26c7-5 14-4 18-1-5 6-11 9-16 8z"
			fill="#FFD25E"
			stroke="#D4860E"
			stroke-width="2"
			stroke-linejoin="round"
		/>

		<ellipse cx="41" cy="61" rx="6" ry="4" fill="#FF9EC4" opacity="0.55" />
		<ellipse cx="79" cy="61" rx="6" ry="4" fill="#FF9EC4" opacity="0.55" />

		<g class="eyes">
			{#if mood === 'surprised'}
				<circle cx="50" cy="54" r="7.5" fill="#2A2050" />
				<circle cx="70" cy="54" r="7.5" fill="#2A2050" />
			{:else}
				<ellipse cx="50" cy="54" rx="6" ry="7.5" fill="#2A2050" />
				<ellipse cx="70" cy="54" rx="6" ry="7.5" fill="#2A2050" />
			{/if}
			<circle cx="52.4" cy="51" r="2.6" fill="#fff" />
			<circle cx="72.4" cy="51" r="2.6" fill="#fff" />
			<circle cx="48" cy="57" r="1.3" fill="#fff" opacity="0.85" />
			<circle cx="68" cy="57" r="1.3" fill="#fff" opacity="0.85" />
		</g>

		{#if mood === 'surprised'}
			<ellipse cx="60" cy="68" rx="4.5" ry="5.5" fill="#C1547A" />
		{:else if mood === 'cheer'}
			<path
				d="M51 64 Q60 76 69 64 Z"
				fill="#C1547A"
				stroke="#A03C60"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
		{:else if mood === 'sad'}
			<path
				d="M52 72 Q60 65 68 72"
				fill="none"
				stroke="#A03C60"
				stroke-width="2.6"
				stroke-linecap="round"
			/>
		{:else}
			<path
				d="M52 66 Q60 73 68 66"
				fill="none"
				stroke="#A03C60"
				stroke-width="2.6"
				stroke-linecap="round"
			/>
		{/if}
	</g>

	<!-- 오른팔 + 활 — 머리 다음에 그린다 -->
	<g class="bow-arm">
		<rect
			x="80"
			y="92"
			width="20"
			height="13"
			rx="6.5"
			fill="#6FC286"
			stroke="#2E7A45"
			stroke-width="2.5"
		/>
		<path
			class="bow"
			d="M100 56c10 12 10 34 0 46"
			fill="none"
			stroke="#B98A5A"
			stroke-width="6"
			stroke-linecap="round"
		/>
		<path d="M100 56c-3 12-3 34 0 46" fill="none" stroke="#E7E0FF" stroke-width="2.5" />
	</g>
</svg>

<style>
	.archer {
		display: block;
		overflow: visible;
	}

	.archer.idle .head {
		animation: arc-head 3.4s ease-in-out infinite;
		transform-origin: 60px 80px;
	}
	.archer.idle .body {
		animation: arc-body 3.4s ease-in-out infinite;
		transform-origin: 60px 140px;
	}
	.archer.idle .bow-arm {
		animation: arc-bow 3.4s ease-in-out infinite;
		transform-origin: 86px 100px;
	}
	.archer.idle .feather {
		animation: arc-feather 2.4s ease-in-out infinite;
		transform-origin: 88px 28px;
	}
	.archer.idle .eyes {
		animation: arc-blink 4.8s infinite;
		transform-origin: 60px 54px;
	}

	@keyframes arc-head {
		0%,
		100% {
			transform: translateY(0) rotate(-1deg);
		}
		50% {
			transform: translateY(-3px) rotate(1deg);
		}
	}
	@keyframes arc-body {
		0%,
		100% {
			transform: scaleY(1);
		}
		50% {
			transform: scaleY(1.02);
		}
	}
	@keyframes arc-bow {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(-4deg);
		}
	}
	@keyframes arc-feather {
		0%,
		100% {
			transform: rotate(-5deg);
		}
		50% {
			transform: rotate(7deg);
		}
	}
	@keyframes arc-blink {
		0%,
		93%,
		100% {
			transform: scaleY(1);
		}
		96% {
			transform: scaleY(0.1);
		}
	}
</style>
