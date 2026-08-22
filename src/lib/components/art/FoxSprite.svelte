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
	 * 한자 여우 — 자체 제작 인라인 SVG.
	 * 구미호 모티프지만 무섭지 않게: 꼬리 세 개만 두고 전부 둥글게 그린다.
	 * (아홉 개를 다 그리면 실루엣이 복잡해져 작은 크기에서 뭉갠다)
	 */
</script>

<svg
	viewBox="0 0 120 152"
	width={size}
	height={(size * 152) / 120}
	class="fox {className}"
	class:idle
	role="img"
	aria-label="한자 여우"
>
	<defs>
		<linearGradient id="{uid}-f-coat" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="#FFC08A" />
			<stop offset="100%" stop-color="#F08A45" />
		</linearGradient>
	</defs>

	<ellipse cx="60" cy="146" rx="28" ry="6" fill="#3E2590" opacity="0.14" />

	<!-- 꼬리 세 개 (몸보다 먼저 = 뒤쪽) -->
	<g class="tails">
		<path
			d="M34 108c-16-2-26-14-24-26 8 8 18 10 26 6z"
			fill="#FFB27A"
			stroke="#C4692F"
			stroke-width="2.5"
			stroke-linejoin="round"
		/>
		<path
			d="M32 116c-18 2-30-6-32-18 10 6 21 5 28 0z"
			fill="#FFC9A0"
			stroke="#C4692F"
			stroke-width="2.5"
			stroke-linejoin="round"
		/>
		<path
			d="M86 110c16-2 26-14 24-26-8 8-18 10-26 6z"
			fill="#FFB27A"
			stroke="#C4692F"
			stroke-width="2.5"
			stroke-linejoin="round"
		/>
	</g>

	<g class="body">
		<rect x="46" y="118" width="12" height="20" rx="6" fill="#C4692F" />
		<rect x="62" y="118" width="12" height="20" rx="6" fill="#C4692F" />
		<ellipse cx="52" cy="139" rx="9" ry="5" fill="#A9541F" />
		<ellipse cx="68" cy="139" rx="9" ry="5" fill="#A9541F" />

		<!-- 몸통 -->
		<path
			d="M60 82c-16 0-25 8-25 20v12c0 5 4 8 10 8h30c6 0 10-3 10-8v-12c0-12-9-20-25-20z"
			fill="url(#{uid}-f-coat)"
			stroke="#C4692F"
			stroke-width="2.5"
		/>
		<!-- 배 -->
		<ellipse cx="60" cy="106" rx="15" ry="13" fill="#FFF1E0" opacity="0.85" />
		<!-- 목도리 -->
		<rect
			x="38"
			y="80"
			width="44"
			height="9"
			rx="4.5"
			fill="#FF7AAE"
			stroke="#D4497B"
			stroke-width="2"
		/>

		<rect
			x="24"
			y="94"
			width="16"
			height="13"
			rx="6.5"
			fill="#FFB27A"
			stroke="#C4692F"
			stroke-width="2.5"
		/>
		<rect
			x="80"
			y="94"
			width="16"
			height="13"
			rx="6.5"
			fill="#FFB27A"
			stroke="#C4692F"
			stroke-width="2.5"
		/>
	</g>

	<g class="head">
		<!-- 귀 -->
		<path
			d="M34 34 38 8l18 16z"
			fill="#FFB27A"
			stroke="#C4692F"
			stroke-width="2.5"
			stroke-linejoin="round"
		/>
		<path
			d="M86 34 82 8 64 24z"
			fill="#FFB27A"
			stroke="#C4692F"
			stroke-width="2.5"
			stroke-linejoin="round"
		/>
		<path d="M40 28 42 16l8 8z" fill="#FF9EC4" />
		<path d="M80 28 78 16l-8 8z" fill="#FF9EC4" />

		<!-- 얼굴 -->
		<ellipse
			cx="60"
			cy="52"
			rx="27"
			ry="24"
			fill="url(#{uid}-f-coat)"
			stroke="#C4692F"
			stroke-width="2.5"
		/>
		<!-- 주둥이 주변 흰 무늬 -->
		<ellipse cx="60" cy="62" rx="18" ry="13" fill="#FFF1E0" />

		<ellipse cx="38" cy="56" rx="6" ry="4" fill="#FF7AAE" opacity="0.5" />
		<ellipse cx="82" cy="56" rx="6" ry="4" fill="#FF7AAE" opacity="0.5" />

		<g class="eyes">
			{#if mood === 'surprised'}
				<circle cx="50" cy="50" r="7.5" fill="#2A2050" />
				<circle cx="70" cy="50" r="7.5" fill="#2A2050" />
			{:else}
				<ellipse cx="50" cy="50" rx="6" ry="7.5" fill="#2A2050" />
				<ellipse cx="70" cy="50" rx="6" ry="7.5" fill="#2A2050" />
			{/if}
			<circle cx="52.4" cy="47" r="2.6" fill="#fff" />
			<circle cx="72.4" cy="47" r="2.6" fill="#fff" />
			<circle cx="48" cy="53" r="1.3" fill="#fff" opacity="0.85" />
			<circle cx="68" cy="53" r="1.3" fill="#fff" opacity="0.85" />
		</g>

		<!-- 코 -->
		<path d="M60 58 A4 4 0 0 1 56 62 A4 4 0 0 1 64 62 A4 4 0 0 1 60 58z" fill="#2A2050" />

		{#if mood === 'surprised'}
			<ellipse cx="60" cy="70" rx="4" ry="5" fill="#C1547A" />
		{:else if mood === 'cheer'}
			<path
				d="M52 66 Q60 78 68 66 Z"
				fill="#C1547A"
				stroke="#A03C60"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
		{:else if mood === 'sad'}
			<path
				d="M53 73 Q60 66 67 73"
				fill="none"
				stroke="#A03C60"
				stroke-width="2.6"
				stroke-linecap="round"
			/>
		{:else}
			<path
				d="M54 66 Q60 72 66 66"
				fill="none"
				stroke="#A03C60"
				stroke-width="2.6"
				stroke-linecap="round"
			/>
		{/if}
	</g>
</svg>

<style>
	.fox {
		display: block;
		overflow: visible;
	}

	.fox.idle .head {
		animation: fox-head 3.2s ease-in-out infinite;
		transform-origin: 60px 78px;
	}
	.fox.idle .body {
		animation: fox-body 3.2s ease-in-out infinite;
		transform-origin: 60px 140px;
	}
	.fox.idle .tails {
		animation: fox-tails 2.6s ease-in-out infinite;
		transform-origin: 60px 110px;
	}
	.fox.idle .eyes {
		animation: fox-blink 4.4s infinite;
		transform-origin: 60px 50px;
	}

	@keyframes fox-head {
		0%,
		100% {
			transform: translateY(0) rotate(-2deg);
		}
		50% {
			transform: translateY(-3px) rotate(2deg);
		}
	}
	@keyframes fox-body {
		0%,
		100% {
			transform: scaleY(1);
		}
		50% {
			transform: scaleY(1.025);
		}
	}
	@keyframes fox-tails {
		0%,
		100% {
			transform: rotate(-4deg);
		}
		50% {
			transform: rotate(5deg);
		}
	}
	@keyframes fox-blink {
		0%,
		92%,
		100% {
			transform: scaleY(1);
		}
		95% {
			transform: scaleY(0.1);
		}
	}
</style>
