<script lang="ts">
	// A checkbox with its label (and optional hint) inside the clickable area. Use it for a
	// yes or no choice in a form. Other input attributes (name, value, required) pass through.
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		checked = $bindable(false),
		label,
		hint,
		class: klass = '',
		...rest
	}: Omit<HTMLInputAttributes, 'type' | 'checked'> & {
		checked?: boolean;
		label: string;
		hint?: string;
	} = $props();
</script>

<label class="flex min-h-11 cursor-pointer gap-3 {hint ? 'items-start' : 'items-center'} {klass}">
	<input
		type="checkbox"
		class="size-5 shrink-0 rounded border-line accent-brand-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-600 {hint
			? 'mt-0.5'
			: ''}"
		bind:checked
		{...rest}
	/>
	<span>
		{label}
		{#if hint}<span class="block text-sm text-muted">{hint}</span>{/if}
	</span>
</label>
