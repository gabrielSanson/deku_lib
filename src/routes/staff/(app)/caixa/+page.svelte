<script lang="ts">
	import { enhance } from '$app/forms';
	import Money from '#lib/components/atoms/Money.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();

	const time = (d: Date | string) =>
		new Date(d).toLocaleTimeString('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Sao_Paulo'
		});
	const dateTime = (d: Date | string) =>
		new Date(d).toLocaleString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Sao_Paulo'
		});

	let kind = $state<'sangria' | 'suprimento'>('sangria');
	let busy = $state(false);
	let confirmClose = $state(false);

	const submit = () => {
		busy = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update();
			busy = false;
		};
	};
</script>

<svelte:head><title>{t('drawer.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-xl space-y-4 p-4">
	<h1 class="page-title">{t('drawer.title')}</h1>

	{#if data.closed}
		{@const c = data.closed}
		<section class="space-y-2 card p-4" aria-labelledby="closed-title">
			<h2 id="closed-title" class="font-semibold">
				{t('drawer.closedAt', { time: time(c.closedAt!) })}
			</h2>
			<div class="flex justify-between">
				<span>{t('drawer.counted')}</span><Money cents={c.countedCents!} />
			</div>
			<div class="flex justify-between">
				<span>{t('drawer.expected')}</span><Money cents={c.expectedCents!} />
			</div>
			<div
				class="flex justify-between text-lg font-bold {c.differenceCents! < 0 ? 'text-bad' : ''}"
			>
				<span
					>{c.differenceCents === 0
						? t('drawer.noDifference')
						: c.differenceCents! < 0
							? t('drawer.short')
							: t('drawer.over')}</span
				>
				<Money cents={Math.abs(c.differenceCents!)} />
			</div>
			{#if c.closeNote}<p class="text-sm text-muted">
					{t('drawer.closeNote', { note: c.closeNote })}
				</p>{/if}
		</section>
	{/if}

	{#if !data.session}
		<form method="POST" action="?/open" class="space-y-3 card p-4" use:enhance={submit}>
			<h2 class="font-semibold">{t('drawer.openTitle')}</h2>
			<p class="text-sm text-muted">
				{t('drawer.openText')}
			</p>
			<div>
				<label class="label" for="float">{t('drawer.float')}</label>
				<input
					id="float"
					name="float"
					class="field text-lg"
					inputmode="decimal"
					placeholder="0,00"
					required
				/>
			</div>
			<FormError message={form?.error} />
			<button class="btn-primary w-full text-lg" disabled={busy}>{t('drawer.open')}</button>
		</form>
	{:else}
		{@const s = data.session}
		<section class="space-y-1 card p-4">
			<p class="alert-ok">
				{t('drawer.openedBy', { name: s.openedByName, time: dateTime(s.openedAt) })}
			</p>
			<div class="flex justify-between pt-2">
				<span>{t('drawer.floatLine')}</span><Money cents={s.openingFloatCents} />
			</div>
			{#if data.balance}
				<div class="flex justify-between text-sm text-muted">
					<span>{t('drawer.sales')}</span><Money cents={data.balance.salesCents} />
				</div>
				<div class="flex justify-between text-sm text-muted">
					<span>{t('drawer.out')}</span><Money
						cents={data.balance.sangriaCents + data.balance.refundsCents}
					/>
				</div>
				<div class="flex justify-between text-sm text-muted">
					<span>{t('drawer.in')}</span><Money cents={data.balance.suprimentoCents} />
				</div>
				<div class="flex justify-between text-lg font-bold">
					<span>{t('drawer.expectedLine')}</span><Money cents={data.balance.expectedCents} />
				</div>
				<p class="text-xs text-muted">
					{t('drawer.blind')}
				</p>
			{/if}
		</section>

		<form method="POST" action="?/movement" class="space-y-3 card p-4" use:enhance={submit}>
			<h2 class="font-semibold">{t('drawer.moveTitle')}</h2>
			<input type="hidden" name="kind" value={kind} />
			<div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('drawer.moveKind')}>
				<button
					type="button"
					class="btn {kind === 'sangria' ? 'bg-ink text-canvas' : 'btn-secondary'}"
					aria-pressed={kind === 'sangria'}
					onclick={() => (kind = 'sangria')}>{t('drawer.sangria')}</button
				>
				<button
					type="button"
					class="btn {kind === 'suprimento' ? 'bg-ink text-canvas' : 'btn-secondary'}"
					aria-pressed={kind === 'suprimento'}
					onclick={() => (kind = 'suprimento')}>{t('drawer.suprimento')}</button
				>
			</div>
			<div>
				<label class="label" for="amount">{t('drawer.amount')}</label>
				<input id="amount" name="amount" class="field text-lg" inputmode="decimal" required />
			</div>
			<div>
				<label class="label" for="reason"
					>{kind === 'sangria' ? t('drawer.reason') : t('drawer.reasonOptional')}</label
				>
				<input
					id="reason"
					name="reason"
					class="field"
					placeholder={kind === 'sangria'
						? t('drawer.sangriaPlaceholder')
						: t('drawer.suprimentoPlaceholder')}
					required={kind === 'sangria'}
				/>
			</div>
			{#if form?.recorded}
				<p class="alert-ok" role="status">
					{form.recorded === 'sangria' ? t('drawer.sangriaDone') : t('drawer.suprimentoDone')}
				</p>
			{/if}
			<FormError message={form?.error} />
			<button class="btn-secondary w-full" disabled={busy}>{t('drawer.record')}</button>
		</form>

		<form method="POST" action="?/close" class="space-y-3 card p-4" use:enhance={submit}>
			<h2 class="font-semibold">{t('drawer.closeTitle')}</h2>
			<p class="text-sm text-muted">
				{t('drawer.closeText')}
			</p>
			<div>
				<label class="label" for="counted">{t('drawer.countedField')}</label>
				<input id="counted" name="counted" class="field text-lg" inputmode="decimal" required />
			</div>
			<div>
				<label class="label" for="note">{t('drawer.note')}</label>
				<input id="note" name="note" class="field" />
			</div>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={confirmClose} />
				{t('drawer.closeConfirm')}
			</label>
			<FormError message={form?.error} />
			<button class="btn-primary w-full text-lg" disabled={busy || !confirmClose}
				>{t('drawer.close')}</button
			>
		</form>

		<section class="card p-4">
			<h2 class="mb-2 font-semibold">{t('drawer.movements', { n: data.movements.length })}</h2>
			{#if data.movements.length === 0}
				<p class="text-sm text-muted">{t('drawer.noMovements')}</p>
			{:else}
				<ul class="divide-y divide-line text-sm">
					{#each data.movements as m (m.id)}
						<li class="flex items-baseline gap-2 py-2">
							<span class="w-12 text-muted tabular-nums">{time(m.createdAt)}</span>
							<span class="flex-1">
								{t(`drawer.kind.${m.kind}`)}{#if m.orderNumber}
									· #{m.orderNumber}{/if}{#if m.reason}
									· {m.reason}{/if}
								{#if m.recordedByName}<span class="text-muted"> · {m.recordedByName}</span>{/if}
							</span>
							<Money cents={m.amountCents} class={m.amountCents < 0 ? 'text-bad' : ''} />
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</main>
