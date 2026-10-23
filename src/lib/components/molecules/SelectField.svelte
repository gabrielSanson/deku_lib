<script lang="ts">
	// A labelled native select. Native keeps keyboard and screen reader behaviour for free.
	// Pass `options`, or the <option> elements as children. Other attributes pass through.
	// In filter bars the label can stay for screen readers only (`hideLabel`).
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	type Option = { value: string; label: string };
	let {
		label,
		name,
		id = name,
		options,
		value = $bindable(),
		hideLabel = false,
		class: klass = '',
		wrapClass = '',
		children,
		...rest
	}: Omit<HTMLSelectAttributes, 'value' | 'children'> & {
		label: string;
		name?: string;
		id?: string;
		options?: Option[];
		value?: unknown;
		hideLabel?: boolean;
		/** Size and placement of the wrapper. */
		wrapClass?: string;
		children?: Snippet;
	} = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? uid);
</script>

<div class={wrapClass}>
	<label for={fieldId} class={hideLabel ? 'sr-only' : 'label'}>{label}</label>
	<select id={fieldId} {name} bind:value class="block field {klass}" {...rest}>
		{#if children}{@render children()}{:else}
			{#each options ?? [] as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		{/if}
	</select>
</div>
