<script lang="ts">
	import { page } from '$app/state';
	import SegmentedTabs from '#lib/components/molecules/SegmentedTabs.svelte';
	import { activeHref, SETTINGS_LINKS } from '#lib/staff/nav.ts';

	// Configurações: the settings pages share one sub-menu, reached from the "Gestão" group.
	let { data, children } = $props();
	const current = $derived(activeHref([{ label: '', links: SETTINGS_LINKS }], page.url.pathname));
</script>

<div class="mx-auto max-w-4xl space-y-5 p-4">
	{#if data.staff.role !== 'admin'}
		<p class="alert-error">Apenas admins.</p>
	{:else}
		<SegmentedTabs
			label="Configurações"
			active={current ?? SETTINGS_LINKS[0].href}
			tabs={SETTINGS_LINKS.map((l) => ({
				key: l.href,
				label: l.label,
				icon: l.icon,
				href: l.href
			}))}
		/>
		{@render children()}
	{/if}
</div>
