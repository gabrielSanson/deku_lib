<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	// A labelled text input with an optional hint and error. The error is linked to the field.
	let {
		label,
		name,
		value = $bindable(''),
		type = 'text',
		error,
		hint,
		required = false,
		autocomplete,
		placeholder
	}: {
		label: string;
		name: string;
		value?: string;
		type?: string;
		error?: string;
		hint?: string;
		required?: boolean;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		placeholder?: string;
	} = $props();

	const errorId = $derived(`${name}-error`);
	const hintId = $derived(`${name}-hint`);
	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div>
	<label for={name} class="label">
		{label}{#if required}<span aria-hidden="true"> *</span>{/if}
	</label>
	<input
		id={name}
		{name}
		{type}
		{required}
		{autocomplete}
		{placeholder}
		bind:value
		class="field {error ? 'border-bad' : ''}"
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
	/>
	{#if hint}<p id={hintId} class="mt-1 text-sm text-muted">{hint}</p>{/if}
	{#if error}<p id={errorId} class="mt-1 text-sm text-bad">{error}</p>{/if}
</div>
