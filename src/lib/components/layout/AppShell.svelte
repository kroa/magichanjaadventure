<script lang="ts">
	import type { Snippet } from 'svelte';
	import SkyBackground from './SkyBackground.svelte';
	import BottomNav from './BottomNav.svelte';
	import ToastHost from '$lib/components/common/ToastHost.svelte';

	interface Props {
		/** 밤하늘 배경 (레벨업 / 보스) */
		night?: boolean;
		/** 하단 네비게이션 표시 (로그인/가입 화면에서는 숨긴다) */
		nav?: boolean;
		/** 화면 상단 고정 영역 (TopHud 등) */
		hud?: Snippet;
		class?: string;
		children: Snippet;
	}

	let { night = false, nav = true, hud, class: className = '', children }: Props = $props();
</script>

<SkyBackground {night} />
<ToastHost />

<!-- 키보드 사용자가 네비게이션을 건너뛸 수 있게 -->
<a href="#main" class="skip-link sr-only-focusable" data-allow-small>본문으로 건너뛰기</a>

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
