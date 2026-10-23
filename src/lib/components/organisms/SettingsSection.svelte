<script lang="ts">
	import type { Snippet } from 'svelte';
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';

	// One settings form as a card: title, hint, fields, save button and the saved/warning notes.
	// Leaving the page with edits that were not saved asks first.
	let {
		title,
		hint,
		action,
		saveLabel,
		saved,
		warning,
		children
	}: {
		title: string;
		hint?: string;
		action: string;
		saveLabel: string;
		saved?: string;
		warning?: string | null;
		children: Snippet;
	} = $props();
</script>

<GuardedForm {action} class="space-y-4 card p-4">
	<h2 class="font-semibold">{title}</h2>
	{#if hint}<p class="text-sm text-muted">{hint}</p>{/if}
	{@render children()}
	{#if saved}<p class="alert-ok" role="status">{saved}</p>{/if}
	{#if warning}<p class="alert-warn">{warning}</p>{/if}
	<button class="btn-primary">{saveLabel}</button>
</GuardedForm>
