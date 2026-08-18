<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open?: boolean;
		title: string;
		/** 배경 클릭/ESC 로 닫을 수 있는가 (보상 연출 중에는 false) */
		dismissible?: boolean;
		size?: 'sm' | 'md' | 'lg';
		onclose?: () => void;
		footer?: Snippet;
		children: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		dismissible = true,
		size = 'md',
		onclose,
		footer,
		children
	}: Props = $props();

	let dialog = $state<HTMLDialogElement | null>(null);

	/*
	 * 네이티브 <dialog> 를 쓰는 이유:
	 * 포커스 트랩, ESC 닫기, inert 배경, 접근성 트리 처리를 브라우저가 해준다.
	 * 직접 구현하면 거의 항상 어딘가 빠진다.
	 */
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function close() {
		open = false;
		onclose?.();
	}

	function onCancel(event: Event) {
		event.preventDefault(); // ESC 를 우리 흐름으로 통일한다
		if (dismissible) close();
	}

	function onBackdropClick(event: MouseEvent) {
		if (!dismissible) return;
		if (event.target === dialog) close();
	}

	const WIDTHS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
</script>

<dialog
	bind:this={dialog}
	class="modal w-[calc(100vw-2rem)] rounded-panel {WIDTHS[size]} bg-transparent p-0"
	aria-labelledby="modal-title"
	oncancel={onCancel}
	onclick={onBackdropClick}
	onclose={() => (open = false)}
>
	<div class="relative rounded-panel bg-white p-6 shadow-float sm:p-8">
		<h2 id="modal-title" class="pr-10 text-display-md text-ink-900">{title}</h2>

		{#if dismissible}
			<button type="button" class="close-btn" onclick={close} aria-label="닫기"> ✕ </button>
		{/if}

		<div class="mt-4 text-ink-700">
			{@render children()}
		</div>

		{#if footer}
			<div class="mt-7 flex flex-wrap justify-end gap-3">
				{@render footer()}
			</div>
		{/if}
	</div>
</dialog>

<style>
	.modal::backdrop {
		background: rgb(43 26 102 / 0.55);
		backdrop-filter: blur(4px);
	}

	.modal[open] > div {
		animation: var(--animate-pop-in);
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border: none;
		border-radius: 9999px;
		background: var(--color-magic-50);
		color: var(--color-ink-700);
		font-size: 1.1rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.close-btn:hover {
		background: var(--color-magic-100);
	}
</style>
