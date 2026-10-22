<script lang="ts">
	// A set of choices where exactly one can be picked. The group is labelled by a legend.
	type Option = { value: string; label: string; hint?: string };
	let {
		legend,
		name,
		options,
		value = $bindable('')
	}: { legend: string; name: string; options: Option[]; value?: string } = $props();
</script>

<fieldset class="space-y-2">
	<legend class="label">{legend}</legend>
	{#each options as option (option.value)}
		<label
			class="flex min-h-12 cursor-pointer items-center gap-3 rounded-(--radius-control) border border-line bg-surface px-3.5 has-checked:border-brand-500 has-checked:bg-brand-tint"
		>
			<input
				type="radio"
				{name}
				value={option.value}
				bind:group={value}
				class="size-5 accent-brand-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
			/>
			<span class="flex flex-col">
				<span class="font-medium text-ink">{option.label}</span>
				{#if option.hint}<span class="text-sm text-muted">{option.hint}</span>{/if}
			</span>
		</label>
	{/each}
</fieldset>
