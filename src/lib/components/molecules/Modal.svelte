<script lang="ts">
	// A centred dialog built on the native <dialog>, so focus is trapped and Escape closes it.
	// Focus returns to the element that opened it when the dialog closes.
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		onclose,
		children
	}: { open?: boolean; title: string; onclose?: () => void; children: Snippet } = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let opener: Element | null = null;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			opener = document.activeElement;
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	function handleClose() {
		open = false;
		if (opener instanceof HTMLElement) opener.focus();
		onclose?.();
	}
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="modal-title"
	onclose={handleClose}
	class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-(--radius-card) bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50"
>
	<div class="p-6">
		<h2 id="modal-title" class="font-display text-xl font-extrabold">{title}</h2>
		<div class="mt-3">{@render children()}</div>
	</div>
</dialog>
