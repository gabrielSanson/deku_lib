<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import StatusPill from '#lib/components/atoms/StatusPill.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const b = $derived(data.backups);
	const a = $derived(data.alerts);

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

	// "Receber alertas neste aparelho": subscribe this browser to the shop's push key.
	let device = $state<'idle' | 'busy' | 'done' | 'blocked' | 'unsupported'>('idle');
	let sub = $state({ endpoint: '', p256dh: '', auth: '' });
	let subForm = $state<HTMLFormElement>();
	function keyBytes(base64url: string) {
		const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
			.replace(/-/g, '+')
			.replace(/_/g, '/');
		return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
	}
	async function subscribeDevice() {
		if (!data.pushKey || !('serviceWorker' in navigator)) {
			device = 'unsupported';
			return;
		}
		device = 'busy';
		try {
			if ((await Notification.requestPermission()) !== 'granted') {
				device = 'blocked';
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const s =
				(await reg.pushManager.getSubscription()) ??
				(await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: keyBytes(data.pushKey)
				}));
			const json = s.toJSON();
			sub = { endpoint: s.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' };
			await tick();
			subForm?.requestSubmit();
		} catch {
			device = 'unsupported';
		}
	}

	const rows = $derived([
		{
			label: t('system.lastDump'),
			run: b.lastDump,
			bad: b.dumpStale || (b.lastDump !== null && !b.lastDump.ok)
		},
		{ label: t('system.lastOffsite'), run: b.lastOffsite, bad: b.offsiteStale },
		{
			label: t('system.lastRestore'),
			run: b.lastRestoreTest,
			bad: b.restoreStale || (b.lastRestoreTest !== null && !b.lastRestoreTest.ok)
		}
	]);
	function stateLabel(run: (typeof rows)[number]['run'], bad: boolean) {
		if (!run) return t('system.never');
		if (!run.ok) return t('system.failed');
		return bad ? t('system.late') : t('system.ok');
	}
	const mb = (bytes: number | null) =>
		bytes === null ? '' : t('system.size', { size: (bytes / 1_048_576).toFixed(1) });
</script>

<svelte:head><title>{t('system.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('system.title')}</h1>

	<section class="space-y-3 card p-4" aria-labelledby="open-title">
		<h2 id="open-title" class="font-semibold">{t('system.open')}</h2>
		{#if data.open.length}
			<ul class="space-y-2">
				{#each data.open as alert (alert.kind)}
					<li class="alert-error">
						<strong>{t(ALERT_TITLE[alert.kind], vars(alert.detail))}</strong>
						<span class="text-sm">
							{t('system.since', { time: formatDateTime(alert.openedAt) })}</span
						>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-muted">{t('system.noneOpen')}</p>
		{/if}
	</section>

	<SettingsSection
		title={t('system.alerts')}
		hint={t('system.alertsHint')}
		action="?/save"
		saveLabel={t('settings.save')}
		saved={form && 'saved' in form ? t('system.saved') : undefined}
		warning={data.smtp ? null : t('system.noSmtp')}
	>
		<TextField
			label={t('system.emails')}
			name="emailTo"
			type="text"
			autocomplete="off"
			value={a.emailTo.join(', ')}
		/>
		<Checkbox label={t('system.push')} name="pushEnabled" checked={a.pushEnabled} />
		<Checkbox label={t('system.noOrders')} name="noOrdersEnabled" checked={a.noOrdersEnabled} />
		<TextField
			label={t('system.noOrdersMinutes')}
			name="noOrdersMinutes"
			type="number"
			min={15}
			max={240}
			value={a.noOrdersMinutes}
			required
		/>
		<Checkbox
			label={t('summary.enabled')}
			name="dailySummaryEnabled"
			checked={a.dailySummaryEnabled ?? true}
		/>
		<TextField
			label={t('summary.whatsapp')}
			name="ownerWhatsapp"
			type="tel"
			autocomplete="off"
			value={a.ownerWhatsapp ?? ''}
		/>
		<FormError message={form && 'error' in form ? form.error : undefined} />
	</SettingsSection>

	<section class="flex flex-wrap items-center gap-3 card p-4">
		<button
			type="button"
			class="btn-secondary"
			disabled={device === 'busy'}
			onclick={subscribeDevice}>{t('system.device')}</button
		>
		<form method="POST" action="?/test" use:enhance>
			<button class="btn-ghost">{t('system.test')}</button>
		</form>
		<form method="POST" action="?/subscribe" bind:this={subForm} use:enhance class="hidden">
			<input type="hidden" name="endpoint" value={sub.endpoint} />
			<input type="hidden" name="p256dh" value={sub.p256dh} />
			<input type="hidden" name="auth" value={sub.auth} />
		</form>
		<div class="w-full text-sm" aria-live="polite">
			{#if form && 'subscribed' in form}
				<p class="alert-ok">{t('system.deviceDone')}</p>
			{:else if device === 'blocked'}
				<p class="alert-warn">{t('system.deviceBlocked')}</p>
			{:else if device === 'unsupported'}
				<p class="alert-warn">{t('system.deviceUnsupported')}</p>
			{/if}
			{#if form && 'tested' in form && form.tested}
				<p class="alert-ok">{t('system.testSent', form.tested)}</p>
			{:else if form && 'testError' in form}
				<p class="alert-error">{form.testError}</p>
			{/if}
		</div>
	</section>

	<section class="space-y-3 card p-4" aria-labelledby="backups-title">
		<h2 id="backups-title" class="font-semibold">{t('system.backups')}</h2>
		<p class="text-sm text-muted">{t('system.backupsHint')}</p>
		<ul class="divide-y divide-line">
			{#each rows as row (row.label)}
				<li class="flex flex-wrap items-center justify-between gap-2 py-2">
					<div>
						<p class="font-medium">{row.label}</p>
						{#if row.run}
							<p class="text-sm text-muted">
								{formatDateTime(row.run.at)}
								{#if row.run.bytes}· {mb(row.run.bytes)}{/if}
								{#if typeof row.run.detail.orders === 'number'}
									· {t('system.orders', { count: row.run.detail.orders })}
								{/if}
							</p>
							{#if row.run.error}<p class="text-sm text-bad">{row.run.error}</p>{/if}
						{/if}
					</div>
					<StatusPill tone={row.bad ? 'bad' : 'ok'} label={stateLabel(row.run, row.bad)} />
				</li>
			{/each}
		</ul>
	</section>

	{#if !b.offsiteConfigured || b.offsiteStale}
		<section class="space-y-2 card p-4" aria-labelledby="offsite-title">
			<h2 id="offsite-title" class="font-semibold">{t('system.setupTitle')}</h2>
			<ol class="list-decimal space-y-1 pl-5 text-sm">
				<li>{t('system.setup1')}</li>
				<li>{t('system.setup2')}</li>
				<li>{t('system.setup3')}</li>
				<li>{t('system.setup4')}</li>
			</ol>
		</section>
	{/if}
</div>
