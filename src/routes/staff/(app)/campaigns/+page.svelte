<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import ProductImage from '#lib/components/atoms/ProductImage.svelte';
	import StatusPill, { type PillTone } from '#lib/components/atoms/StatusPill.svelte';
	import ConfirmDialog from '#lib/components/molecules/ConfirmDialog.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import RowMenu from '#lib/components/molecules/RowMenu.svelte';
	import SegmentedTabs from '#lib/components/molecules/SegmentedTabs.svelte';
	import StatTile from '#lib/components/molecules/StatTile.svelte';
	import { TEMPLATES, isTemplateKey, type CampaignStatus } from '#lib/domain/campaigns.ts';
	import { formatBRL } from '#lib/domain/money.ts';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();

	// Ending a campaign asks first, in a dialog.
	let ending = $state<{ id: string; name: string } | null>(null);
	let endOpen = $state(false);
	let endForm = $state<HTMLFormElement>();

	const STATUS: Record<CampaignStatus, { label: string; tone: PillTone }> = {
		draft: { label: t('campaigns.status.draft'), tone: 'quiet' },
		active: { label: t('campaigns.status.active'), tone: 'ok' },
		paused: { label: t('campaigns.status.paused'), tone: 'warn' },
		ended: { label: t('campaigns.status.ended'), tone: 'quiet' }
	};
	const templateLabel = (k: string) => (isTemplateKey(k) ? TEMPLATES[k].label : k);
	const ret = (revenue: number, discount: number) =>
		discount > 0 ? `R$ ${(revenue / discount).toFixed(1).replace('.', ',')}` : '—';

	const tabs = $derived(
		[
			{ key: 'todas', label: t('campaigns.tab.all') },
			{ key: 'ativas', label: t('campaigns.tab.active') },
			{ key: 'rascunhos', label: t('campaigns.tab.drafts') },
			{ key: 'encerradas', label: t('campaigns.tab.ended') }
		].map((tab) => ({
			...tab,
			href: `?status=${tab.key}&dias=${data.days}${data.q ? `&q=${encodeURIComponent(data.q)}` : ''}`
		}))
	);
	const periods = [7, 30, 90, 365];
	const periodLabel = $derived(
		data.days === 365 ? t('campaigns.lastYear') : t('campaigns.lastDays', { n: data.days })
	);
</script>

<svelte:head><title>{t('campaigns.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="page-title">{t('campaigns.title')}</h1>
			<p class="mt-1 text-muted">
				{t('campaigns.subtitle')}
			</p>
		</div>
		<a class="btn-primary" href="/staff/campaigns/new">{t('campaigns.new')}</a>
	</div>
	<FormError message={form?.error} />

	<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t('campaigns.summary')}>
		<StatTile
			icon="crown"
			label={t('campaigns.tile.active')}
			value={String(data.totals.active)}
			hint={t('campaigns.tile.now')}
		/>
		<StatTile
			icon="check"
			label={t('campaigns.tile.uses')}
			value={String(data.totals.uses)}
			hint={periodLabel}
		/>
		<StatTile
			icon="tag"
			label={t('campaigns.tile.discount')}
			value={formatBRL(data.totals.discountCents)}
			hint={periodLabel}
		/>
		<StatTile
			icon="users"
			label={t('campaigns.tile.newCustomers')}
			value={String(data.totals.newCustomers)}
			hint={periodLabel}
		/>
	</section>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<SegmentedTabs label={t('campaigns.statusTabs')} active={data.tab} {tabs} />
		<form method="GET" class="flex items-center gap-2">
			<input type="hidden" name="status" value={data.tab} />
			<input type="hidden" name="dias" value={data.days} />
			<div class="relative">
				<Icon
					name="search"
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
				/>
				<input
					class="field min-h-10 w-56 pl-9"
					type="search"
					name="q"
					value={data.q}
					placeholder={t('campaigns.search')}
					aria-label={t('campaigns.search')}
				/>
			</div>
			<select
				class="field min-h-10 w-auto"
				name="dias"
				aria-label={t('campaigns.period')}
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			>
				{#each periods as d (d)}
					<option value={d} selected={data.days === d}
						>{d === 365 ? t('campaigns.periodYear') : t('campaigns.periodDays', { n: d })}</option
					>
				{/each}
			</select>
		</form>
	</div>

	<div class="overflow-x-auto card">
		<table class="w-full text-sm">
			<thead class="bg-quiet text-left text-xs text-muted uppercase">
				<tr>
					<th class="p-3">{t('campaigns.col.campaign')}</th>
					<th class="p-3">{t('campaigns.col.benefit')}</th>
					<th class="p-3">{t('campaigns.col.apply')}</th>
					<th class="p-3">{t('campaigns.col.dates')}</th>
					<th class="p-3 text-right">{t('campaigns.col.uses')}</th>
					<th class="p-3 text-right">{t('campaigns.col.discount')}</th>
					<th class="p-3 text-right">{t('campaigns.col.revenue')}</th>
					<th class="p-3 text-right">{t('campaigns.col.return')}</th>
					<th class="p-3 text-right">{t('campaigns.col.new')}</th>
					<th class="p-3 text-left">{t('campaigns.col.status')}</th>
					<th class="p-3"><span class="sr-only">{t('campaigns.col.actions')}</span></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each data.campaigns as c (c.id)}
					<tr class="hover:bg-quiet/50">
						<td class="p-3">
							<div class="flex items-center gap-3">
								<ProductImage src={c.imageUrl} tone="brand" class="size-12 shrink-0 rounded-lg" />
								<div class="min-w-0">
									<a
										class="font-semibold underline-offset-2 hover:underline"
										href="/staff/campaigns/{c.id}">{c.name}</a
									>
									{#if c.tagline}<p class="truncate text-xs text-muted">{c.tagline}</p>{/if}
								</div>
							</div>
						</td>
						<td class="p-3">{templateLabel(c.templateKey)}</td>
						<td class="p-3"
							>{c.code ?? (c.autoApply ? t('campaigns.auto') : t('campaigns.noCode'))}</td
						>
						<td class="p-3 text-xs text-muted">
							{#if c.startsAt}{formatDateTime(c.startsAt)}{:else}{t('campaigns.noStart')}{/if}
							{#if c.endsAt}<br />{t('campaigns.until', { time: formatDateTime(c.endsAt) })}{/if}
						</td>
						<td class="p-3 text-right tabular-nums">{c.uses}</td>
						<td class="p-3 text-right"><Money cents={c.discountCents} /></td>
						<td class="p-3 text-right"><Money cents={c.revenueCents} /></td>
						<td class="p-3 text-right tabular-nums">{ret(c.revenueCents, c.discountCents)}</td>
						<td class="p-3 text-right tabular-nums">{c.newCustomers}</td>
						<td class="p-3">
							<StatusPill tone={STATUS[c.status].tone} label={STATUS[c.status].label} />
						</td>
						<td class="p-3">
							<RowMenu label={t('campaigns.more', { name: c.name })}>
								<form method="POST" action="?/status" use:enhance>
									<input type="hidden" name="id" value={c.id} />
									{#if c.status === 'active'}
										<button name="status" value="paused">{t('campaigns.pause')}</button>
									{:else if c.status !== 'ended'}
										<button name="status" value="active">{t('campaigns.activate')}</button>
									{/if}
									{#if c.status !== 'ended'}
										<button
											type="button"
											class="text-bad"
											onclick={() => {
												ending = { id: c.id, name: c.name };
												endOpen = true;
											}}>{t('campaigns.end')}</button
										>
									{/if}
								</form>
							</RowMenu>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="11" class="p-10 text-center text-muted">
							{data.total === 0 ? t('campaigns.none') : t('campaigns.noneFilter')}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="text-sm text-muted">
		{t('campaigns.showing', { shown: data.campaigns.length, total: data.total })}
	</p>

	<form method="POST" action="?/status" use:enhance bind:this={endForm} hidden>
		<input type="hidden" name="id" value={ending?.id ?? ''} />
		<input type="hidden" name="status" value="ended" />
	</form>
	<ConfirmDialog
		bind:open={endOpen}
		title={t('campaigns.endTitle')}
		text={t('campaigns.endText', { name: ending?.name ?? t('campaigns.endThis') })}
		confirmLabel={t('campaigns.end')}
		danger
		onconfirm={() => endForm?.requestSubmit()}
	/>

	<details class="card p-4 text-sm text-muted">
		<summary class="cursor-pointer font-semibold text-ink">{t('campaigns.howTitle')}</summary>
		<p class="mt-3">
			{t('campaigns.howText')}
		</p>
	</details>
</main>
