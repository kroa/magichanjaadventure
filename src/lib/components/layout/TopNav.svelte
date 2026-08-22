<script lang="ts">
	import { page } from '$app/state';
	import { NAV_TABS, isTabActive } from './nav-tabs';
</script>

<!--
	데스크톱 전용 상단 네비게이션.

	화면이 넓어지면 하단 바는 손가락에서 너무 멀어지므로 위로 올린다.
	sticky 라서 아래로 스크롤해도 항상 "나가는 길"이 보인다 —
	상점이나 도감에 들어갔다가 돌아갈 곳을 못 찾는 일이 없어야 한다.
-->
<nav class="top-nav glass hidden sm:block" aria-label="주요 메뉴">
	<ul class="mx-auto flex w-full max-w-[var(--layout-max)] items-center gap-1 px-4 sm:px-6">
		{#each NAV_TABS as tab (tab.href)}
			{@const active = isTabActive(tab.href, page.url.pathname)}
			<li>
				<a
					href={tab.href}
					class="tab tappable font-display"
					class:active
					aria-current={active ? 'page' : undefined}
				>
					<span class="icon" aria-hidden="true">{tab.icon}</span>
					<span>{tab.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.top-nav {
		position: sticky;
		top: 0;
		z-index: 40;
		border-bottom: 2px solid rgb(255 226 160 / 0.22);
		box-shadow: 0 6px 20px rgb(60 40 120 / 0.08);
	}

	ul {
		margin: 0;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
		list-style: none;
	}

	.tab {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		/* 마우스 사용자라도 아이가 쓰는 화면이다. 타깃을 작게 만들지 않는다. */
		min-height: var(--tap-min);
		padding: 0 1rem;
		border-radius: var(--radius-button);
		color: rgb(255 255 255 / 0.72);
		font-size: 1rem;
		text-decoration: none;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			transform 0.15s var(--ease-pop);
	}

	.tab .icon {
		font-size: 1.2rem;
		line-height: 1;
	}

	.tab:hover {
		transform: translateY(-1px);
		background: rgb(255 255 255 / 0.1);
		color: #fff;
	}

	.tab.active {
		background: var(--gradient-magic);
		color: #fff;
		box-shadow: 0 3px 0 var(--color-magic-700);
	}
</style>
