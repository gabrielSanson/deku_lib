<script lang="ts">
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';
	import StatusPill from '#lib/components/atoms/StatusPill.svelte';
	import { enhance } from '$app/forms';
	import { formatDateTime } from '#lib/domain/time.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';

	let { data, form } = $props();
	const s = $derived(data.settings);
	let enabled = $derived(data.settings.enabled);
	const t = useTexts();
	const READY_LABEL: Record<string, TextKey> = {
		cnpj: 'fiscal.ready.cnpj',
		token: 'fiscal.ready.token',
		environment: 'fiscal.ready.environment',
		ncm: 'fiscal.ready.ncm',
		crt: 'fiscal.ready.crt',
		ibsCbs: 'fiscal.ready.ibsCbs',
		homologation: 'fiscal.ready.homologation'
	};
	const STATE: Record<string, { tone: 'ok' | 'warn' | 'bad'; label: TextKey }> = {
		ok: { tone: 'ok', label: 'fiscal.ready.ok' },
		warn: { tone: 'warn', label: 'fiscal.ready.warn' },
		missing: { tone: 'bad', label: 'fiscal.ready.missing' }
	};
</script>

<svelte:head><title>{t('fiscal.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('fiscal.title')}</h1>
	<p class="alert-warn">
		{t('fiscal.warning')}
	</p>
	{#if !data.canStoreSecrets}
		<p class="alert-error">
			{t('fiscal.noSecret')}
		</p>
	{/if}

	<section class="space-y-3 card p-4" aria-labelledby="ready-title">
		<h2 id="ready-title" class="font-semibold">{t('fiscal.ready.title')}</h2>
		<ul class="divide-y divide-line">
			{#each data.readiness as item (item.key)}
				<li class="flex items-center justify-between gap-2 py-2 text-sm">
					<span>{t(READY_LABEL[item.key])}</span>
					<StatusPill tone={STATE[item.state].tone} label={t(STATE[item.state].label)} />
				</li>
			{/each}
		</ul>
		{#if s.environment === 'homologacao'}
			<form method="POST" action="?/test" use:enhance class="flex flex-wrap items-center gap-3">
				<button class="btn-secondary">{t('fiscal.ready.test')}</button>
				<span class="text-xs text-muted">{t('fiscal.ready.testHint')}</span>
			</form>
		{/if}
		{#if form && 'test' in form && form.test}
			<p class={form.test.status === 'authorized' ? 'alert-ok' : 'alert-error'} role="status">
				{form.test.status === 'authorized'
					? t('fiscal.ready.testOk')
					: t('fiscal.ready.testFailed', { message: form.test.message ?? '' })}
			</p>
		{/if}
	</section>

	{#if data.contingency}
		<p class="alert-warn" role="status">{t('fiscal.contingency', { n: data.contingency })}</p>
	{/if}

	<section class="space-y-3 card p-4" aria-labelledby="export-title">
		<h2 id="export-title" class="font-semibold">{t('fiscal.export.title')}</h2>
		<p class="text-sm text-muted">{t('fiscal.export.intro')}</p>
		<form
			method="GET"
			action="/staff/settings/fiscal/export"
			class="flex flex-wrap items-end gap-2"
		>
			<TextField label={t('fiscal.export.month')} name="mes" type="month" value={data.lastMonth} />
			<button class="btn-secondary">{t('fiscal.export.download')}</button>
		</form>
		<form method="POST" action="?/accountant" use:enhance class="flex flex-wrap items-end gap-2">
			<TextField
				label={t('fiscal.export.accountant')}
				name="email"
				type="email"
				value={data.accountantEmail ?? ''}
			/>
			<button class="btn-secondary">{t('settings.save')}</button>
			{#if form && 'accountantOk' in form}<span class="text-sm text-ok" role="status"
					>✓ {t('fiscal.saved')}</span
				>{/if}
		</form>
	</section>

	{#if data.failed.length}
		<section class="space-y-3 card p-4" aria-labelledby="failed-title">
			<h2 id="failed-title" class="font-semibold">{t('fiscal.failed.title')}</h2>
			<ul class="divide-y divide-line">
				{#each data.failed as note (note.orderId)}
					<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
						<div>
							<a class="font-medium underline" href="/staff/orders/{note.orderId}"
								>{t('fiscal.failed.order', { number: note.orderNumber })}</a
							>
							<span class="text-muted">· {formatDateTime(note.at)}</span>
							{#if note.message}<p class="text-bad">{note.message}</p>{/if}
						</div>
						<form method="POST" action="?/retry" use:enhance>
							<input type="hidden" name="orderId" value={note.orderId} />
							<button class="btn-ghost min-h-9">{t('fiscal.failed.retry')}</button>
						</form>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<SettingsSection
		title={t('fiscal.section')}
		hint={t('fiscal.sectionHint')}
		action="?/save"
		saveLabel={t('settings.save')}
		saved={form?.ok ? t('fiscal.saved') : undefined}
	>
		<Checkbox label={t('fiscal.enabled')} name="enabled" bind:checked={enabled} />
		<SelectField label={t('fiscal.environment')} name="environment" value={s.environment}>
			<option value="homologacao">{t('fiscal.homologacao')}</option>
			<option value="producao">{t('fiscal.producao')}</option>
		</SelectField>
		<div class="grid gap-3 sm:grid-cols-2">
			<TextField
				label={t('fiscal.cnpj')}
				name="cnpj"
				value={s.cnpj ?? ''}
				inputmode="numeric"
				placeholder="00.000.000/0001-00"
			/>
			<TextField
				label={t('fiscal.token')}
				name="token"
				type="password"
				autocomplete="off"
				placeholder={s.hasToken ? t('fiscal.tokenSaved') : t('fiscal.tokenPaste')}
			/>
		</div>
		<div class="grid gap-3 sm:grid-cols-3">
			<TextField
				label={t('fiscal.ncm')}
				name="defaultNcm"
				value={s.defaultNcm ?? ''}
				inputmode="numeric"
				placeholder={t('fiscal.ncmPlaceholder')}
			/>
			<TextField label={t('fiscal.cfop')} name="defaultCfop" value={s.defaultCfop} />
			<TextField label={t('fiscal.csosn')} name="defaultCsosn" value={s.defaultCsosn} />
		</div>
		<p class="text-xs text-muted">
			{t('fiscal.ncmHint')}
		</p>
	</SettingsSection>

	{#if data.confirmYear}
		<p class="alert-warn" role="alert">{t('fiscal.tax.confirm', { year: data.confirmYear })}</p>
	{/if}

	<SettingsSection
		title={t('fiscal.tax.section')}
		hint={t('fiscal.tax.hint')}
		action="?/saveTax"
		saveLabel={t('settings.save')}
		saved={form && 'taxOk' in form ? t('fiscal.saved') : undefined}
	>
		<SelectField label={t('fiscal.tax.crt')} name="crt" value={s.crt}>
			<option value="1">{t('fiscal.tax.crt1')}</option>
			<option value="2">{t('fiscal.tax.crt2')}</option>
			<option value="3">{t('fiscal.tax.crt3')}</option>
			<option value="4">{t('fiscal.tax.crt4')}</option>
		</SelectField>
		<Checkbox label={t('fiscal.tax.enabled')} name="ibsCbsEnabled" checked={s.ibsCbsEnabled} />
		<div class="grid gap-3 sm:grid-cols-2">
			<TextField
				label={t('fiscal.tax.cst')}
				name="ibsCbsCst"
				value={s.ibsCbsCst}
				inputmode="numeric"
				maxlength={3}
			/>
			<TextField
				label={t('fiscal.tax.class')}
				name="ibsCbsClass"
				value={s.ibsCbsClass}
				inputmode="numeric"
				maxlength={6}
			/>
		</div>
		<p class="text-xs text-muted">{t('fiscal.tax.accountant')}</p>
	</SettingsSection>

	<SettingsSection
		title={t('fiscal.rates.section')}
		hint={t('fiscal.rates.hint')}
		action="?/saveRates"
		saveLabel={t('fiscal.rates.save')}
		saved={form && 'ratesOk' in form ? t('fiscal.saved') : undefined}
	>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[36rem] text-sm">
				<thead>
					<tr class="text-left text-muted">
						<th class="py-1 pr-2 font-medium">{t('fiscal.rates.year')}</th>
						<th class="py-1 pr-2 font-medium">{t('fiscal.rates.cbs')}</th>
						<th class="py-1 pr-2 font-medium">{t('fiscal.rates.ibsUf')}</th>
						<th class="py-1 pr-2 font-medium">{t('fiscal.rates.ibsMun')}</th>
						<th class="py-1 font-medium">{t('fiscal.rates.note')}</th>
					</tr>
				</thead>
				<tbody>
					{#each [...data.rates, null] as r, i (r?.year ?? 'new')}
						<tr>
							<td class="py-1 pr-2">
								<TextField
									label={t('fiscal.rates.year')}
									hideLabel
									id="rate-year-{i}"
									name="year"
									inputmode="numeric"
									value={r?.year ?? ''}
									readonly={r !== null}
								/>
							</td>
							<td class="py-1 pr-2">
								<TextField
									label={t('fiscal.rates.cbs')}
									hideLabel
									id="rate-cbs-{i}"
									name="cbsRate"
									inputmode="decimal"
									value={r?.cbsRate ?? ''}
								/>
							</td>
							<td class="py-1 pr-2">
								<TextField
									label={t('fiscal.rates.ibsUf')}
									hideLabel
									id="rate-uf-{i}"
									name="ibsUfRate"
									inputmode="decimal"
									value={r?.ibsUfRate ?? ''}
								/>
							</td>
							<td class="py-1 pr-2">
								<TextField
									label={t('fiscal.rates.ibsMun')}
									hideLabel
									id="rate-mun-{i}"
									name="ibsMunRate"
									inputmode="decimal"
									value={r?.ibsMunRate ?? ''}
								/>
							</td>
							<td class="py-1">
								<TextField
									label={t('fiscal.rates.note')}
									hideLabel
									id="rate-note-{i}"
									name="note"
									value={r?.note ?? ''}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</SettingsSection>
	<FormError message={form?.error} />
</div>
