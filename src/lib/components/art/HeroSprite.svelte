<script lang="ts">
	import { spriteFor } from '$lib/game/characters';
	import RankAura from './RankAura.svelte';
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
	<RankAura {cls} {rank} {size} layer="back" />
	<Sprite {size} {mood} {idle} />
	<RankAura {cls} {rank} {size} layer="front" />
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
