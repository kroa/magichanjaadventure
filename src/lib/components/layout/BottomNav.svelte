<script lang="ts">
	import { page } from '$app/state';
	import { NAV_TABS, isTabActive } from './nav-tabs';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
</script>

<!-- 모바일 전용 하단 네비게이션. 데스크톱에서는 TopNav 가 같은 역할을 한다. -->
<nav class="bottom-nav glass sm:hidden {className}" aria-label="주요 메뉴">
	<ul>
		{#each NAV_TABS as tab (tab.href)}
			{@const active = isTabActive(tab.href, page.url.pathname)}
			<li>
				<a href={tab.href} class="tab" class:active aria-current={active ? 'page' : undefined}>
					<span class="icon" aria-hidden="true">{tab.icon}</span>
					<span class="label font-display">{tab.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.bottom-nav {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 40;
		border-top: 2px solid rgb(255 226 160 / 0.22);
		padding-bottom: env(safe-area-inset-bottom);
		box-shadow: 0 -6px 20px rgb(60 40 120 / 0.1);
	}

	ul {
		display: grid;
		/* 칸 수를 고정하지 않는다 — 탭이 늘거나 줄어도 CSS 를 같이 고칠 필요가 없다 */
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		/* 터치 타깃 하한선 */
		min-height: var(--tap-min);
		padding: 0.5rem 0.25rem;
		color: rgb(255 255 255 / 0.72);
		text-decoration: none;
		transition:
			color 0.15s ease,
			transform 0.15s var(--ease-pop);
	}

	.tab .icon {
		font-size: 1.35rem;
		line-height: 1;
		transition: transform 0.2s var(--ease-pop);
	}

	.tab .label {
		font-size: 0.66rem;
		white-space: nowrap;
	}

	.tab:hover .icon,
	.tab.active .icon {
		transform: translateY(-2px) scale(1.15);
	}

	.tab.active {
		color: var(--color-gold-300, #ffe08a);
	}
</style>
