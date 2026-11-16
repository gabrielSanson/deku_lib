<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const total = $derived(data.expenses.reduce((n, e) => n + e.amountCents, 0));
	const categoryOptions = $derived(data.categories.map((c) => ({ value: c.id, label: c.name })));
</script>

<svelte:head><title>{t('expenses.title')}</title></svelte:head>

<main class="space-y-4 p-4 sm:p-6">
	<h1 class="page-title">{t('expenses.title')}</h1>
	<p class="text-sm text-muted">{t('expenses.intro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />

	<form method="GET" class="flex flex-wrap items-end gap-2">
		<TextField label={t('expenses.month')} name="mes" type="month" value={data.month} />
		<button class="btn-secondary">OK</button>
		<a class="btn-ghost" href="/staff/analytics/resultado?mes={data.month}">{t('dre.title')}</a>
	</form>

	<form
		method="POST"
		action="?/add"
		use:enhance
		class="grid gap-3 card p-4 sm:grid-cols-5 sm:items-end"
	>
		<input type="hidden" name="month" value={data.month} />
		<SelectField label={t('expenses.category')} name="categoryId" options={categoryOptions} />
		<div class="sm:col-span-2">
			<TextField label={t('expenses.description')} name="description" maxlength={120} required />
		</div>
		<TextField label={t('expenses.amount')} name="amount" inputmode="decimal" required />
		<TextField label={t('expenses.paidAt')} name="paidAt" type="date" />
		<button class="btn-primary sm:col-span-5 sm:w-fit">{t('expenses.add')}</button>
	</form>

	{#if data.expenses.length === 0}
		<p class="text-muted">{t('expenses.none')}</p>
	{:else}
		<ul class="divide-y divide-line card">
			{#each data.expenses as e (e.id)}
				<li class="flex items-center justify-between gap-2 p-3 text-sm">
					<span class="min-w-0">
						<span class="font-medium">{e.description}</span>
						<span class="text-muted"
							>· {e.category}{e.recurring ? ` · ${t('expenses.recurringTag')}` : ''}</span
						>
					</span>
					<span class="flex items-center gap-2">
						<span class="font-semibold tabular-nums">{formatBRL(e.amountCents)}</span>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={e.id} />
							<button class="btn-quiet min-h-9 px-2">{t('expenses.delete')}</button>
						</form>
					</span>
				</li>
			{/each}
		</ul>
		<p class="font-semibold">{t('expenses.total', { value: formatBRL(total) })}</p>
	{/if}

	<section class="space-y-3 card p-4">
		<h2 class="font-semibold">{t('expenses.recurring')}</h2>
		{#if data.recurring.length}
			<ul class="divide-y divide-line">
				{#each data.recurring as r (r.id)}
					<li
						class="flex items-center justify-between gap-2 py-2 text-sm {r.active
							? ''
							: 'text-muted'}"
					>
						<span
							>{r.description} · {r.category} · {t('expenses.dayLine', { day: r.dayOfMonth })}</span
						>
						<span class="flex items-center gap-2">
							<span class="tabular-nums">{formatBRL(r.amountCents)}</span>
							<form method="POST" action="?/toggle" use:enhance>
								<input type="hidden" name="id" value={r.id} />
								<input type="hidden" name="active" value={r.active ? 'false' : 'true'} />
								<button class="btn-quiet min-h-9 px-2"
									>{r.active ? t('expenses.pause') : t('expenses.resume')}</button
								>
							</form>
						</span>
					</li>
				{/each}
			</ul>
		{/if}
		<form
			method="POST"
			action="?/recurring"
			use:enhance
			class="grid gap-3 sm:grid-cols-5 sm:items-end"
		>
			<SelectField label={t('expenses.category')} name="categoryId" options={categoryOptions} />
			<div class="sm:col-span-2">
				<TextField label={t('expenses.description')} name="description" maxlength={120} required />
			</div>
			<TextField label={t('expenses.amount')} name="amount" inputmode="decimal" required />
			<TextField label={t('expenses.day')} name="day" type="number" min={1} max={28} value={5} />
			<button class="btn-secondary sm:col-span-5 sm:w-fit">{t('expenses.addRecurring')}</button>
		</form>
	</section>
</main>
