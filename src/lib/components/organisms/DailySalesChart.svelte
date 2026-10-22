<script lang="ts">
	import Money from '#lib/components/atoms/Money.svelte';

	// Gross sales per day as bars, with the same numbers in a table for screen readers.
	let {
		days
	}: {
		days: { day: string; orders: number; grossCents: number }[];
	} = $props();

	const max = $derived(Math.max(1, ...days.map((d) => d.grossCents)));
</script>

<div class="flex h-48 items-end gap-1" aria-hidden="true">
	{#each days as d (d.day)}
		<div class="group relative flex-1">
			<div
				class="rounded-t bg-brand-500"
				style="height: {Math.max(2, (d.grossCents / max) * 180)}px"
			></div>
		</div>
	{/each}
</div>
<details class="mt-2 text-sm">
	<summary class="cursor-pointer text-muted">Ver tabela</summary>
	<table class="mt-2 w-full">
		<thead
			><tr class="text-left text-muted"
				><th>Dia</th><th>Pedidos</th><th class="text-right">Vendas brutas</th></tr
			></thead
		>
		<tbody
			>{#each days as d (d.day)}<tr
					><td>{d.day}</td><td>{d.orders}</td><td class="text-right"
						><Money cents={d.grossCents} /></td
					></tr
				>{/each}</tbody
		>
	</table>
</details>
