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
		size = 'md',
		class: klass = ''
	}: {
		label: string;
		icon: IconName;
		type?: 'button' | 'submit';
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		/** ghost and secondary for light surfaces, night for the dark cart panel. */
		variant?: 'ghost' | 'secondary' | 'night';
		/** md is the 48 px touch target; sm (36 px) sits inside dense rows. */
		size?: 'sm' | 'md';
		class?: string;
	} = $props();

	const tone = {
		ghost: 'rounded-(--radius-control) text-ink hover:bg-quiet',
		secondary: 'rounded-(--radius-control) border border-line bg-surface text-ink hover:bg-quiet',
		night: 'rounded-full text-stone-300 hover:bg-night-2 hover:text-white'
	};
	const sizes = { sm: 'size-9', md: 'size-12' };
</script>

<button
	{type}
	{disabled}
	{onclick}
	aria-label={label}
	title={label}
	class="inline-grid shrink-0 place-items-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 {sizes[
		size
	]} {tone[variant]} {klass}"
>
	<Icon name={icon} class={size === 'sm' ? 'size-5' : 'size-6'} />
</button>
