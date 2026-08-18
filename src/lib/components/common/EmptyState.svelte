<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: string;
		title: string;
		description?: string;
		/** 다음에 할 일을 주는 버튼 */
		action?: Snippet;
		class?: string;
	}

	let { icon = '🔮', title, description, action, class: className = '' }: Props = $props();
</script>

<!-- 빈 화면에서 아이를 막다른 길에 두지 않는다. 항상 다음 행동을 제시한다. -->
<div class="flex flex-col items-center gap-3 px-6 py-12 text-center {className}">
	<span class="floating text-5xl" aria-hidden="true">{icon}</span>
	<h3 class="text-display-sm text-ink-900">{title}</h3>
	{#if description}
		<p class="max-w-sm text-ink-500">{description}</p>
	{/if}
	{#if action}
		<div class="mt-2">{@render action()}</div>
	{/if}
</div>

<style>
	.floating {
		animation: var(--animate-float);
	}
</style>
