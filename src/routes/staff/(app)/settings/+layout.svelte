<script lang="ts">
	import { page } from '$app/state';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import SegmentedTabs from '#lib/components/molecules/SegmentedTabs.svelte';
	import { activeHref, SETTINGS_GROUPS, SETUP_HREF } from '#lib/staff/nav.ts';
	import { useTexts } from '#lib/texts/context.ts';

	// Configurações: four groups (Loja, Pedidos, Site, Pagamentos e integrações), each
	// with its own pages. The setup wizard is a link at the top, not a tab.
	let { data, children } = $props();
	const t = useTexts();
	const current = $derived(activeHref(SETTINGS_GROUPS, page.url.pathname));
	const group = $derived(
		SETTINGS_GROUPS.find((g) => g.links.some((l) => l.href === current)) ?? SETTINGS_GROUPS[0]
	);
</script>

<div class="mx-auto max-w-4xl space-y-5 p-4">
	{#if data.staff.role !== 'admin'}
		<p class="alert-error">{t('settings.adminOnly')}</p>
	{:else}
		<div class="space-y-2">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<SegmentedTabs
					label={t('settings.tabs')}
					active={group.label}
					tabs={SETTINGS_GROUPS.map((g) => ({
						key: g.label,
						label: t(g.label),
						href: g.links[0].href
					}))}
				/>
				<a class="btn-ghost min-h-9 text-sm" href={SETUP_HREF}>
					<Icon name="settings" class="size-4" />
					{t('nav.configuracaoInicial')}
				</a>
			</div>
			{#if group.links.length > 1}
				<SegmentedTabs
					label={t(group.label)}
					active={current ?? group.links[0].href}
					tabs={group.links.map((l) => ({
						key: l.href,
						label: t(l.label),
						icon: l.icon,
						href: l.href
					}))}
				/>
			{/if}
		</div>
		{@render children()}
	{/if}
</div>
