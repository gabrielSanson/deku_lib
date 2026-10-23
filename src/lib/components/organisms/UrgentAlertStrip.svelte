<script lang="ts">
	import { useTexts } from '#lib/texts/context.ts';
	// The warnings staff must see before anything else on the dashboard.
	let {
		setupPending,
		isAdmin,
		ifoodAlerts,
		ifoodLate,
		unpaid,
		dead
	}: {
		setupPending: boolean;
		isAdmin: boolean;
		ifoodAlerts: string[];
		ifoodLate: number;
		unpaid: number;
		dead: number;
	} = $props();
	const t = useTexts();
</script>

{#if setupPending}
	<div class="flex flex-wrap items-center justify-between gap-3 alert-warn">
		<span><strong>{t('alerts.setup')}</strong> {t('alerts.setupHint')}</span>
		<a class="btn-primary min-h-9" href="/staff/setup">{t('alerts.setupCta')}</a>
	</div>
{/if}
{#each ifoodAlerts as alert, i (i)}
	<div class="flex flex-wrap items-center justify-between gap-3 alert-error" role="alert">
		<span><strong>{t('alerts.ifood')}</strong> {alert}</span>
		{#if isAdmin}
			<a class="btn-secondary min-h-9" href="/staff/settings/integrations">{t('alerts.details')}</a>
		{/if}
	</div>
{/each}
{#if ifoodLate > 0}
	<p class="alert-error" role="alert">
		<strong>{t('alerts.ifoodLate', { n: ifoodLate })}</strong>
		{t('alerts.ifoodLateHint')}
	</p>
{/if}
{#if unpaid > 0}
	<a href="/staff/reconciliation" class="block alert-warn">
		{t('alerts.unpaid', { n: unpaid })}
	</a>
{/if}
{#if dead > 0}
	<p class="alert-error">
		{t('alerts.dead', { n: dead })}
	</p>
{/if}
