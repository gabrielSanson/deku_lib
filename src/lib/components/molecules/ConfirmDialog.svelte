<script lang="ts">
	// Asks before an action that cannot be undone, such as cancelling an order. The safe option has focus.
	import Modal from '#lib/components/molecules/Modal.svelte';

	let {
		open = $bindable(false),
		title,
		text,
		confirmLabel,
		cancelLabel = 'Voltar',
		danger = false,
		onconfirm
	}: {
		open?: boolean;
		title: string;
		text: string;
		confirmLabel: string;
		cancelLabel?: string;
		danger?: boolean;
		onconfirm: () => void;
	} = $props();
</script>

<Modal bind:open {title}>
	<p class="text-sm text-muted">{text}</p>
	<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
		<button class="btn-secondary" onclick={() => (open = false)}>{cancelLabel}</button>
		<button
			class={danger ? 'btn-danger' : 'btn-primary'}
			onclick={() => {
				open = false;
				onconfirm();
			}}>{confirmLabel}</button
		>
	</div>
</Modal>
