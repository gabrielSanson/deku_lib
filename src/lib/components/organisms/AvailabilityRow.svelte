<script lang="ts">
	// One row of the availability screen: what the item is, and the one button that marks it
	// sold out (or missing) or brings it back. The button is red while the item is off.
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';

	let {
		action,
		fields,
		off,
		offLabel,
		onLabel,
		children
	}: {
		action: string;
		/** Hidden fields that say which item and what to switch it to. */
		fields: Record<string, string>;
		/** The item is sold out / missing right now. */
		off: boolean;
		/** Button text while the item is off ("Voltou"). */
		offLabel: string;
		/** Button text while the item is on ("Marcar esgotado"). */
		onLabel: string;
		children: Snippet;
	} = $props();
</script>

<form method="POST" {action} use:enhance class="flex items-center gap-3 p-3">
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
	{@render children()}
	<button class="btn min-h-9 text-sm {off ? 'bg-bad-strong text-white' : 'btn-secondary'}"
		>{off ? offLabel : onLabel}</button
	>
</form>
