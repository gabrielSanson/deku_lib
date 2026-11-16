<script lang="ts">
	import { enhance } from '$app/forms';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import type { CouponBenefit } from '#lib/domain/campaigns.ts';
	import { formatBRL } from '#lib/domain/money.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const byKey = $derived(Object.fromEntries(data.programmes.map((p) => [p.template, p])));
	type Params = {
		every?: number;
		couponDays?: number;
		benefit?: CouponBenefit;
		reward?: CouponBenefit;
	};
	const params = (k: string) => (byKey[k]?.params ?? {}) as Params;
	const value = (b: CouponBenefit | undefined) =>
		!b
			? ''
			: b.type === 'percent'
				? String(b.percent)
				: b.type === 'fixed'
					? formatBRL(b.amountCents).replace(/[R$\s]/g, '')
					: '';
	const titles: Record<string, string> = {
		loyalty_stamps: 'Cartão fidelidade',
		referral: 'Indique um amigo',
		birthday: 'Aniversário'
	};
</script>

<svelte:head><title>{t('loyalty.tabTitle')}</title></svelte:head>

{#snippet benefit(prefix: string, label: string, b: CouponBenefit | undefined)}
	<div class="grid gap-2 sm:grid-cols-2">
		<SelectField
			{label}
			name="{prefix}Type"
			value={b?.type ?? 'percent'}
			options={[
				{ value: 'percent', label: t('loyalty.percent') },
				{ value: 'fixed', label: t('loyalty.fixed') },
				{ value: 'free_delivery', label: t('loyalty.freeDelivery') }
			]}
		/>
		<TextField
			label={t('loyalty.value')}
			name="{prefix}Value"
			value={value(b)}
			inputmode="decimal"
		/>
	</div>
{/snippet}

<main class="mx-auto max-w-3xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="page-title">{t('loyalty.title')}</h1>
		<a class="btn-ghost" href="/staff/campaigns">{t('campaign.back')}</a>
	</div>
	<p class="text-sm text-muted">{t('loyalty.intro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />

	{#each ['loyalty_stamps', 'referral', 'birthday'] as key (key)}
		{@const p = params(key)}
		<form method="POST" action="?/save" use:enhance class="space-y-3 card p-4">
			<input type="hidden" name="template" value={key} />
			<div class="flex items-center justify-between gap-2">
				<h2 class="font-semibold">{titles[key]}</h2>
				<Checkbox label={t('loyalty.on')} name="active" checked={byKey[key]?.active ?? false} />
			</div>
			{#if key === 'loyalty_stamps'}
				<TextField
					label={t('loyalty.every')}
					name="every"
					type="number"
					min={2}
					max={50}
					value={String(p.every ?? 10)}
				/>
				{@render benefit('b', t('loyalty.benefit'), p.benefit)}
			{:else if key === 'referral'}
				{@render benefit('b', t('loyalty.welcome'), p.benefit)}
				{@render benefit('r', t('loyalty.reward'), p.reward)}
			{:else}
				{@render benefit('b', t('loyalty.benefit'), p.benefit)}
			{/if}
			{#if key !== 'birthday'}
				<TextField
					label={t('loyalty.days')}
					name="couponDays"
					type="number"
					min={1}
					max={365}
					value={String(p.couponDays ?? 30)}
				/>
			{/if}
			{#if form && 'template' in form && form.template === key}
				<p class="alert-ok" role="status">{form.ok}</p>
			{/if}
			<button class="btn-primary">{t('loyalty.save')}</button>
		</form>
	{/each}
</main>
