<script lang="ts">
	import type { Snippet } from 'svelte';
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
		hideLabel = false,
		aside,
		class: klass = '',
		wrapClass = '',
		...rest
	}: Omit<HTMLTextareaAttributes, 'value'> & {
		label: string;
		name?: string;
		id?: string;
		value?: string | null;
		error?: string | null;
		hint?: string | null;
		hideLabel?: boolean;
		/** Extra content at the end of the label row. */
		aside?: Snippet;
		/** Size and placement of the wrapper. */
		wrapClass?: string;
	} = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? uid);
	const errorId = $derived(`${fieldId}-error`);
	const hintId = $derived(`${fieldId}-hint`);
	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={wrapClass}>
	<label
		for={fieldId}
		class={hideLabel
			? 'sr-only'
			: aside
				? 'label flex items-center justify-between gap-2'
				: 'label'}
		>{#if aside}<span>{label}</span>{@render aside()}{:else}{label}{/if}</label
	>
	<textarea
		id={fieldId}
		{name}
		{rows}
		bind:value
		class="block field {klass || 'min-h-24'} {error ? 'border-bad' : ''}"
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
		{...rest}></textarea>
	{#if hint}<p id={hintId} class="mt-1 text-sm text-muted">{hint}</p>{/if}
	{#if error}<p id={errorId} class="mt-1 text-sm text-bad">{error}</p>{/if}
</div>
