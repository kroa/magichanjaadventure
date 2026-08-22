<script lang="ts">
	interface Props {
		/** 밤하늘 (레벨업 / 보스 대결). 평소 밝은 화면과 대비되어 "특별한 순간"이 된다 */
		night?: boolean;
	}

	let { night = false }: Props = $props();

	/* 고정 시드 — Math.random() 은 SSR/CSR 이 어긋난다 */
	const CLOUDS = [
		{ top: 8, scale: 1, duration: 62, delay: 0, opacity: 0.85 },
		{ top: 22, scale: 0.65, duration: 84, delay: -20, opacity: 0.6 },
		{ top: 44, scale: 1.25, duration: 96, delay: -48, opacity: 0.5 },
		{ top: 66, scale: 0.8, duration: 74, delay: -12, opacity: 0.45 }
	];

	const STARS = [
		{ x: 12, y: 14, s: 1.1, d: 0 },
		{ x: 28, y: 8, s: 0.7, d: 0.8 },
		{ x: 46, y: 20, s: 0.9, d: 1.5 },
		{ x: 64, y: 10, s: 1.2, d: 0.4 },
		{ x: 78, y: 26, s: 0.8, d: 2.1 },
		{ x: 90, y: 14, s: 1, d: 1.1 },
		{ x: 20, y: 34, s: 0.6, d: 2.6 },
		{ x: 84, y: 44, s: 0.75, d: 1.8 }
	];
</script>

<!--
	배경 레이어. position: fixed + overflow: hidden 이므로
	구름이 화면 밖으로 흘러도 문서 폭에 영향을 주지 않는다 (가로 스크롤 방지).
-->
<div class="sky" class:night aria-hidden="true">
	{#each STARS as star, i (i)}
		<span
			class="star"
			style="left:{star.x}%; top:{star.y}%; --s:{star.s}; animation-delay:{star.d}s"
		></span>
	{/each}

	<!--
		멀고 가까운 산 — **깊이가 여기서 생긴다.**
		예전 배경은 파스텔 하늘에 구름뿐이라, 그 위에 무엇을 올려도 "떠 있는 아이콘" 으로 보였다.
		DragonBox 화면이 그럴듯한 이유는 색이 예뻐서가 아니라 층이 겹쳐 공간이 있기 때문이다.
		뒤는 흐리고 푸르게, 앞은 진하게 — 공기원근법 그대로다.
	-->
	<div class="horizon"></div>

	<svg class="range far" viewBox="0 0 1200 260" preserveAspectRatio="none">
		<path
			d="M0 260 L0 150 L120 78 L215 132 L330 52 L470 140 L590 84 L700 148 L830 66 L960 138 L1080 92 L1200 152 L1200 260 Z"
		/>
	</svg>

	<svg class="range mid" viewBox="0 0 1200 220" preserveAspectRatio="none">
		<path
			d="M0 220 L0 168 L90 118 L200 172 L320 104 L440 168 L560 122 L690 176 L810 112 L940 170 L1070 128 L1200 178 L1200 220 Z"
		/>
	</svg>

	<svg class="hills" viewBox="0 0 1200 200" preserveAspectRatio="none">
		<path
			d="M0 200 L0 120 Q160 58 340 112 Q520 166 700 104 Q880 46 1050 116 L1200 92 L1200 200 Z"
		/>
	</svg>

	{#each CLOUDS as cloud, i (i)}
		<svg
			class="cloud"
			viewBox="0 0 120 50"
			style="top:{cloud.top}%; --scale:{cloud.scale}; opacity:{cloud.opacity};
			       animation-duration:{cloud.duration}s; animation-delay:{cloud.delay}s"
		>
			<path
				d="M28 42c-11 0-19-7-19-16 0-8 6-14 14-15 3-7 10-11 18-11 10 0 19 7 21 16 8 1 14 7 14 14 0 7-6 12-14 12H28z"
				fill="#fff"
			/>
		</svg>
	{/each}
</div>

<style>
	/*
	 * 저녁 하늘.
	 *
	 * 파스텔 낮 하늘에서 **해 질 녘**으로 바꿨다. 색을 예쁘게 하려는 것이 아니라
	 * 대비를 만들기 위해서다 — 어두운 배경 위에서만 밝은 것이 빛나 보이고,
	 * 그래야 지금 갈 수 있는 섬이나 방금 만든 글자가 눈에 먼저 들어온다.
	 */
	.sky {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		background: linear-gradient(
			180deg,
			#2a2360 0%,
			#463a8f 26%,
			#7a5fae 48%,
			#c98fb0 68%,
			#f5b98a 86%,
			#ffd9a8 100%
		);
		transition: background 0.6s ease;
	}

	/* 보스전은 더 깊은 밤 */
	.sky.night {
		background: linear-gradient(180deg, #140f36 0%, #241a55 40%, #3d2c72 72%, #6b4a86 100%);
	}

	/* 지평선 빛무리 — 장면에 초점을 만든다 */
	.horizon {
		position: absolute;
		right: 0;
		bottom: 4%;
		left: 0;
		height: 46%;
		background: radial-gradient(
			60% 100% at 50% 100%,
			rgb(255 214 150 / 0.7) 0%,
			rgb(255 190 140 / 0.26) 42%,
			transparent 72%
		);
	}

	.range,
	.hills {
		position: absolute;
		right: 0;
		left: 0;
		width: 100%;
	}

	.range.far {
		bottom: 20%;
		height: 26%;
	}

	.range.far path {
		fill: #6a5da8;
		opacity: 0.45;
	}

	.range.mid {
		bottom: 11%;
		height: 22%;
	}

	.range.mid path {
		fill: #4b3f85;
		opacity: 0.62;
	}

	.hills {
		bottom: 0;
		height: 18%;
	}

	.hills path {
		fill: #2f2760;
	}

	.cloud {
		position: absolute;
		left: 0;
		width: calc(140px * var(--scale));
		height: auto;
		animation-name: cloud-drift;
		animation-timing-function: linear;
		animation-iteration-count: infinite;
		opacity: 0.5;
		filter: drop-shadow(0 6px 10px rgb(20 12 45 / 0.25));
	}

	.star {
		position: absolute;
		width: calc(6px * var(--s));
		height: calc(6px * var(--s));
		border-radius: 9999px;
		background: #fff;
		box-shadow: 0 0 8px #fff;
		opacity: 0;
		animation: var(--animate-twinkle);
	}

	/* 해 질 녘이라 별이 이미 하나둘 보인다 */

	@keyframes cloud-drift {
		from {
			transform: translateX(-30vw);
		}
		to {
			transform: translateX(115vw);
		}
	}
</style>
