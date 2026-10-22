<script lang="ts">
	// A checkbox with its label inside the clickable area. Use it for a yes or no choice in a form.
	let {
		checked = $bindable(false),
		label,
		name,
		disabled = false
	}: { checked?: boolean; label: string; name?: string; disabled?: boolean } = $props();
</script>

<label class="inline-flex min-h-10 cursor-pointer items-center gap-3 text-base text-ink">
	<input
		type="checkbox"
		class="size-5 rounded border-line accent-brand-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
		bind:checked
		{name}
		{disabled}
	/>
	{label}
</label>
