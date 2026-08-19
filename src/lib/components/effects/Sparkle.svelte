<script lang="ts">
	interface Props {
		/** 반짝임 개수 */
		count?: number;
		color?: string;
		class?: string;
	}

	let { count = 6, color = 'var(--color-gold-400)', class: className = '' }: Props = $props();

	/*
	 * 위치를 Math.random() 으로 만들지 않는다.
	 * SSR 과 클라이언트가 다른 값을 뽑아 hydration 이 어긋나기 때문이다.
	 * 고정 배열이면 언제나 같은 그림이 나오고, 눈으로는 무작위로 보인다.
	 */
	const SEEDS = [
		{ x: 8, y: 18, s: 0.9, d: 0 },
		{ x: 82, y: 10, s: 1.2, d: 0.4 },
		{ x: 92, y: 62, s: 0.75, d: 0.9 },
		{ x: 16, y: 78, s: 1.05, d: 1.3 },
		{ x: 48, y: 4, s: 0.65, d: 0.7 },
		{ x: 60, y: 88, s: 0.95, d: 1.7 },
		{ x: 2, y: 48, s: 0.8, d: 2.1 },
		{ x: 72, y: 36, s: 0.7, d: 1.1 }
	];

	const stars = $derived(SEEDS.slice(0, Math.min(count, SEEDS.length)));
</script>

<!--
	`-z-10` 이 중요하다.
	absolute 요소는 같은 부모의 static 형제보다 **위에** 그려진다. 그래서 z-index 없이 두면
	장식용 반짝임이 제목·캐릭터를 덮어 글자가 잘린 것처럼 보인다(실제로 회원가입 화면에서 겪었다).
	부모에 `isolate` 를 걸어 두면 음수 z-index 가 부모 밖으로 새지 않고 배경 바로 위에 머문다.
-->
<div class="pointer-events-none absolute inset-0 -z-10 {className}" aria-hidden="true">
	{#each stars as star, i (i)}
		<svg
			class="star absolute"
			style="left:{star.x}%; top:{star.y}%; --s:{star.s}; animation-delay:{star.d}s; color:{color}"
			viewBox="0 0 24 24"
			width="16"
			height="16"
		>
			<path
				d="M12 0c.6 6.4 5 10.8 12 12-7 1.2-11.4 5.6-12 12-.6-6.4-5-10.8-12-12C7 10.8 11.4 6.4 12 0z"
				fill="currentColor"
			/>
		</svg>
	{/each}
</div>

<style>
	.star {
		transform: scale(var(--s));
		transform-origin: center;
		animation: var(--animate-twinkle);
		filter: drop-shadow(0 0 4px currentColor);
	}
</style>
