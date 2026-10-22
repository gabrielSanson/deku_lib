<script lang="ts">
	// One report number: label, value and the change against the previous period.
	// Becomes a link when the number has a page behind it.
	let {
		label,
		value,
		delta = null,
		note,
		href,
		title
	}: {
		label: string;
		value: string;
		/** Change as a fraction (0.12 = +12%); null when there is nothing to compare. */
		delta?: number | null;
		note?: string;
		href?: string;
		title?: string;
	} = $props();
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class="card p-4 {href ? 'hover:border-brand-500' : ''}"
	{title}
>
	<div class="text-sm text-muted">{label}</div>
	<div class="text-2xl font-bold tabular-nums">{value}</div>
	{#if delta !== null}
		<div class="text-xs {delta >= 0 ? 'text-ok' : 'text-bad'}">
			{delta >= 0 ? '▲' : '▼'}
			{Math.abs(Math.round(delta * 100))}% vs. período anterior
		</div>
	{:else if note}
		<div class="text-xs text-muted">{note}</div>
	{/if}
</svelte:element>
