<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { guardUnsaved } from '#lib/client/unsaved.svelte.ts';
	import { useTexts } from '#lib/texts/context.ts';

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

	const t = useTexts();
	let formEl = $state<HTMLFormElement>();
	const guard = guardUnsaved(
		() => formEl,
		() => t('unsaved.confirm')
	);
</script>

<form
	method="POST"
	{action}
	bind:this={formEl}
	class="space-y-4 card p-4"
	use:enhance={() => {
		guard.saving();
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') guard.saved();
			else guard.failed();
		};
	}}
>
	<h2 class="font-semibold">{title}</h2>
	{#if hint}<p class="text-sm text-muted">{hint}</p>{/if}
	{@render children()}
	{#if saved}<p class="alert-ok" role="status">{saved}</p>{/if}
	{#if warning}<p class="alert-warn">{warning}</p>{/if}
	<button class="btn-primary">{saveLabel}</button>
</form>
