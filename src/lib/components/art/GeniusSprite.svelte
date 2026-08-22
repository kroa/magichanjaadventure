<script lang="ts">
	import type { Mood } from '$lib/types/ui';

	interface Props {
		size?: number;
		mood?: Mood;
		idle?: boolean;
		class?: string;
	}

	let { size = 140, mood = 'happy', idle = true, class: className = '' }: Props = $props();

	/*
	 * 한자 천재 — 상점의 마지막 캐릭터 (보석 300).
	 *
	 * 다른 캐릭터와 구별되는 표식: **머리 위에 떠 있는 한자 두루마리와 안경.**
	 * 무섭지 않아야 한다는 원칙은 그대로다 (docs/04-CONTENT-PLAN.md §4) —
	 * 눈은 크고 둥글게, 몸통은 곡선, 각진 실루엣 금지.
	 */
	const eyes = $derived(
		mood === 'sad' ? 3.2 : mood === 'surprised' ? 8.5 : mood === 'cheer' ? 7.6 : 6.6
	);
	const mouth = $derived(
		mood === 'sad'
			? 'M44 74q6-5 12 0'
			: mood === 'surprised'
				? 'M46 72a4 4 0 1 0 8 0a4 4 0 1 0-8 0'
				: mood === 'cheer'
					? 'M42 70q8 10 16 0'
					: 'M44 71q6 6 12 0'
	);
</script>

<svg
	viewBox="0 0 100 130"
	width={size}
	height={size * 1.3}
	class="{className} {idle ? 'idle' : ''}"
	role="img"
	aria-label="한자 천재"
>
	<!-- 그림자 -->
	<ellipse cx="50" cy="122" rx="22" ry="5" fill="#3E2590" opacity=".16" />

	<!-- 도포 (몸통) -->
	<path
		d="M50 78c14 0 24 9 26 22 1 6-2 10-8 10H32c-6 0-9-4-8-10 2-13 12-22 26-22Z"
		fill="#3FA9A0"
		stroke="#2A7C76"
		stroke-width="4"
		stroke-linejoin="round"
	/>
	<path d="M50 80v30" stroke="#2A7C76" stroke-width="3" stroke-linecap="round" />

	<!-- 목도리 -->
	<path d="M36 80q14 8 28 0" fill="none" stroke="#FFD166" stroke-width="7" stroke-linecap="round" />

	<!-- 얼굴 -->
	<circle cx="50" cy="60" r="22" fill="#FFE2C8" stroke="#D9A97E" stroke-width="4" />

	<!-- 안경 — 천재의 표식 -->
	<g stroke="#3E2590" stroke-width="3.4" fill="none">
		<circle cx="41" cy="59" r="9" />
		<circle cx="59" cy="59" r="9" />
		<path d="M50 59h0M32 57l-5-2M68 57l5-2" stroke-linecap="round" />
	</g>

	<!-- 눈 -->
	<circle cx="41" cy="59" r={eyes} fill="#2B1A66" />
	<circle cx="59" cy="59" r={eyes} fill="#2B1A66" />
	<circle cx="43.4" cy="56.6" r="2.1" fill="#fff" />
	<circle cx="61.4" cy="56.6" r="2.1" fill="#fff" />

	<!-- 볼 -->
	<circle cx="31" cy="67" r="4.4" fill="#FFB4C4" opacity=".65" />
	<circle cx="69" cy="67" r="4.4" fill="#FFB4C4" opacity=".65" />

	<!-- 입 -->
	<path d={mouth} fill="none" stroke="#C4796A" stroke-width="3" stroke-linecap="round" />

	<!-- 상투 -->
	<circle cx="50" cy="34" r="7" fill="#3E2590" />
	<path d="M50 41v-4" stroke="#3E2590" stroke-width="4" stroke-linecap="round" />

	<!-- 머리 위에 떠 있는 두루마리 -->
	<g class="scroll">
		<rect
			x="30"
			y="12"
			width="40"
			height="16"
			rx="4"
			fill="#FFF3D6"
			stroke="#C9A44B"
			stroke-width="3"
		/>
		<circle cx="30" cy="20" r="5" fill="#C9A44B" />
		<circle cx="70" cy="20" r="5" fill="#C9A44B" />
		<path d="M40 18h8M40 23h14" stroke="#8A6A22" stroke-width="2.4" stroke-linecap="round" />
	</g>
</svg>

<style>
	.idle {
		animation: genius-breathe 3.4s ease-in-out infinite;
	}

	@keyframes genius-breathe {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}

	/* 두루마리는 따로 흔들려 "떠 있다" 는 느낌을 준다 */
	.scroll {
		transform-origin: 50px 20px;
		animation: scroll-float 2.8s ease-in-out infinite;
	}

	@keyframes scroll-float {
		0%,
		100% {
			transform: translateY(0) rotate(-3deg);
		}
		50% {
			transform: translateY(-4px) rotate(3deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.idle,
		.scroll {
			animation: none;
		}
	}
</style>
