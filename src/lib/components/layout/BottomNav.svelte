<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	const TABS = [
		{ href: '/', label: '모험', icon: '🗺️' },
		{ href: '/learn', label: '배우기', icon: '✨' },
		{ href: '/quiz', label: '퀴즈', icon: '⚔️' },
		{ href: '/collection', label: '도감', icon: '📖' },
		{ href: '/shop', label: '상점', icon: '💎' }
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path.startsWith(href);
	}
</script>

<!-- 모바일 전용 하단 네비게이션. 데스크톱에서는 상단 액션이 그 역할을 한다. -->
<nav class="bottom-nav glass sm:hidden {className}" aria-label="주요 메뉴">
	<ul>
		{#each TABS as tab (tab.href)}
			{@const active = isActive(tab.href)}
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
		border-top: 2px solid rgb(124 92 255 / 0.12);
		padding-bottom: env(safe-area-inset-bottom);
		box-shadow: 0 -6px 20px rgb(60 40 120 / 0.1);
	}

	ul {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
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
		color: var(--color-ink-500);
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
		font-size: 0.7rem;
	}

	.tab:hover .icon,
	.tab.active .icon {
		transform: translateY(-2px) scale(1.15);
	}

	.tab.active {
		color: var(--color-magic-600);
	}
</style>
