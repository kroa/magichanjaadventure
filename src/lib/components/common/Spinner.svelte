<script lang="ts">
	interface Props {
		/** 접근성 이름 */
		label?: string;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let { label = '불러오는 중', size = 'md', class: className = '' }: Props = $props();

	const SIZES = { sm: 'size-6', md: 'size-10', lg: 'size-16' };
</script>

<!-- 회전하는 마법진. 단순 원형 스피너보다 세계관에 맞는다 -->
<div class="inline-grid place-items-center {className}" role="status" aria-label={label}>
	<svg class="rune {SIZES[size]}" viewBox="0 0 48 48" aria-hidden="true">
		<circle
			cx="24"
			cy="24"
			r="19"
			fill="none"
			stroke="var(--color-magic-200)"
			stroke-width="4"
			opacity="0.55"
		/>
		<path
			d="M24 5a19 19 0 0 1 19 19"
			fill="none"
			stroke="var(--color-magic-500)"
			stroke-width="4"
			stroke-linecap="round"
		/>
		<circle cx="43" cy="24" r="3.5" fill="var(--color-gold-500)" />
	</svg>
	<span class="sr-only">{label}</span>
</div>

<style>
	.rune {
		animation: rune-spin 1.1s linear infinite;
	}

	@keyframes rune-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
