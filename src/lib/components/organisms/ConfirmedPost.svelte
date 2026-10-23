<script lang="ts">
	// Posts a form action only after the app's confirm dialog, for actions that cannot be
	// undone (delete, end, cancel). The form is hidden; open the dialog to start.
	import { enhance } from '$app/forms';
	import ConfirmDialog from '#lib/components/molecules/ConfirmDialog.svelte';

	let {
		open = $bindable(false),
		action,
		fields = {},
		title,
		text,
		confirmLabel,
		cancelLabel,
		danger = true
	}: {
		open?: boolean;
		action: string;
		/** Hidden fields sent with the action, e.g. { id }. */
		fields?: Record<string, string>;
		title: string;
		text: string;
		confirmLabel: string;
		cancelLabel?: string;
		danger?: boolean;
	} = $props();

	let formEl = $state<HTMLFormElement>();
</script>

<form method="POST" {action} use:enhance bind:this={formEl} hidden>
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
</form>
<ConfirmDialog
	bind:open
	{title}
	{text}
	{confirmLabel}
	{cancelLabel}
	{danger}
	onconfirm={() => formEl?.requestSubmit()}
/>
