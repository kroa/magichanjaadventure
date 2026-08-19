<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import SkyBackground from './SkyBackground.svelte';
	import BottomNav from './BottomNav.svelte';
	import TopNav from './TopNav.svelte';
	import ToastHost from '$lib/components/common/ToastHost.svelte';
	import LevelUpOverlay from '$lib/components/effects/LevelUpOverlay.svelte';
	import { sound } from '$lib/sound/index.svelte';

	interface Props {
		/** 밤하늘 배경 (레벨업 / 보스) */
		night?: boolean;
		/**
		 * 주요 메뉴 표시 (모바일=하단 바 / 데스크톱=상단 바).
		 * 로그인·가입처럼 아직 계정이 없거나, 퀴즈처럼 집중이 필요한 화면에서는 끈다.
		 * 끄는 화면은 **반드시 자체 나가기 버튼을 둘 것.**
		 */
		nav?: boolean;
		/** 화면 상단 고정 영역 (TopHud 등) */
		hud?: Snippet;
		class?: string;
		children: Snippet;
	}

	let { night = false, nav = true, hud, class: className = '', children }: Props = $props();

	/*
	 * 레벨업 연출은 여기 한 곳에만 마운트한다.
	 * 학습·퀴즈·대결 어디서 레벨이 올라도 같은 연출이 나오고, 화면마다 복붙하지 않는다.
	 */
	onMount(() => sound.init());
</script>

<SkyBackground {night} />
<ToastHost />
<LevelUpOverlay />

<!-- 키보드 사용자가 네비게이션을 건너뛸 수 있게 -->
<!-- 포커스될 때만 보이는 접근성 링크. 다른 요소 위에 뜨는 것이 정상이다. -->
<a href="#main" class="skip-link sr-only-focusable" data-allow-small data-allow-overlap
	>본문으로 건너뛰기</a
>

{#if nav}
	<TopNav />
{/if}

<div class="shell" class:with-nav={nav}>
	{#if hud}
		<div class="mx-auto w-full max-w-[var(--layout-max)] px-4 pt-4 sm:px-6">
			{@render hud()}
		</div>
	{/if}

	<main
		id="main"
		class="mx-auto w-full max-w-[var(--layout-max)] flex-1 px-4 py-6 sm:px-6 {className}"
	>
		{@render children()}
	</main>
</div>

{#if nav}
	<BottomNav />
{/if}

<style>
	.shell {
		display: flex;
		min-height: 100dvh;
		flex-direction: column;
	}

	/* 하단 네비게이션에 콘텐츠가 가리지 않도록 여백을 준다 */
	.shell.with-nav {
		padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
	}

	@media (min-width: 640px) {
		.shell.with-nav {
			padding-bottom: 0;
		}
	}

	.skip-link {
		position: absolute;
		top: 0.75rem;
		left: 0.75rem;
		z-index: 80;
		padding: 0.75rem 1.25rem;
		border-radius: var(--radius-button);
		background: var(--color-magic-500);
		color: #fff;
		text-decoration: none;
	}
</style>
