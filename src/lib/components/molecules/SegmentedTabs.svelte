<script lang="ts" generics="K extends string">
	// A row of tabs with an optional icon and count. Tabs are links when `href`
	// is given (so the choice survives a reload), otherwise buttons.
	import Icon, { type IconName } from '#lib/components/atoms/Icon.svelte';

	interface Tab {
		key: K;
		label: string;
		icon?: IconName;
		count?: number;
		href?: string;
	}
	let {
		tabs,
		active,
		onselect,
		label,
		dark = false
	}: {
		tabs: Tab[];
		active: K;
		onselect?: (key: K) => void;
		label: string;
		dark?: boolean;
	} = $props();

	const base =
		'inline-flex min-h-10 items-center gap-2 rounded-(--radius-control) px-3.5 text-sm font-semibold whitespace-nowrap transition-colors';
	const on = $derived(dark ? 'bg-brand-500 text-black' : 'bg-night text-white');
	const off = $derived(
		dark ? 'text-stone-300 hover:bg-night-2 hover:text-white' : 'text-ink hover:bg-quiet'
	);
</script>

<div
	class="inline-flex max-w-full gap-1 overflow-x-auto rounded-(--radius-card) p-1 {dark
		? 'bg-night-2'
		: 'border border-line bg-surface'}"
	role="tablist"
	aria-label={label}
>
	{#each tabs as tab (tab.key)}
		{@const selected = tab.key === active}
		{#snippet inner()}
			{#if tab.icon}<Icon name={tab.icon} class="size-4" />{/if}
			{tab.label}
			{#if tab.count != null}<span class="count {selected ? 'bg-black/15' : ''}">{tab.count}</span
				>{/if}
		{/snippet}
		{#if tab.href}
			<a
				href={tab.href}
				role="tab"
				aria-selected={selected}
				class="{base} {selected ? on : off}"
				data-sveltekit-noscroll
				data-sveltekit-replacestate>{@render inner()}</a
			>
		{:else}
			<button
				type="button"
				role="tab"
				aria-selected={selected}
				class="{base} {selected ? on : off}"
				onclick={() => onselect?.(tab.key)}>{@render inner()}</button
			>
		{/if}
	{/each}
</div>
