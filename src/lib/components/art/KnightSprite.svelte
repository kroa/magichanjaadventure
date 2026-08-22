<script lang="ts">
	import type { Mood } from '$lib/types/ui';

	interface Props {
		size?: number;
		mood?: Mood;
		/** 숨쉬기 / 눈 깜빡임 */
		idle?: boolean;
		/** 눈을 감는다 — "안 볼게" 라고 말할 때 쓴다 */
		shy?: boolean;
		class?: string;
	}

	let {
		size = 160,
		mood = 'happy',
		idle = true,
		shy = false,
		class: className = ''
	}: Props = $props();

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
	 * 한자 기사 — 자체 제작 인라인 SVG (docs/06-ASSETS-LICENSE.md)
	 *
	 * 규칙 (docs/02-DESIGN-SYSTEM.md §7)
	 *  - 머리 : 몸 = 1 : 1 (2등신). 아이가 귀엽다고 느끼는 비례
	 *  - 눈에 하이라이트 2개 (큰 것 + 작은 것). 이게 귀여움의 90%
	 *  - 외곽선은 검정이 아니라 자기 색의 어두운 톤
	 *
	 * 그리는 순서가 중요하다: 손에 든 물건(검)은 **머리보다 나중에** 그린다.
	 * 그러지 않으면 머리에 가려 검이 사라진다.
	 */

	const MOUTH: Record<Mood, string> = {
		happy: 'M52 64 Q60 71 68 64',
		cheer: 'M51 62 Q60 74 69 62 Z',
		surprised: '',
		sad: 'M52 70 Q60 63 68 70'
	};
</script>

<svg
	viewBox="0 0 120 152"
	width={size}
	height={(size * 152) / 120}
	class="knight {className}"
	class:idle
	class:shy
	role="img"
	aria-label="한자 기사"
>
	<defs>
		<linearGradient id="{uid}-k-armor" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="#8FC0F5" />
			<stop offset="100%" stop-color="#4A8AD4" />
		</linearGradient>
		<linearGradient id="{uid}-k-shield" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="#FFE08A" />
			<stop offset="100%" stop-color="#F5A623" />
		</linearGradient>
	</defs>

	<!-- 바닥 그림자 -->
	<ellipse cx="60" cy="146" rx="29" ry="6" fill="#3E2590" opacity="0.14" />

	<g class="body">
		<!-- 다리 -->
		<rect x="46" y="119" width="12" height="19" rx="6" fill="#3565A0" />
		<rect x="62" y="119" width="12" height="19" rx="6" fill="#3565A0" />
		<ellipse cx="52" cy="139" rx="9" ry="5" fill="#2B4C7A" />
		<ellipse cx="68" cy="139" rx="9" ry="5" fill="#2B4C7A" />

		<!-- 몸통 -->
		<path
			d="M60 82c-16 0-25 8-25 20v13c0 5 4 8 10 8h30c6 0 10-3 10-8v-13c0-12-9-20-25-20z"
			fill="url(#{uid}-k-armor)"
			stroke="#3565A0"
			stroke-width="2.5"
		/>
		<rect
			x="35"
			y="108"
			width="50"
			height="8"
			rx="4"
			fill="#FFC93C"
			stroke="#D4860E"
			stroke-width="2"
		/>

		<!-- 왼팔 + 큰 방패 -->
		<rect
			x="22"
			y="92"
			width="16"
			height="13"
			rx="6.5"
			fill="#6FA9E8"
			stroke="#3565A0"
			stroke-width="2.5"
		/>
		<g class="shield">
			<path
				d="M7 84c0-4 3-7 7-7h16c4 0 7 3 7 7v20c0 11-8 17-15 20-7-3-15-9-15-20V84z"
				fill="url(#{uid}-k-shield)"
				stroke="#D4860E"
				stroke-width="2.5"
			/>
			<text
				x="22"
				y="105"
				text-anchor="middle"
				font-size="20"
				fill="#8A5A08"
				style="font-family:var(--font-hanja, serif); font-weight:700">力</text
			>
		</g>
	</g>

	<g class="head">
		<!-- 투구 -->
		<path
			d="M60 10c-19 0-33 15-33 34v14c0 15 14 24 33 24s33-9 33-24V44c0-19-14-34-33-34z"
			fill="url(#{uid}-k-armor)"
			stroke="#3565A0"
			stroke-width="2.5"
		/>
		<!-- 볼가리개: '후드'가 아니라 '투구'로 읽히게 한다 -->
		<path d="M29 52c-2 8 0 16 5 20V52z" fill="#5E9AD8" stroke="#3565A0" stroke-width="2" />
		<path d="M91 52c2 8 0 16-5 20V52z" fill="#5E9AD8" stroke="#3565A0" stroke-width="2" />

		<!-- 깃털 장식 -->
		<path
			class="plume"
			d="M60 11c1-9 7-13 13-15-3 6-2 11-5 15-2 3-5 4-8 3z"
			fill="#FF7AAE"
			stroke="#D4497B"
			stroke-width="2"
			stroke-linejoin="round"
		/>

		<!-- 얼굴 (투구 개방부) -->
		<ellipse cx="60" cy="53" rx="24" ry="21" fill="#FFDFC0" stroke="#E8B894" stroke-width="2" />
		<!-- 금색 이마 테두리 -->
		<path d="M29 43h62" stroke="#FFC93C" stroke-width="4.5" stroke-linecap="round" />

		<ellipse cx="41" cy="60" rx="6" ry="4" fill="#FF9EC4" opacity="0.55" />
		<ellipse cx="79" cy="60" rx="6" ry="4" fill="#FF9EC4" opacity="0.55" />

		<g class="eyes">
			{#if mood === 'surprised'}
				<circle cx="50" cy="52" r="7.5" fill="#2A2050" />
				<circle cx="70" cy="52" r="7.5" fill="#2A2050" />
			{:else}
				<ellipse cx="50" cy="52" rx="6" ry="7.5" fill="#2A2050" />
				<ellipse cx="70" cy="52" rx="6" ry="7.5" fill="#2A2050" />
			{/if}
			<circle cx="52.4" cy="49" r="2.6" fill="#fff" />
			<circle cx="72.4" cy="49" r="2.6" fill="#fff" />
			<circle cx="48" cy="55" r="1.3" fill="#fff" opacity="0.85" />
			<circle cx="68" cy="55" r="1.3" fill="#fff" opacity="0.85" />
		</g>

		{#if mood === 'surprised'}
			<ellipse cx="60" cy="66" rx="4.5" ry="5.5" fill="#C1547A" />
		{:else if mood === 'cheer'}
			<path
				d={MOUTH.cheer}
				fill="#C1547A"
				stroke="#A03C60"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
		{:else}
			<path
				d={MOUTH[mood]}
				fill="none"
				stroke="#A03C60"
				stroke-width="2.6"
				stroke-linecap="round"
			/>
		{/if}
	</g>

	<!-- 오른팔 + 검 — 머리 **다음에** 그려야 가려지지 않는다 -->
	<g class="sword-arm">
		<rect
			x="82"
			y="93"
			width="22"
			height="13"
			rx="6.5"
			fill="#6FA9E8"
			stroke="#3565A0"
			stroke-width="2.5"
		/>
		<!-- 짧고 뭉툭한 검 (무섭지 않게) -->
		<path
			d="M96 94V54l5.5-9 5.5 9v40z"
			fill="#E7F0FA"
			stroke="#8FA8C4"
			stroke-width="2.2"
			stroke-linejoin="round"
		/>
		<rect
			x="92"
			y="92"
			width="19"
			height="7"
			rx="3.5"
			fill="#FFC93C"
			stroke="#D4860E"
			stroke-width="2"
		/>
		<rect
			x="98.5"
			y="99"
			width="6"
			height="11"
			rx="3"
			fill="#B98A5A"
			stroke="#8A6238"
			stroke-width="1.8"
		/>
		<circle cx="101.5" cy="112" r="3.5" fill="#FFE08A" stroke="#D4860E" stroke-width="1.8" />
	</g>
</svg>

<style>
	.knight {
		display: block;
		overflow: visible;
	}

	/* 숨쉬기 — 머리와 몸이 살짝 다른 리듬으로 움직여야 살아있어 보인다 */
	.knight.idle .head {
		animation: knight-head 3.2s ease-in-out infinite;
		transform-origin: 60px 80px;
	}
	.knight.idle .body {
		animation: knight-body 3.2s ease-in-out infinite;
		transform-origin: 60px 140px;
	}
	.knight.idle .sword-arm {
		animation: knight-sword 3.2s ease-in-out infinite;
		transform-origin: 88px 100px;
	}
	.knight.idle .plume {
		animation: knight-plume 2.2s ease-in-out infinite;
		transform-origin: 60px 12px;
	}
	/* 깜빡임 원점은 idle 여부와 무관하다 — shy 포즈도 같은 원점을 써야 한다 */
	.knight .eyes {
		transform-origin: 60px 52px;
	}

	.knight.idle .eyes {
		animation: knight-blink 4.6s infinite;
	}

	/*
	 * 눈 감기. "눈 감고 있을게, 약속!" 이라 말하면서 눈을 부릅뜨고 있으면
	 * 아이는 말과 그림이 어긋난 것을 바로 알아챈다.
	 * Mood 유니온에 'shy' 를 더하지 않는 이유: 6종 스프라이트의 Record<Mood,…> 가
	 * 전부 비망라가 되고 스타일가이드·시각 테스트까지 연쇄로 손대야 한다.
	 */
	.knight.shy .eyes {
		animation: none;
		transform: scaleY(0.08);
	}

	@keyframes knight-head {
		0%,
		100% {
			transform: translateY(0) rotate(-1deg);
		}
		50% {
			transform: translateY(-3px) rotate(1deg);
		}
	}
	@keyframes knight-body {
		0%,
		100% {
			transform: scaleY(1);
		}
		50% {
			transform: scaleY(1.025);
		}
	}
	@keyframes knight-sword {
		0%,
		100% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(-5deg);
		}
	}
	@keyframes knight-plume {
		0%,
		100% {
			transform: rotate(-6deg);
		}
		50% {
			transform: rotate(8deg);
		}
	}
	@keyframes knight-blink {
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
