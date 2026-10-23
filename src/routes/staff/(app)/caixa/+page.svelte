<script lang="ts">
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { enhance } from '$app/forms';
	import Money from '#lib/components/atoms/Money.svelte';
	import ChoiceButtons from '#lib/components/molecules/ChoiceButtons.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { formatDateTime as dateTime, formatTime as time } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();

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
			<TextField
				label={t('drawer.float')}
				name="float"
				inputmode="decimal"
				placeholder="0,00"
				required
				class="text-lg"
			/>
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
			<ChoiceButtons
				label={t('drawer.moveKind')}
				choices={[
					{ value: 'sangria', label: t('drawer.sangria') },
					{ value: 'suprimento', label: t('drawer.suprimento') }
				]}
				bind:value={kind}
			/>
			<TextField
				label={t('drawer.amount')}
				name="amount"
				inputmode="decimal"
				required
				class="text-lg"
			/>
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
			<TextField
				label={t('drawer.countedField')}
				name="counted"
				inputmode="decimal"
				required
				class="text-lg"
			/>
			<TextField label={t('drawer.note')} name="note" />
			<Checkbox label={t('drawer.closeConfirm')} bind:checked={confirmClose} class="text-sm" />
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
