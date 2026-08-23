<script lang="ts">
	import { spriteFor } from '$lib/game/characters';
	import RankAura from './RankAura.svelte';
	import RankBadge from './RankBadge.svelte';
	import type { CharacterClass } from '$lib/types/user';
	import type { Mood } from '$lib/types/ui';

	interface Props {
		cls: CharacterClass | null | undefined;
		/** 0 = 전직 전 */
		rank?: number;
		size?: number;
		mood?: Mood;
		idle?: boolean;
		class?: string;
	}

	let {
		cls,
		rank = 0,
		size = 120,
		mood = 'happy',
		idle = true,
		class: className = ''
	}: Props = $props();

	const Sprite = $derived(spriteFor(cls));

	/*
	 * 작은 자리에서는 오라 대신 배지를 쓴다.
	 *
	 * 상점은 캐릭터 여섯을 동시에 그린다. 거기에 링·후광·핀을 여섯 벌 얹으면
	 * 노드가 두 배가 되는데, 그 크기에서는 핀이 어차피 안 보인다.
	 * 호출부가 매번 판단하게 두면 언젠가 빠뜨리므로 여기서 강제한다.
	 */
	const small = $derived(size < 120);
</script>

<!--
	계급을 입은 캐릭터.

	**몸통 SVG 를 수술하지 않고 앞뒤로 한 겹씩 덧댄다.**
	이 결정 하나로 세 가지가 동시에 안 깨진다:
	 - 6종의 `.knight.idle .head` 류 scoped 선택자 (컴포넌트를 쪼개면 컴파일 타임에 지워진다)
	 - `getByRole('img', { name: '한자 기사' })` 로 짚는 시각 테스트
	 - 스프라이트를 직접 import 하는 기존 호출부들

	오라는 `position:absolute` 라 레이아웃 높이를 1px 도 늘리지 않는다.
-->
<span class="hero {className}" style="--w:{size}px">
	{#if small}
		<Sprite {size} {mood} {idle} />
		<RankBadge {rank} {size} />
	{:else}
		<RankAura {cls} {rank} {size} layer="back" />
		<Sprite {size} {mood} {idle} />
		<RankAura {cls} {rank} {size} layer="front" />
	{/if}
</span>

<style>
	.hero {
		position: relative;
		display: inline-block;
		width: var(--w);
		line-height: 0;
	}

	/* 몸통이 오라 두 겹 사이에 오도록 */
	.hero :global(svg:not(.aura)) {
		position: relative;
		z-index: 1;
	}
</style>
