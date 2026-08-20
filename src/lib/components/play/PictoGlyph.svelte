<script lang="ts">
	import { PICTOGRAPHS } from '$lib/art/pictographs';

	interface Props {
		character: string;
		/**
		 * 0 = 그림만 · 1 = 그림 + 작은 글자 · 2 = 글자만
		 *
		 * **아이에게 단계가 바뀐다고 알리지 않는다.** DragonBox 가 카드를 숫자로 바꿀 때
		 * 아무 말도 하지 않는 것과 같다. 어느 순간 보니 글자를 읽고 있는 것이 목표다.
		 */
		stage?: 0 | 1 | 2;
		size?: number;
		/** 스크린리더용 이름 (뜻·음). 화면에는 안 보인다 */
		label?: string;
	}

	let { character, stage = 0, size = 44, label }: Props = $props();

	const picture = $derived(PICTOGRAPHS[character]);
	/* 그림이 없는 부품은 별수 없이 글자로 보여 준다 */
	const shown = $derived(picture ? stage : 2);
</script>

<!--
	그림 한자 — 글자가 되기 전의 모습.

	아이는 처음에 해 그림과 달 그림을 붙인다. 그게 明이라는 것은 나중에 안다.
	**첫 화면부터 `日(날 일)` 이라고 알려 주면 그건 교재지 게임이 아니다.**
-->
<span
	class="picto"
	style="--picto:{size}px"
	role="img"
	aria-label={label ?? picture?.label ?? character}
>
	{#if shown < 2}
		<svg class="drawing" viewBox="0 0 100 100" aria-hidden="true">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- 우리가 직접 쓴 도형이다 -->
			{@html picture.svg}
		</svg>
	{/if}

	{#if shown === 1}
		<!-- 그림 위에 글자를 작게 겹쳐 둔다. 둘이 같은 것이라는 걸 말없이 알려 준다 -->
		<span class="hanja corner" aria-hidden="true">{character}</span>
	{/if}

	{#if shown === 2}
		<span class="hanja full" aria-hidden="true">{character}</span>
	{/if}
</span>

<style>
	.picto {
		position: relative;
		display: grid;
		width: var(--picto);
		height: var(--picto);
		place-items: center;
	}

	.drawing {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.full {
		font-size: calc(var(--picto) * 0.82);
		line-height: 1;
		color: var(--color-magic-800);
	}

	/* 그림 귀퉁이의 작은 글자 — 아직 읽으라고 요구하지 않는 크기다 */
	.corner {
		position: absolute;
		right: -2%;
		bottom: -6%;
		padding: 0 0.15em;
		border-radius: 0.35em;
		background: rgb(255 255 255 / 0.9);
		color: var(--color-magic-700);
		font-size: calc(var(--picto) * 0.34);
		line-height: 1.1;
	}
</style>
