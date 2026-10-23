<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	// A photo picker for menu and campaign images. Accepts the formats the server takes.
	let {
		label,
		name = 'photo',
		id,
		hideLabel = false,
		accept = 'image/jpeg,image/png,image/webp',
		class: klass = '',
		wrapClass = '',
		...rest
	}: Omit<HTMLInputAttributes, 'type'> & {
		label: string;
		name?: string;
		id?: string;
		hideLabel?: boolean;
		/** Size and placement of the wrapper. */
		wrapClass?: string;
	} = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? uid);
</script>

<div class={wrapClass}>
	<label for={fieldId} class={hideLabel ? 'sr-only' : 'label'}>{label}</label>
	<input id={fieldId} {name} type="file" {accept} class="block field text-sm {klass}" {...rest} />
</div>
