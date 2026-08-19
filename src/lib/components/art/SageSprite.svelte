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
	 * 한자 도사 — 자체 제작 인라인 SVG.
	 * 산에서 수련한 **어린** 도사다. 흰 수염을 붙이면 아이가 자기와 동일시하지 못하므로
	 * 상투와 도포만으로 "도사"를 표현한다.
	 */
</script>

<svg
	viewBox="0 0 120 152"
	width={size}
	height={(size * 152) / 120}
	class="sage {className}"
	class:idle
	role="img"
	aria-label="한자 도사"
>
	<defs>
		<linearGradient id="s-robe" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="#FFFFFF" />
			<stop offset="100%" stop-color="#CFE4F5" />
		</linearGradient>
	</defs>

	<ellipse cx="60" cy="146" rx="29" ry="6" fill="#3E2590" opacity="0.14" />

	<g class="body">
		<!-- 도포 (다리를 덮는다) -->
		<path
			d="M60 82c-15 0-23 8-26 22l-5 24c-1 5 2 8 7 8h48c5 0 8-3 7-8l-5-24c-3-14-11-22-26-22z"
			fill="url(#s-robe)"
			stroke="#8FA8C4"
			stroke-width="2.5"
		/>
		<!-- 옷깃 (V 자) -->
		<path
			d="M48 84 60 100 72 84"
			fill="none"
			stroke="#5BA8D6"
			stroke-width="4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<!-- 띠 -->
		<rect
			x="40"
			y="104"
			width="40"
			height="8"
			rx="4"
			fill="#5BA8D6"
			stroke="#2E7FB0"
			stroke-width="2"
		/>

		<rect
			x="26"
			y="92"
			width="16"
			height="13"
			rx="6.5"
			fill="#EDF5FC"
			stroke="#8FA8C4"
			stroke-width="2.5"
		/>
	</g>

	<g class="head">
		<ellipse cx="60" cy="54" rx="25" ry="23" fill="#FFDFC0" stroke="#E8B894" stroke-width="2" />

		<!-- 머리카락 + 상투 -->
		<path
			d="M60 16c-17 0-27 12-27 26 0 3 .5 6 1.5 8C37 40 47 34 60 34s23 6 25.5 16c1-2 1.5-5 1.5-8 0-14-10-26-27-26z"
			fill="#3A2E4F"
			stroke="#2A2050"
			stroke-width="2.5"
			stroke-linejoin="round"
		/>
		<g class="topknot">
			<rect
				x="55"
				y="4"
				width="10"
				height="12"
				rx="5"
				fill="#3A2E4F"
				stroke="#2A2050"
				stroke-width="2.5"
			/>
			<rect
				x="52"
				y="12"
				width="16"
				height="5"
				rx="2.5"
				fill="#5BA8D6"
				stroke="#2E7FB0"
				stroke-width="2"
			/>
		</g>

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

	<!-- 오른팔 + 부채 — 머리 다음에 그린다 -->
	<g class="fan-arm">
		<rect
			x="78"
			y="92"
			width="18"
			height="13"
			rx="6.5"
			fill="#EDF5FC"
			stroke="#8FA8C4"
			stroke-width="2.5"
		/>
		<g class="fan">
			<path
				d="M96 92 A26 26 0 0 0 108 60 L96 56z"
				fill="#FFF6D6"
				stroke="#D4860E"
				stroke-width="2.5"
				stroke-linejoin="round"
			/>
			<path
				d="M96 84 106 66M96 76 104 62"
				stroke="#E7C08A"
				stroke-width="2"
				stroke-linecap="round"
			/>
			<circle cx="96" cy="92" r="3.5" fill="#D4860E" />
		</g>
	</g>
</svg>

<style>
	.sage {
		display: block;
		overflow: visible;
	}

	.sage.idle .head {
		animation: sage-head 3.8s ease-in-out infinite;
		transform-origin: 60px 80px;
	}
	.sage.idle .body {
		animation: sage-body 3.8s ease-in-out infinite;
		transform-origin: 60px 140px;
	}
	.sage.idle .fan {
		animation: sage-fan 2.8s ease-in-out infinite;
		transform-origin: 96px 92px;
	}
	.sage.idle .topknot {
		animation: sage-knot 3s ease-in-out infinite;
		transform-origin: 60px 18px;
	}
	.sage.idle .eyes {
		animation: sage-blink 5.6s infinite;
		transform-origin: 60px 54px;
	}

	@keyframes sage-head {
		0%,
		100% {
			transform: translateY(0) rotate(1deg);
		}
		50% {
			transform: translateY(-3px) rotate(-1deg);
		}
	}
	@keyframes sage-body {
		0%,
		100% {
			transform: scaleY(1);
		}
		50% {
			transform: scaleY(1.02);
		}
	}
	@keyframes sage-fan {
		0%,
		100% {
			transform: rotate(-6deg);
		}
		50% {
			transform: rotate(8deg);
		}
	}
	@keyframes sage-knot {
		0%,
		100% {
			transform: rotate(-3deg);
		}
		50% {
			transform: rotate(4deg);
		}
	}
	@keyframes sage-blink {
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
