<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import SkyBackground from './SkyBackground.svelte';
	import BottomNav from './BottomNav.svelte';
	import TopNav from './TopNav.svelte';
	import ToastHost from '$lib/components/common/ToastHost.svelte';
	import LevelUpOverlay from '$lib/components/effects/LevelUpOverlay.svelte';
	import PurchaseOverlay from '$lib/components/effects/PurchaseOverlay.svelte';
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
		/**
		 * 좌우 여백과 최대 폭을 걷어낸다 (지도처럼 **화면 끝까지** 써야 하는 화면).
		 * 예전에는 각 화면이 `width:100vw; margin-left:50%` 로 껍데기를 뚫고 나갔는데,
		 * `100vw` 는 세로 스크롤바 폭을 포함해서 넘침 검사에 안 걸리는 사각지대를 만든다.
		 */
		bleed?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		night = false,
		nav = true,
		hud,
		bleed = false,
		class: className = '',
		children
	}: Props = $props();

	/*
	 * 레벨업 연출은 여기 한 곳에만 마운트한다.
	 * 학습·퀴즈·대결 어디서 레벨이 올라도 같은 연출이 나오고, 화면마다 복붙하지 않는다.
	 */
	onMount(() => sound.init());
</script>

<SkyBackground {night} />
<ToastHost />
<LevelUpOverlay />
<PurchaseOverlay />

<!-- 키보드 사용자가 네비게이션을 건너뛸 수 있게 -->
<!-- 포커스될 때만 보이는 접근성 링크. 다른 요소 위에 뜨는 것이 정상이다. -->
<a href="#main" class="skip-link sr-only-focusable" data-allow-small data-allow-overlap
	>본문으로 건너뛰기</a
>

<!--
	**세로를 한 번만 센다.**

	TopNav 는 `position: sticky` 라 문서 흐름에서 자리를 차지한다.
	그런데 그 아래 `.shell` 이 `min-height: 100dvh` 를 따로 잡고 있어서,
	640px 이상 모든 화면이 **항상 TopNav 높이(~66px)만큼 세로로 스크롤됐다.**
	데스크톱 홈 스크린샷이 1280×845 로 찍히던 이유이고,
	지도가 `calc(100dvh - 13rem)` 같은 매직넘버를 쓸 수밖에 없던 이유다.

	이제 바깥 `.frame` 하나가 100dvh 를 잡고 안쪽은 flex 로 나눠 갖는다.
-->
<div class="frame">
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
			class="{bleed
				? 'w-full flex-1 py-3'
				: 'mx-auto w-full max-w-[var(--layout-max)] flex-1 px-4 py-6 sm:px-6'} {className}"
		>
			{@render children()}
		</main>
	</div>
</div>

{#if nav}
	<BottomNav />
{/if}

<style>
	/* 화면 높이를 잡는 것은 여기 하나뿐이다 */
	.frame {
		display: flex;
		min-height: 100dvh;
		flex-direction: column;
	}

	.shell {
		display: flex;
		min-height: 0;
		flex: 1;
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
		/*
		 * magic-500 은 흰 글자와 4.35:1 이라 본문 기준(4.5)에 못 미친다.
		 * 하필 **접근성 건너뛰기 링크**가 그 색이었다 — 대비 검사를 켜자마자 잡혔다.
		 */
		background: var(--color-magic-600);
		color: #fff;
		text-decoration: none;
	}
</style>
