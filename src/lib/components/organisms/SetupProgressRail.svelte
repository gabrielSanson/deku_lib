<script lang="ts">
	// The setup wizard's step rail. Steps before the current one are shown as done,
	// the current one is highlighted, and the rest are muted. Each step is a link.
	let {
		steps,
		labels,
		current,
		index
	}: { steps: readonly string[]; labels: Record<string, string>; current: string; index: number } =
		$props();
</script>

<nav aria-label="Passos" class="flex flex-wrap gap-1 text-sm">
	{#each steps as s, i (s)}
		<a
			href="?passo={s}"
			class="rounded-full px-3 py-1 {s === current
				? 'bg-brand-500 font-semibold text-black'
				: i < index
					? 'bg-brand-100 text-brand-700'
					: 'bg-stone-100 text-muted'}"
			aria-current={s === current ? 'step' : undefined}>{i + 1}. {labels[s]}</a
		>
	{/each}
</nav>
