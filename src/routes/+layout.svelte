<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { enableViewTransitions } from '$lib/anim/navigate';

	let { children } = $props();

	// 화면을 오갈 때 부드럽게 넘어간다 (지원 안 하는 브라우저·감속 설정에서는 아무 일도 안 한다)
	enableViewTransitions();

	/*
	 * 하이드레이션이 끝났다는 신호를 DOM 에 남긴다.
	 *
	 * 이유: SSR 로 그려진 화면은 눌러도 JS 핸들러가 아직 안 붙어 있을 수 있다.
	 * 폼은 JS 없이도 동작하도록 만들어 두었지만, **하이드레이션 도중에 입력하면**
	 * Svelte 가 input 값을 서버 렌더 값으로 되돌려 입력이 사라질 수 있다.
	 *
	 * E2E 는 이 표식을 기다린 뒤에 조작한다 (tests/helpers/app.ts).
	 * 사람에게는 보이지 않지만, "이제 진짜로 눌러도 된다"를 알려 주는 유일한 신호다.
	 */
	onMount(() => {
		document.documentElement.dataset.hydrated = 'true';
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
