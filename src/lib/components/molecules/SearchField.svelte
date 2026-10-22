<script lang="ts">
	// A search input with a visible magnifier and a label that stays for screen readers.
	import Icon from '#lib/components/atoms/Icon.svelte';

	let {
		name = 'q',
		value = $bindable(''),
		placeholder = 'Buscar',
		label = 'Buscar'
	}: { name?: string; value?: string; placeholder?: string; label?: string } = $props();
</script>

<label class="relative block">
	<span class="sr-only">{label}</span>
	<Icon
		name="search"
		class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
	/>
	<input type="search" {name} {placeholder} bind:value class="field pl-9" />
</label>
