<script lang="ts">
	import { useTexts } from '#lib/texts/context.ts';
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import IfoodConnect, { type IfoodProblem } from '#lib/components/organisms/IfoodConnect.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';
	import TextField from '#lib/components/molecules/TextField.svelte';

	let { data, form } = $props();
	const s = $derived(data.ifood.summary);
	const statusClass: Record<string, string> = {
		processed: 'text-ok',
		sent: 'text-ok',
		ignored: 'text-muted',
		skipped: 'text-muted',
		received: 'text-warn',
		pending: 'text-warn',
		failed: 'text-bad font-semibold',
		dead: 'text-bad font-semibold'
	};
	const t = useTexts();
	const link = $derived(
		form && 'link' in form
			? (form.link as { userCode: string; verificationUrl: string })
			: data.connection.linkUserCode
				? { userCode: data.connection.linkUserCode, verificationUrl: '' }
				: null
	);
	const problem = $derived(
		form && 'ifoodProblem' in form ? (form.ifoodProblem as IfoodProblem) : null
	);
</script>

<svelte:head><title>{t('integrations.tabTitle')}</title></svelte:head>

<div class="space-y-6">
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'ok' in form && typeof form.ok === 'string'}<p class="alert-ok">{form.ok}</p>{/if}

	<section class="space-y-3 card p-4">
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-lg font-bold">iFood</h2>
			<span
				class="rounded-full px-3 py-1 text-xs font-semibold {data.ifood.enabled
					? 'bg-ok/15 text-ok'
					: 'bg-line text-muted'}"
				>{data.ifood.enabled ? t('integrations.on') : t('integrations.off')}</span
			>
		</div>
		{#if data.appAvailable}
			<div class="space-y-2 rounded-lg border border-line p-3">
				<h3 class="font-semibold">{t('ifoodLink.title')}</h3>
				{#if data.connection.linked}
					<p class="text-sm">
						{t('ifoodLink.linked', {
							date: data.connection.linkedAt ? formatDateTime(data.connection.linkedAt) : ''
						})}
						{data.connection.merchantId ?? ''}
					</p>
					<form method="POST" action="?/ifoodUnlink" use:enhance>
						<button class="btn-ghost">{t('ifoodLink.unlink')}</button>
					</form>
				{:else}
					<p class="text-sm text-muted">{t('ifoodLink.intro')}</p>
					{#if link}
						<p class="text-sm">{t('ifoodLink.code')}</p>
						<p class="text-2xl font-black tracking-widest">{link.userCode}</p>
						{#if link.verificationUrl}
							<a class="underline" href={link.verificationUrl} target="_blank" rel="noopener"
								>{t('ifoodLink.open')}</a
							>
						{/if}
						<form method="POST" action="?/ifoodLinkFinish" class="flex flex-wrap items-end gap-2">
							<TextField
								label={t('ifoodLink.authCode')}
								name="authorizationCode"
								required
								wrapClass="flex-1"
							/>
							<button class="btn-primary">{t('ifoodLink.finish')}</button>
						</form>
					{:else}
						<form method="POST" action="?/ifoodLinkStart" use:enhance>
							<button class="btn-primary">{t('ifoodLink.start')}</button>
						</form>
					{/if}
				{/if}
				<p class="text-xs text-muted">{t('ifoodLink.portalTip')}</p>
			</div>
			<details>
				<summary class="cursor-pointer text-sm font-semibold">{t('ifoodLink.advanced')}</summary>
				<div class="pt-3">
					<IfoodConnect
						ifood={data.connection}
						{problem}
						canStoreSecrets={data.canStoreSecrets}
						webhookUrl={data.webhookUrl}
					/>
				</div>
			</details>
		{:else}
			<IfoodConnect
				ifood={data.connection}
				{problem}
				canStoreSecrets={data.canStoreSecrets}
				webhookUrl={data.webhookUrl}
			/>
		{/if}
	</section>

	{#if data.ifood.enabled}
		<section class="space-y-3 card p-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="text-lg font-bold">{t('ifoodSync.title')}</h2>
				<form method="POST" action="?/menuSync" use:enhance>
					<button class="btn-secondary">{t('ifoodSync.now')}</button>
				</form>
			</div>
			<p class="text-sm text-muted">{t('ifoodSync.intro')}</p>
			<ul class="space-y-2 text-sm">
				{#each data.syncReports as r (r.id)}
					<li>
						<span class="text-muted">{formatDateTime(r.started_at)}</span>
						{#if !r.finished_at}
							{t('ifoodSync.running')}
						{:else if r.error}
							<span class="text-bad">{r.error}</span>
						{:else}
							{t('ifoodSync.report', {
								created: r.created,
								updated: r.updated,
								failed: r.failed.length
							})}
						{/if}
						{#each r.failed.slice(0, 5) as f (f.sku)}
							<div class="text-xs text-bad">{f.sku}: {f.reason}</div>
						{/each}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="space-y-3 card p-4">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-lg font-bold">{t('ifoodHomolog.title')}</h2>
			<form method="POST" action="?/ifoodHomologation" use:enhance>
				<input type="hidden" name="on" value={data.connection.homologation ? '0' : '1'} />
				<button class="btn-secondary"
					>{data.connection.homologation ? t('ifoodHomolog.off') : t('ifoodHomolog.on')}</button
				>
			</form>
		</div>
		<p class="text-sm text-muted">{t('ifoodHomolog.intro')}</p>
		{#if data.connection.homologation}
			<ul class="space-y-1 text-sm">
				{#each data.homologation as c (c.id)}
					<li class="flex items-center gap-2">
						<span class={c.doneAt ? 'text-ok' : 'text-muted'}>{c.doneAt ? '✓' : '○'}</span>
						{t(`ifoodHomolog.case.${c.id}`)}
						{#if c.doneAt}<span class="text-xs text-muted">{formatDateTime(c.doneAt)}</span>{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="space-y-3 card p-4">
		<h2 class="text-lg font-bold">{t('integrations.health')}</h2>
		{#each data.ifoodAlerts as alert, i (i)}
			<p class="alert-error" role="alert">{alert}</p>
		{/each}
		{#if !data.ifood.enabled}
			<p class="text-sm">
				{t('integrations.ifoodOff')}
			</p>
		{/if}
		<p class="text-sm">
			{#if data.ifood.status.lastPollOkAt}
				{t('integrations.lastPoll', { time: formatDateTime(data.ifood.status.lastPollOkAt) })}
			{/if}
		</p>
		<dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
			<div>
				<dt class="text-muted">{t('integrations.lastEvent')}</dt>
				<dd>{s.last_event ? formatDateTime(s.last_event) : '—'}</dd>
			</div>
			<div>
				<dt class="text-muted">{t('integrations.lastPollEvent')}</dt>
				<dd>{s.last_poll_event ? formatDateTime(s.last_poll_event) : '—'}</dd>
			</div>
			<div>
				<dt class="text-muted">{t('integrations.today')}</dt>
				<dd>{s.today}</dd>
			</div>
			<div>
				<dt class="text-muted">{t('integrations.waiting')}</dt>
				<dd class={s.waiting ? 'font-semibold text-warn' : ''}>{s.waiting}</dd>
			</div>
			<div>
				<dt class="text-muted">{t('integrations.failed')}</dt>
				<dd class={s.failed ? 'font-semibold text-bad' : ''}>{s.failed}</dd>
			</div>
			<div>
				<dt class="text-muted">{t('integrations.dead')}</dt>
				<dd class={s.dead ? 'font-semibold text-bad' : ''}>{s.dead}</dd>
			</div>
		</dl>

		<h3 class="pt-2 font-semibold">{t('integrations.outbound')}</h3>
		{#if data.ifood.outbound.length === 0}
			<p class="text-sm text-muted">{t('integrations.noOutbound')}</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-left text-muted"
						><tr
							><th class="py-1">{t('integrations.col.order')}</th><th
								>{t('integrations.col.action')}</th
							><th>{t('integrations.col.status')}</th><th>{t('integrations.col.attempts')}</th><th
							></th></tr
						></thead
					>
					<tbody>
						{#each data.ifood.outbound as o (o.id)}
							<tr class="border-t border-line align-top">
								<td class="py-1"
									><a class="underline" href="/staff/orders/{o.order_id}">#{o.order_number}</a></td
								>
								<td>{o.action}</td>
								<td class={statusClass[o.status]}
									>{o.status}{#if o.last_error}<br /><span class="text-xs font-normal text-muted"
											>{o.last_error}</span
										>{/if}</td
								>
								<td>{o.attempts}</td>
								<td>
									{#if o.status === 'failed'}
										<form method="POST" action="?/retry" use:enhance>
											<input type="hidden" name="id" value={o.id} /><button
												class="btn-secondary min-h-9 px-3 text-xs">{t('integrations.retry')}</button
											>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<h3 class="pt-2 font-semibold">{t('integrations.events')}</h3>
		{#if data.ifood.events.length === 0}
			<p class="text-sm text-muted">{t('integrations.noEvents')}</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-left text-muted"
						><tr
							><th class="py-1">{t('integrations.col.when')}</th><th
								>{t('integrations.col.type')}</th
							><th>{t('integrations.col.via')}</th><th>{t('integrations.col.status')}</th><th
							></th></tr
						></thead
					>
					<tbody>
						{#each data.ifood.events as e (e.id)}
							<tr class="border-t border-line align-top">
								<td class="py-1 whitespace-nowrap">{formatDateTime(e.received_at)}</td>
								<td>{e.event_type}</td>
								<td>{e.delivery_method}</td>
								<td class={statusClass[e.processing_status]}
									>{e.processing_status}{#if e.error}<br /><span
											class="text-xs font-normal text-muted">{e.error}</span
										>{/if}</td
								>
								<td>
									{#if e.processing_status === 'failed' || e.processing_status === 'dead' || e.processing_status === 'ignored'}
										<form method="POST" action="?/replay" use:enhance>
											<input type="hidden" name="id" value={e.id} /><button
												class="btn-secondary min-h-9 px-3 text-xs"
												>{t('integrations.replay')}</button
											>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
