<script lang="ts">
	// A square button with only an icon. The label is required, because screen readers need it.
	import Icon, { type IconName } from '#lib/components/atoms/Icon.svelte';

	let {
		label,
		icon,
		type = 'button',
		disabled = false,
		onclick,
		variant = 'ghost',
		class: klass = ''
	}: {
		label: string;
		icon: IconName;
		type?: 'button' | 'submit';
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		variant?: 'ghost' | 'secondary';
		class?: string;
	} = $props();

	const tone = {
		ghost: 'text-ink hover:bg-quiet',
		secondary: 'border border-line bg-surface text-ink hover:bg-quiet'
	};
</script>

<button
	{type}
	{disabled}
	{onclick}
	aria-label={label}
	title={label}
	class="inline-grid size-12 place-items-center rounded-(--radius-control) transition-colors disabled:cursor-not-allowed disabled:opacity-50 {tone[
		variant
	]} {klass}"
>
	<Icon name={icon} class="size-5" />
</button>
