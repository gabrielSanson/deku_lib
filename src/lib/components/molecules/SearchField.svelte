<script lang="ts">
	// A search input with a visible magnifier and a label that stays for screen readers.
	import Icon from '#lib/components/atoms/Icon.svelte';

	let {
		name,
		value = $bindable(''),
		label,
		placeholder = label,
		input = $bindable(),
		class: klass = '',
		inputClass = ''
	}: {
		name?: string;
		value?: string;
		label: string;
		placeholder?: string;
		/** The input element, for focusing it from a shortcut. */
		input?: HTMLInputElement;
		/** Size and placement of the wrapper. */
		class?: string;
		/** Extra classes for the input (height, rounding). */
		inputClass?: string;
	} = $props();
</script>

<label class="relative block {klass}">
	<span class="sr-only">{label}</span>
	<Icon
		name="search"
		class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted"
	/>
	<input
		bind:this={input}
		type="search"
		{name}
		{placeholder}
		bind:value
		class="field w-full pl-11 {inputClass}"
	/>
</label>
