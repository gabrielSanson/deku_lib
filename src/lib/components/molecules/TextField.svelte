<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon, { type IconName } from '#lib/components/atoms/Icon.svelte';

	// A labelled text input with an optional hint and error. The error is linked to the field.
	// Other input attributes (maxlength, inputmode, min, ...) pass through. In tight rows the
	// label can stay for screen readers only (`hideLabel`); `icon` adds a leading line icon.
	let {
		label,
		name,
		id = name,
		value = $bindable(''),
		type = 'text',
		error,
		hint,
		required = false,
		hideLabel = false,
		icon,
		aside,
		input = $bindable(),
		class: klass = '',
		wrapClass = '',
		...rest
	}: Omit<HTMLInputAttributes, 'value'> & {
		label: string;
		name?: string;
		id?: string;
		value?: string | number | null;
		error?: string | null;
		hint?: string | null;
		required?: boolean;
		hideLabel?: boolean;
		icon?: IconName;
		/** Extra content at the end of the label row (a "changed" mark, ...). */
		aside?: Snippet;
		/** The input element, for focusing it. */
		input?: HTMLInputElement;
		/** Size and placement of the wrapper (flex-1, w-32, ...). */
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
	<div class={icon ? 'relative' : 'contents'}>
		{#if icon}
			<Icon
				name={icon}
				class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-400"
			/>
		{/if}
		<input
			bind:this={input}
			id={fieldId}
			{name}
			{type}
			{required}
			bind:value
			class="block field {icon ? 'pl-10' : ''} {error ? 'border-bad' : ''} {klass}"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			{...rest}
		/>
	</div>
	{#if hint}<p id={hintId} class="mt-1 text-sm text-muted">{hint}</p>{/if}
	{#if error}<p id={errorId} class="mt-1 text-sm text-bad">{error}</p>{/if}
</div>
