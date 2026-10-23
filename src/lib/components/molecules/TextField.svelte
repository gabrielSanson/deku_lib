<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	// A labelled text input with an optional hint and error. The error is linked to the field.
	// Other input attributes (maxlength, inputmode, min, ...) pass through.
	let {
		label,
		name,
		id = name,
		value = $bindable(''),
		type = 'text',
		error,
		hint,
		required = false,
		class: klass = '',
		...rest
	}: Omit<HTMLInputAttributes, 'value'> & {
		label: string;
		name: string;
		id?: string;
		value?: string | number | null;
		error?: string | null;
		hint?: string;
		required?: boolean;
	} = $props();

	const errorId = $derived(`${id}-error`);
	const hintId = $derived(`${id}-hint`);
	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div>
	<label for={id} class="label">{label}</label>
	<input
		{id}
		{name}
		{type}
		{required}
		bind:value
		class="field {error ? 'border-bad' : ''} {klass}"
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
		{...rest}
	/>
	{#if hint}<p id={hintId} class="mt-1 text-sm text-muted">{hint}</p>{/if}
	{#if error}<p id={errorId} class="mt-1 text-sm text-bad">{error}</p>{/if}
</div>
