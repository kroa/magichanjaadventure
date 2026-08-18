<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		/** 제목 옆 이모지/아이콘 */
		icon?: string;
		/** 제목 오른쪽 영역 (버튼, 배지 등) */
		action?: Snippet;
		class?: string;
		children: Snippet;
	}

	let { title, icon, action, class: className = '', children }: Props = $props();
</script>

<section class="glass rounded-panel p-5 shadow-card sm:p-7 {className}">
	{#if title}
		<header class="mb-5 flex items-center gap-3">
			{#if icon}
				<span class="text-2xl" aria-hidden="true">{icon}</span>
			{/if}
			<h2 class="flex-1 text-display-sm text-ink-900">{title}</h2>
			{#if action}
				{@render action()}
			{/if}
		</header>
	{/if}
	{@render children()}
</section>
