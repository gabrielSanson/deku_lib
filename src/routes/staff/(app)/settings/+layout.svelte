<script lang="ts">
	import { page } from '$app/state';

	let { data, children } = $props();
	const tabs = [
		{ href: '/staff/settings/store', label: 'Loja' },
		{ href: '/staff/settings/delivery', label: 'Entrega' },
		{ href: '/staff/settings/staff', label: 'Equipe' },
		{ href: '/staff/settings/integrations', label: 'Integrações' }
	];
</script>

<div class="mx-auto max-w-4xl p-4">
	<nav class="mb-4 flex gap-1 border-b border-line" aria-label="Configurações">
		{#each tabs as t (t.href)}
			<a
				href={t.href}
				class="-mb-px border-b-2 px-4 py-2 text-sm font-medium {page.url.pathname.startsWith(t.href)
					? 'border-brand-600 text-brand-700'
					: 'border-transparent text-muted'}">{t.label}</a
			>
		{/each}
	</nav>
	{#if data.staff.role !== 'owner' && data.staff.role !== 'manager'}
		<p class="alert-error">Apenas gerente ou dono.</p>
	{:else}
		{@render children()}
	{/if}
</div>
