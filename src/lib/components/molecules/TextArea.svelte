<script lang="ts">
	// A labelled multi-line field with an optional hint and error, linked to the field like TextField.
	let {
		label,
		name,
		value = $bindable(''),
		rows = 3,
		error,
		hint,
		maxlength
	}: {
		label: string;
		name: string;
		value?: string;
		rows?: number;
		error?: string;
		hint?: string;
		maxlength?: number;
	} = $props();

	const errorId = $derived(`${name}-error`);
	const hintId = $derived(`${name}-hint`);
	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div>
	<label for={name} class="label">{label}</label>
	<textarea
		id={name}
		{name}
		{rows}
		{maxlength}
		bind:value
		class="field min-h-24 {error ? 'border-bad' : ''}"
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}></textarea>
	{#if hint}<p id={hintId} class="mt-1 text-sm text-muted">{hint}</p>{/if}
	{#if error}<p id={errorId} class="mt-1 text-sm text-bad">{error}</p>{/if}
</div>
