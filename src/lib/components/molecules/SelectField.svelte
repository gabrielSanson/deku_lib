<script lang="ts">
	// A labelled native select. Native keeps keyboard and screen reader behaviour for free.
	// Pass `options`, or the <option> elements as children. Other attributes pass through.
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	type Option = { value: string; label: string };
	let {
		label,
		name,
		id = name,
		options,
		value = $bindable(),
		class: klass = '',
		children,
		...rest
	}: Omit<HTMLSelectAttributes, 'value' | 'children'> & {
		label: string;
		name?: string;
		id?: string;
		options?: Option[];
		value?: unknown;
		children?: Snippet;
	} = $props();
</script>

<div>
	<label for={id} class="label">{label}</label>
	<select {id} {name} bind:value class="field pr-10 {klass}" {...rest}>
		{#if children}{@render children()}{:else}
			{#each options ?? [] as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		{/if}
	</select>
</div>
