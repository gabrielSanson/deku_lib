<script lang="ts">
	import { useTexts } from '#lib/texts/context.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	// The warnings staff must see before anything else on the dashboard.
	let {
		setupPending,
		isAdmin,
		ifoodAlerts,
		ifoodLate,
		unpaid,
		dead,
		systemAlerts = [],
		simple = false
	}: {
		setupPending: boolean;
		isAdmin: boolean;
		ifoodAlerts: string[];
		ifoodLate: number;
		unpaid: number;
		dead: number;
		/** Open watchdog alerts (worker stopped, no orders, backups…). */
		systemAlerts?: { kind: string; detail: Record<string, unknown> }[];
		/** The simple staff area has no Caixa do dia; unpaid orders are found in Pedidos. */
		simple?: boolean;
	} = $props();
	const t = useTexts();
	const ALERT_TITLE: Record<string, TextKey> = {
		worker_down: 'alert.workerDown.title',
		no_orders: 'alert.noOrders.title',
		ifood_poll: 'alert.ifoodPoll.title',
		backup_stale: 'alert.backupStale.title',
		fiscal_errors: 'alert.fiscalErrors.title',
		disk: 'alert.disk.title'
	};
	const vars = (detail: Record<string, unknown>) =>
		Object.fromEntries(Object.entries(detail).map(([k, v]) => [k, String(v ?? '')]));
</script>

{#each systemAlerts as alert (alert.kind)}
	<div class="flex flex-wrap items-center justify-between gap-3 alert-error" role="alert">
		<strong>{t(ALERT_TITLE[alert.kind] ?? 'alert.test.title', vars(alert.detail))}</strong>
		{#if isAdmin}
			<a class="btn-secondary min-h-9" href="/staff/settings/system">{t('alerts.system')}</a>
		{/if}
	</div>
{/each}
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
			<a class="btn-secondary min-h-9" href="/staff/settings/ifood">{t('alerts.details')}</a>
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
	<a href={simple ? '/staff/orders' : '/staff/reconciliation'} class="block alert-warn">
		{t('alerts.unpaid', { n: unpaid })}
	</a>
{/if}
{#if dead > 0}
	<p class="alert-error">
		{t('alerts.dead', { n: dead })}
	</p>
{/if}
