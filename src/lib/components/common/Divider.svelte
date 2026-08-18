<script lang="ts">
	interface Props {
		/** 가운데에 넣을 작은 라벨 */
		label?: string;
		class?: string;
	}

	let { label, class: className = '' }: Props = $props();
</script>

{#if label}
	<div class="my-5 flex items-center gap-3 {className}">
		<span class="line"></span>
		<span class="shrink-0 font-display text-xs tracking-wide text-ink-400">{label}</span>
		<span class="line"></span>
	</div>
{:else}
	<hr class="my-5 border-0 {className}" style="height:2px; background:var(--color-magic-100)" />
{/if}

<style>
	.line {
		flex: 1;
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--color-magic-200), transparent);
	}
</style>
