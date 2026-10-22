<script lang="ts">
	// An on/off switch. Uses role="switch" with a visible label, so the state reads out loud.
	let {
		checked = $bindable(false),
		label,
		name,
		disabled = false
	}: { checked?: boolean; label: string; name?: string; disabled?: boolean } = $props();
</script>

<label class="inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-ink">
	<input type="checkbox" role="switch" class="peer sr-only" bind:checked {name} {disabled} />
	<span
		class="relative inline-block h-6 w-11 rounded-full bg-stone-300 transition-colors peer-checked:bg-brand-500 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
		aria-hidden="true"
	></span>
	{label}
</label>
