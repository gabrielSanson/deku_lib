<script lang="ts" generics="V extends string">
	// A short exclusive choice shown as a row of buttons: payment method, order type,
	// promotion type. The picked one is filled; `value` is bindable.
	type Choice = { value: V; label: string; disabled?: boolean };
	let {
		choices,
		value = $bindable(),
		label,
		class: cls = 'grid grid-cols-2 gap-2'
	}: { choices: Choice[]; value: V; label: string; class?: string } = $props();
</script>

<div class={cls} role="group" aria-label={label}>
	{#each choices as c (c.value)}
		<button
			type="button"
			class="btn {value === c.value ? 'bg-ink text-canvas' : 'btn-secondary'}"
			aria-pressed={value === c.value}
			disabled={c.disabled}
			onclick={() => (value = c.value)}>{c.label}</button
		>
	{/each}
</div>
