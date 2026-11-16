<script lang="ts">
	import { enhance } from '$app/forms';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextArea from '#lib/components/molecules/TextArea.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { formatDateTime } from '#lib/domain/time.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
</script>

<svelte:head><title>{t('marketing.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-3xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="page-title">{t('marketing.title')}</h1>
		<a class="btn-ghost" href="/staff/campaigns">{t('campaign.back')}</a>
	</div>
	<p class="text-sm text-muted">{t('marketing.intro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'ok' in form && typeof form.ok === 'string' && form.ok !== 'OK'}
		<p class="alert-ok" role="status">{form.ok}</p>
	{/if}

	<form method="GET" class="grid gap-3 card p-4 sm:grid-cols-3">
		<SelectField
			label={t('marketing.channel')}
			name="canal"
			value={data.channel}
			options={[
				{ value: 'email', label: t('marketing.email') },
				{ value: 'whatsapp', label: t('marketing.whatsapp') }
			]}
		/>
		<SelectField
			label={t('marketing.audience')}
			name="filtro"
			value={data.audience.filter}
			options={data.filters.map((f) => ({
				value: f,
				label: t(`customers.filter.${f}` as TextKey)
			}))}
		/>
		<SelectField
			label={t('customers.source')}
			name="origem"
			value={data.audience.source}
			options={[
				{ value: '', label: t('customers.source.any') },
				...data.sources.map((s) => ({ value: s, label: t(`customers.source.${s}` as TextKey) }))
			]}
		/>
		<div class="sm:col-span-3">
			<button class="btn-ghost">{t('marketing.preview')}</button>
		</div>
	</form>

	<section class="space-y-1 card p-4 text-sm">
		<p class="font-semibold">{t('marketing.count', { count: data.reach.count })}</p>
		{#if data.channel === 'whatsapp'}
			<p>
				{t('marketing.cost', {
					cost: formatBRL(data.reach.costCents),
					price: formatBRL(data.reach.priceCents)
				})}
			</p>
			<form method="POST" action="?/price" use:enhance class="flex flex-wrap items-end gap-2">
				<TextField
					label={t('marketing.price')}
					name="price"
					value={formatBRL(data.reach.priceCents).replace(/[R$\s]/g, '')}
					inputmode="decimal"
				/>
				<button class="btn-ghost">{t('loyalty.save')}</button>
			</form>
		{/if}
	</section>

	<form method="POST" action="?/send" use:enhance class="space-y-3 card p-4">
		<input type="hidden" name="channel" value={data.channel} />
		<input type="hidden" name="filtro" value={data.audience.filter} />
		<input type="hidden" name="origem" value={data.audience.source} />
		{#if data.channel === 'whatsapp'}
			<TextField label={t('marketing.template')} name="template" required />
		{:else}
			<TextField label={t('marketing.subject')} name="subject" maxlength={120} required />
			<TextArea label={t('marketing.body')} name="body" rows={6} maxlength={2000} required />
		{/if}
		<Checkbox label={t('marketing.confirm')} name="confirm" required />
		<button class="btn-primary" disabled={data.reach.count === 0}>{t('marketing.send')}</button>
	</form>

	{#if data.sends.length}
		<section class="space-y-2 card p-4">
			<h2 class="font-semibold">{t('marketing.history')}</h2>
			<ul class="divide-y divide-line text-sm">
				{#each data.sends as s (s.id)}
					<li class="flex flex-wrap justify-between gap-2 py-2">
						<span>{s.subject ?? s.template} · {s.channel}</span>
						<span class="text-muted">{formatDateTime(s.created_at)}</span>
						<span
							>{t('marketing.historyLine', {
								count: s.recipients,
								sent: s.sent,
								failed: s.failed
							})}</span
						>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>
