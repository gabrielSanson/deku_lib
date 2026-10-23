<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	// A labelled multi-line field with an optional hint and error, linked to the field like TextField.
	let {
		label,
		name,
		id = name,
		value = $bindable(''),
		rows = 3,
		error,
		hint,
		class: klass = '',
		...rest
	}: Omit<HTMLTextareaAttributes, 'value'> & {
		label: string;
		name: string;
		id?: string;
		value?: string | null;
		error?: string | null;
		hint?: string;
	} = $props();

	const errorId = $derived(`${id}-error`);
	const hintId = $derived(`${id}-hint`);
	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div>
	<label for={id} class="label">{label}</label>
	<textarea
		{id}
		{name}
		{rows}
		bind:value
		class="field {klass || 'min-h-24'} {error ? 'border-bad' : ''}"
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
		{...rest}></textarea>
	{#if hint}<p id={hintId} class="mt-1 text-sm text-muted">{hint}</p>{/if}
	{#if error}<p id={errorId} class="mt-1 text-sm text-bad">{error}</p>{/if}
</div>
