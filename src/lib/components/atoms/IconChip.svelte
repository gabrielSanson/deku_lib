<script lang="ts">
	// Small fact about an order with an icon: Mesa 7, Retirada, Entrega, a name.
	import Icon, { type IconName } from '#lib/components/atoms/Icon.svelte';

	let {
		icon,
		label,
		tone = 'quiet'
	}: { icon: IconName; label: string; tone?: 'quiet' | 'info' | 'brand' } = $props();
	const tones = {
		quiet: 'bg-quiet text-stone-700',
		info: 'bg-info-tint text-info',
		brand: 'bg-brand-tint text-brand-700'
	};
</script>

<span class="pill {tones[tone]}"><Icon name={icon} class="size-3.5" />{label}</span>
