<script lang="ts">
	// A labelled native select. Native keeps keyboard and screen reader behaviour for free.
	type Option = { value: string; label: string };
	let {
		label,
		name,
		options,
		value = $bindable(''),
		disabled = false
	}: {
		label: string;
		name: string;
		options: Option[];
		value?: string;
		disabled?: boolean;
	} = $props();
</script>

<div>
	<label for={name} class="label">{label}</label>
	<select id={name} {name} {disabled} bind:value class="field pr-10">
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</div>
