<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { formatTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const isAdmin = $derived(data.staff.role === 'admin');
	const active = $derived(data.couriers.filter((c) => c.active));
	const courierOptions = $derived(active.map((c) => ({ value: c.id, label: c.name })));
	const place = (o: {
		street: string | null;
		number: string | null;
		neighborhood: string | null;
	}) => [`${o.street ?? ''} ${o.number ?? ''}`.trim(), o.neighborhood].filter(Boolean).join(' · ');
	const err = $derived(form && 'error' in form ? (form.error as string) : undefined);
	const newLink = $derived(form && 'link' in form ? (form.link as string) : null);
</script>

<svelte:head><title>{t('dispatch.title')}</title></svelte:head>

<main class="space-y-4 p-4 sm:p-6">
	<h1 class="page-title">{t('dispatch.title')}</h1>
	<p class="text-sm text-muted">{t('dispatch.intro')}</p>
	<FormError message={err} />

	<section class="space-y-3 card p-4">
		<h2 class="font-semibold">{t('dispatch.waiting')}</h2>
		{#if data.waiting.length === 0}
			<p class="text-sm text-muted">{t('dispatch.waitingNone')}</p>
		{:else if active.length === 0}
			<p class="text-sm text-muted">{t('dispatch.noCouriers')}</p>
		{:else}
			<form method="POST" action="?/run" use:enhance class="space-y-3">
				<ul class="divide-y divide-line">
					{#each data.waiting as o (o.id)}
						<li class="flex items-center gap-3 py-2 text-sm">
							<input
								type="checkbox"
								name="orderId"
								value={o.id}
								id="o-{o.id}"
								checked={o.status === 'ready'}
							/>
							<label for="o-{o.id}" class="min-w-0 flex-1">
								<span class="font-semibold">#{o.orderNumber}</span>
								<span class="text-muted"
									>· {o.status === 'ready' ? t('dispatch.ready') : t('dispatch.inKitchen')}</span
								>
								<span class="block truncate">{place(o)}</span>
							</label>
							<span class="tabular-nums">{formatBRL(o.totalCents)}</span>
						</li>
					{/each}
				</ul>
				<div class="flex flex-wrap items-end gap-2">
					<SelectField label={t('dispatch.courier')} name="courierId" options={courierOptions} />
					<button class="btn-primary">{t('dispatch.createRun')}</button>
				</div>
			</form>
		{/if}
	</section>

	<section class="space-y-3">
		<h2 class="font-semibold">{t('dispatch.runs')}</h2>
		{#each data.runs as r (r.id)}
			<article class="space-y-2 card p-4 text-sm">
				<header class="flex flex-wrap items-center gap-2">
					<span class="font-semibold">{r.courier}</span>
					<span class="text-muted">
						{r.settledAt
							? t('dispatch.settledAt', { value: formatBRL(r.payoutCents ?? 0) })
							: r.returnedAt
								? t('dispatch.returned', { time: formatTime(r.returnedAt) })
								: r.leftAt
									? t('dispatch.leftAt', { time: formatTime(r.leftAt) })
									: t('dispatch.notLeft')}
					</span>
					<a class="ml-auto btn-ghost min-h-9" href="/staff/entregas/{r.id}/rota" target="_blank"
						>{t('dispatch.route')}</a
					>
				</header>
				<ul class="divide-y divide-line">
					{#each r.orders as o (o.id)}
						<li class="flex items-center gap-2 py-1.5">
							<span class="font-semibold">#{o.orderNumber}</span>
							<span class="min-w-0 flex-1 truncate">{place(o)}</span>
							{#if o.deliveredAt}
								<span class="text-ok">✓ {formatTime(o.deliveredAt)}</span>
							{:else if r.leftAt}
								<form method="POST" action="?/delivered" use:enhance>
									<input type="hidden" name="orderId" value={o.id} />
									<button class="btn-quiet min-h-9 px-2">{t('dispatch.delivered')}</button>
								</form>
							{:else}
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="orderId" value={o.id} />
									<button class="btn-quiet min-h-9 px-2">{t('dispatch.remove')}</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
				<div class="flex flex-wrap gap-2">
					{#if !r.leftAt}
						<form method="POST" action="?/left" use:enhance>
							<input type="hidden" name="runId" value={r.id} />
							<button class="btn-primary">{t('dispatch.left')}</button>
						</form>
					{/if}
					{#if isAdmin && r.leftAt && !r.settledAt}
						<form method="POST" action="?/settle" use:enhance>
							<input type="hidden" name="runId" value={r.id} />
							<button class="btn-secondary"
								>{t('dispatch.settle', {
									value: formatBRL(
										r.orders.filter((o) => o.deliveredAt).length * r.payPerDeliveryCents
									)
								})}</button
							>
						</form>
					{/if}
				</div>
			</article>
		{:else}
			<p class="text-sm text-muted">{t('dispatch.runsNone')}</p>
		{/each}
	</section>

	{#if isAdmin}
		<section class="space-y-3 card p-4">
			<h2 class="font-semibold">{t('dispatch.couriers')}</h2>
			<p class="text-sm text-muted">{t('dispatch.couriersIntro')}</p>
			{#if newLink}
				<p class="bg-surface-2 rounded-md p-3 text-sm break-all" role="status">
					{t('dispatch.linkShown')} <a class="font-semibold underline" href={newLink}>{newLink}</a>
				</p>
			{/if}
			<ul class="divide-y divide-line">
				{#each data.couriers as c (c.id)}
					<li class="py-2">
						<form
							method="POST"
							action="?/updateCourier"
							use:enhance
							class="grid gap-2 text-sm sm:grid-cols-6 sm:items-end"
						>
							<input type="hidden" name="id" value={c.id} />
							<div class="sm:col-span-2">
								<TextField label={t('dispatch.courierName')} name="name" value={c.name} required />
							</div>
							<TextField label={t('dispatch.courierPhone')} name="phone" value={c.phone ?? ''} />
							<TextField
								label={t('dispatch.courierPay')}
								name="pay"
								inputmode="decimal"
								value={(c.payPerDeliveryCents / 100).toFixed(2).replace('.', ',')}
							/>
							<label class="flex items-center gap-2"
								><input type="checkbox" name="active" checked={c.active} />
								{t('dispatch.courierActive')}</label
							>
							<span class="flex gap-2">
								<button class="btn-secondary min-h-9">{t('dispatch.save')}</button>
								<button class="btn-ghost min-h-9" formaction="?/newLink"
									>{t('dispatch.newLink')}</button
								>
							</span>
						</form>
					</li>
				{/each}
			</ul>
			<form
				method="POST"
				action="?/addCourier"
				use:enhance
				class="grid gap-2 text-sm sm:grid-cols-5 sm:items-end"
			>
				<div class="sm:col-span-2">
					<TextField label={t('dispatch.courierName')} name="name" required maxlength={60} />
				</div>
				<TextField label={t('dispatch.courierPhone')} name="phone" />
				<TextField label={t('dispatch.courierPay')} name="pay" inputmode="decimal" />
				<button class="btn-primary">{t('dispatch.addCourier')}</button>
			</form>
		</section>
	{/if}
</main>
