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
	.sky {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		background: var(--gradient-sky);
		transition: background 0.6s ease;
	}

	.sky.night {
		background: var(--gradient-night);
	}

	.cloud {
		position: absolute;
		left: 0;
		width: calc(140px * var(--scale));
		height: auto;
		animation-name: cloud-drift;
		animation-timing-function: linear;
		animation-iteration-count: infinite;
		filter: drop-shadow(0 6px 10px rgb(60 40 120 / 0.08));
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

	/* 낮에는 별이 보이지 않는다 */
	.sky:not(.night) .star {
		display: none;
	}

	@keyframes cloud-drift {
		from {
			transform: translateX(-30vw);
		}
		to {
			transform: translateX(115vw);
		}
	}
</style>
