<script lang="ts">
	import { enhance } from '$app/forms';
	import FileField from '#lib/components/molecules/FileField.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const r = $derived(data.report);
	const fieldLabel: Record<string, string> = {
		order: 'Pedido',
		date: 'Data',
		gross: 'Bruto',
		commission: 'Comissão',
		fee: 'Taxas',
		net: 'Líquido'
	};
</script>

<svelte:head><title>{t('payouts.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-5xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="page-title">{t('payouts.title')}</h1>
		<a class="btn-ghost" href="/staff/analytics">{t('nav.relatorios')}</a>
	</div>
	<p class="text-sm text-muted">{t('payouts.intro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'ok' in form && form.ok}<p class="alert-ok">{form.ok}</p>{/if}

	<form
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		class="flex flex-wrap items-end gap-2 card p-4"
		use:enhance
	>
		<FileField
			label={t('payouts.file')}
			name="file"
			accept=".csv,text/csv"
			required
			wrapClass="flex-1"
		/>
		<button class="btn-primary">{t('payouts.upload')}</button>
	</form>

	{#if data.uploads.length}
		<nav class="flex flex-wrap gap-2 text-sm" aria-label={t('payouts.uploads')}>
			{#each data.uploads as u (u.id)}
				<a class={u.id === data.chosen ? 'btn-secondary' : 'btn-ghost'} href="?extrato={u.id}"
					>{u.period_start ?? formatDateTime(u.created_at)}{u.period_end
						? ` a ${u.period_end}`
						: ''}</a
				>
			{/each}
		</nav>
	{/if}

	{#if r}
		<section class="grid grid-cols-2 gap-3 card p-4 text-sm sm:grid-cols-5">
			<div>
				<div class="text-muted">{t('payouts.expected')}</div>
				<div class="font-bold">{formatBRL(r.totals.expectedCents)}</div>
			</div>
			<div>
				<div class="text-muted">{t('payouts.gross')}</div>
				<div class="font-bold">{formatBRL(r.totals.grossCents)}</div>
			</div>
			<div>
				<div class="text-muted">{t('payouts.commission')}</div>
				<div class="font-bold">{formatBRL(r.totals.commissionCents)}</div>
			</div>
			<div>
				<div class="text-muted">{t('payouts.fee')}</div>
				<div class="font-bold">{formatBRL(r.totals.feeCents)}</div>
			</div>
			<div>
				<div class="text-muted">{t('payouts.net')}</div>
				<div class="font-bold">{formatBRL(r.totals.netCents)}</div>
			</div>
		</section>

		<section class="card p-4">
			<h2 class="mb-2 font-bold">{t('payouts.missing')} ({r.missing.length})</h2>
			{#each r.missing as o (o.id)}
				<a class="block border-t border-line py-1 text-sm underline" href="/staff/orders/{o.id}"
					>#{o.order_number} · iFood {o.channel_display_id ?? ''} · {formatBRL(o.total_cents)} ·
					{formatDateTime(o.created_at)}</a
				>
			{:else}
				<p class="text-sm text-muted">{t('payouts.none')}</p>
			{/each}
		</section>

		<section class="card p-4">
			<h2 class="mb-2 font-bold">{t('payouts.unknown')} ({r.unknown.length})</h2>
			{#each r.unknown as l (l.id)}
				<div class="border-t border-line py-1 text-sm">
					{l.channel_order_ref ?? '—'} · {l.occurred_on ?? ''} · {formatBRL(l.net_cents)}
				</div>
			{:else}
				<p class="text-sm text-muted">{t('payouts.none')}</p>
			{/each}
		</section>

		<section class="overflow-x-auto card">
			<h2 class="p-4 pb-0 font-bold">{t('payouts.matched')} ({r.matched.length})</h2>
			<table class="w-full text-sm">
				<thead class="text-left text-muted">
					<tr>
						<th class="p-2">#</th>
						<th class="p-2 text-right">{t('payouts.expected')}</th>
						<th class="p-2 text-right">{t('payouts.gross')}</th>
						<th class="p-2 text-right">{t('payouts.commission')}</th>
						<th class="p-2 text-right">{t('payouts.fee')}</th>
						<th class="p-2 text-right">{t('payouts.net')}</th>
					</tr>
				</thead>
				<tbody>
					{#each r.matched as l (l.id)}
						<tr class="border-t border-line">
							<td class="p-2"
								><a class="underline" href="/staff/orders/{l.order_id}">#{l.order_number}</a></td
							>
							<td class="p-2 text-right">{formatBRL(l.order_total_cents ?? 0)}</td>
							<td class="p-2 text-right {l.gross_cents !== l.order_total_cents ? 'text-warn' : ''}"
								>{formatBRL(l.gross_cents)}</td
							>
							<td class="p-2 text-right">{formatBRL(l.commission_cents)}</td>
							<td class="p-2 text-right">{formatBRL(l.fee_cents)}</td>
							<td class="p-2 text-right">{formatBRL(l.net_cents)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}

	<details class="card p-4">
		<summary class="cursor-pointer text-sm font-semibold">{t('payouts.columns')}</summary>
		<form method="POST" action="?/columns" class="mt-3 grid gap-2 sm:grid-cols-3" use:enhance>
			{#each data.fields as f (f)}
				<TextField label={fieldLabel[f]} name={f} value={data.columns[f]?.[0] ?? ''} />
			{/each}
			<div class="sm:col-span-3">
				<button class="btn-secondary">{t('payouts.saveColumns')}</button>
			</div>
		</form>
	</details>
</main>
