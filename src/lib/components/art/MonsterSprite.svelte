<script lang="ts">
	import type { Mood } from '$lib/types/ui';

	interface Props {
		/** 지역 보스 id. 없으면 1지역 도토리 도적 */
		kind?: string;
		size?: number;
		mood?: Mood;
		idle?: boolean;
		class?: string;
	}

	let {
		kind = 'acorn_bandit',
		size = 140,
		mood = 'happy',
		idle = true,
		class: className = ''
	}: Props = $props();

	/*
	 * 몬스터 — 자체 제작 인라인 SVG.
	 *
	 * 절대 조건: 무섭지 않아야 한다 (docs/04-CONTENT-PLAN.md §4)
	 *  - 눈은 크고 둥글게, 하이라이트 2개
	 *  - 이빨은 있어도 2개 이하
	 *  - 피격 표정은 '화남'이 아니라 **'당황'**
	 *  - 몸통은 전부 곡선. 각진 실루엣 금지
	 *
	 * 색만 바꿔 지역별 변종을 파생한다.
	 */
	interface Skin {
		body: string;
		dark: string;
		accent: string;
		label: string;
		/** 머리 위 장식 */
		crest: 'leaf' | 'drop' | 'puff' | 'ear' | 'shard' | 'star' | 'horn';
	}

	const SKINS: Record<string, Skin> = {
		acorn_bandit: {
			body: '#C98B4B',
			dark: '#8A5A28',
			accent: '#7BC96F',
			label: '꼬마 도토리 도적',
			crest: 'leaf'
		},
		droplet_trickster: {
			body: '#7FD4FF',
			dark: '#2E8FC4',
			accent: '#D9F2FF',
			label: '물방울 장난꾸러기',
			crest: 'drop'
		},
		cloud_puff: {
			body: '#EDEAFF',
			dark: '#A8A0D8',
			accent: '#FF9EC4',
			label: '구름 뭉치',
			crest: 'puff'
		},
		rainbow_fox: {
			body: '#FFB27A',
			dark: '#D4783C',
			accent: '#FF7AAE',
			label: '무지개 여우',
			crest: 'ear'
		},
		crystal_golem: {
			body: '#B29CFF',
			dark: '#6742E8',
			accent: '#E7E0FF',
			label: '수정 아기 골렘',
			crest: 'shard'
		},
		star_sprite: {
			body: '#FFD25E',
			dark: '#D4860E',
			accent: '#FFF6D6',
			label: '별똥별 요정',
			crest: 'star'
		},
		brush_king: {
			body: '#8B6BD9',
			dark: '#4A2E9E',
			accent: '#FFC93C',
			label: '붓 마왕',
			crest: 'horn'
		}
	};

	const skin = $derived(SKINS[kind] ?? SKINS.acorn_bandit);
</script>

<svg
	viewBox="0 0 120 130"
	width={size}
	height={(size * 130) / 120}
	class="monster {className}"
	class:idle
	role="img"
	aria-label={skin.label}
	data-kind={kind}
>
	<ellipse cx="60" cy="124" rx="27" ry="5.5" fill="#3E2590" opacity="0.14" />

	<g class="creature">
		<!-- 머리 장식 -->
		{#if skin.crest === 'leaf'}
			<path
				d="M60 18c8-10 20-11 26-8-4 9-13 15-22 14z"
				fill={skin.accent}
				stroke={skin.dark}
				stroke-width="2.5"
				stroke-linejoin="round"
			/>
			<path d="M60 26V14" stroke={skin.dark} stroke-width="3" stroke-linecap="round" />
		{:else if skin.crest === 'drop'}
			<path
				d="M60 6c6 8 10 13 10 18a10 10 0 0 1-20 0c0-5 4-10 10-18z"
				fill={skin.accent}
				stroke={skin.dark}
				stroke-width="2.5"
				stroke-linejoin="round"
			/>
		{:else if skin.crest === 'puff'}
			<circle cx="46" cy="24" r="11" fill={skin.body} stroke={skin.dark} stroke-width="2.5" />
			<circle cx="74" cy="24" r="11" fill={skin.body} stroke={skin.dark} stroke-width="2.5" />
		{:else if skin.crest === 'ear'}
			<path
				d="M36 30 40 8l16 14z"
				fill={skin.body}
				stroke={skin.dark}
				stroke-width="2.5"
				stroke-linejoin="round"
			/>
			<path
				d="M84 30 80 8 64 22z"
				fill={skin.body}
				stroke={skin.dark}
				stroke-width="2.5"
				stroke-linejoin="round"
			/>
		{:else if skin.crest === 'shard'}
			<path
				d="M60 4 70 26H50z"
				fill={skin.accent}
				stroke={skin.dark}
				stroke-width="2.5"
				stroke-linejoin="round"
			/>
		{:else if skin.crest === 'star'}
			<path
				d="M60 2l5 11 12 1.6-9 8.4 2.2 12L60 29l-10.2 6 2.2-12-9-8.4L55 13z"
				fill={skin.accent}
				stroke={skin.dark}
				stroke-width="2"
				stroke-linejoin="round"
			/>
		{:else}
			<path
				d="M38 26 34 8l16 12z"
				fill={skin.accent}
				stroke={skin.dark}
				stroke-width="2.5"
				stroke-linejoin="round"
			/>
			<path
				d="M82 26 86 8 70 20z"
				fill={skin.accent}
				stroke={skin.dark}
				stroke-width="2.5"
				stroke-linejoin="round"
			/>
		{/if}

		<!-- 몸통: 전부 곡선. 각진 실루엣 금지 -->
		<path
			d="M60 24c-22 0-34 16-34 38 0 24 15 38 34 38s34-14 34-38c0-22-12-38-34-38z"
			fill={skin.body}
			stroke={skin.dark}
			stroke-width="3"
		/>

		<!-- 배 무늬 -->
		<ellipse cx="60" cy="76" rx="18" ry="16" fill={skin.accent} opacity="0.45" />

		<!-- 볼터치 -->
		<ellipse cx="38" cy="66" rx="6.5" ry="4.5" fill="#FF7AAE" opacity="0.5" />
		<ellipse cx="82" cy="66" rx="6.5" ry="4.5" fill="#FF7AAE" opacity="0.5" />

		<!-- 눈: 크고 둥글게, 하이라이트 2개 -->
		<g class="eyes">
			{#if mood === 'surprised'}
				<circle cx="48" cy="56" r="10" fill="#fff" stroke={skin.dark} stroke-width="2" />
				<circle cx="72" cy="56" r="10" fill="#fff" stroke={skin.dark} stroke-width="2" />
				<circle cx="48" cy="57" r="4" fill="#2A2050" />
				<circle cx="72" cy="57" r="4" fill="#2A2050" />
			{:else}
				<ellipse cx="48" cy="56" rx="8" ry="9" fill="#2A2050" />
				<ellipse cx="72" cy="56" rx="8" ry="9" fill="#2A2050" />
				<circle cx="51" cy="52" r="3.2" fill="#fff" />
				<circle cx="75" cy="52" r="3.2" fill="#fff" />
				<circle cx="45.5" cy="60" r="1.6" fill="#fff" opacity="0.85" />
				<circle cx="69.5" cy="60" r="1.6" fill="#fff" opacity="0.85" />
			{/if}
		</g>

		<!-- 입 + 이빨 2개 (그 이상은 무섭다) -->
		{#if mood === 'surprised'}
			<ellipse cx="60" cy="76" rx="6" ry="7" fill="#7A3350" />
		{:else if mood === 'sad'}
			<path
				d="M52 82q8-7 16 0"
				fill="none"
				stroke={skin.dark}
				stroke-width="3"
				stroke-linecap="round"
			/>
		{:else}
			<path
				d="M50 74q10 12 20 0z"
				fill="#7A3350"
				stroke={skin.dark}
				stroke-width="2"
				stroke-linejoin="round"
			/>
			<path d="M54 75l2.5 5 2.5-5z" fill="#fff" />
			<path d="M62 75l2.5 5 2.5-5z" fill="#fff" />
		{/if}

		<!-- 패배해도 사라지지 않는다. 별을 뱅뱅 돌리며 앉는다. -->
		{#if mood === 'sad'}
			<g class="dizzy" aria-hidden="true">
				<text x="34" y="30" font-size="14" fill="#FFD25E">✦</text>
				<text x="78" y="26" font-size="11" fill="#FFD25E">✦</text>
			</g>
		{/if}
	</g>
</svg>

<style>
	.monster {
		display: block;
		overflow: visible;
	}

	.monster.idle .creature {
		animation: monster-bob 2.6s ease-in-out infinite;
		transform-origin: 60px 100px;
	}

	.monster.idle .eyes {
		animation: monster-blink 5.4s infinite;
		transform-origin: 60px 56px;
	}

	.dizzy {
		animation: dizzy-spin 1.6s linear infinite;
		transform-origin: 60px 24px;
	}

	@keyframes monster-bob {
		0%,
		100% {
			transform: translateY(0) scaleY(1);
		}
		50% {
			transform: translateY(-4px) scaleY(1.03);
		}
	}
	@keyframes monster-blink {
		0%,
		95%,
		100% {
			transform: scaleY(1);
		}
		97.5% {
			transform: scaleY(0.1);
		}
	}
	@keyframes dizzy-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
