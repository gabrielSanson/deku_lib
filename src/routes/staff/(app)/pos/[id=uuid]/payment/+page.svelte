<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ChoiceButtons from '#lib/components/molecules/ChoiceButtons.svelte';
	import ConfirmedPost from '#lib/components/organisms/ConfirmedPost.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
	import { formatBRL, parseBRL } from '#lib/domain/money.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();

	type Method = 'cash' | 'external_pix' | 'terminal_card' | 'softpos_nfc';
	const methods: { id: Method; label: string; hint: string }[] = [
		{ id: 'cash', label: t('posPay.cash'), hint: t('posPay.cashHint') },
		{ id: 'external_pix', label: t('posPay.pix'), hint: t('posPay.pixHint') },
		{ id: 'terminal_card', label: t('posPay.card'), hint: t('posPay.cardHint') },
		{ id: 'softpos_nfc', label: t('posPay.tap'), hint: t('posPay.tapHint') }
	];
	let method = $state<Method>(
		page.url.searchParams.get('method') === 'external_pix' ? 'external_pix' : 'cash'
	);
	// Defaults to what is still owed; the cashier can overwrite it.
	let amount = $derived(formatBRL(data.remainingCents).replace(/[R$\s]/g, ''));
	let received = $state('');
	let reference = $state('');
	let busy = $state(false);
	let cancelOpen = $state(false);
	let key = $state(crypto.randomUUID());

	const changePreview = $derived.by(() => {
		const a = parseBRL(amount);
		const r = parseBRL(received);
		return a && r && r >= a ? r - a : null;
	});
	const current = $derived(methods.find((m) => m.id === method)!);
	const paid = $derived(data.order.paymentStatus === 'paid');
</script>

<svelte:head><title>{t('posPay.tabTitle', { n: data.order.orderNumber })}</title></svelte:head>

<main class="mx-auto max-w-xl space-y-4 p-4">
	<div class="flex items-center justify-between">
		<h1 class="page-title">{t('posPay.title', { n: data.order.orderNumber })}</h1>
		<PaymentBadge status={data.order.paymentStatus} />
	</div>
	<div class="space-y-1 card p-4">
		<div class="flex justify-between text-lg">
			<span>{t('posPay.total')}</span><Money cents={data.order.totalCents} class="font-bold" />
		</div>
		<div class="flex justify-between text-sm text-muted">
			<span>{t('posPay.paid')}</span><Money cents={data.paidCents} />
		</div>
		<div class="flex justify-between text-xl font-bold">
			<span>{t('posPay.remaining')}</span><Money cents={data.remainingCents} />
		</div>
	</div>

	{#if form?.ok && form.changeCents}
		<p class="alert-ok text-lg" role="status">
			{t('posPay.change')} <strong><Money cents={form.changeCents} /></strong>
		</p>
	{/if}

	{#if paid}
		<div class="space-y-3">
			<p class="alert-ok">{t('posPay.confirmed')}</p>
			<button
				class="btn-primary w-full text-lg"
				onclick={() => goto(`/staff/pos/${data.order.id}/complete`)}>{t('posPay.continue')}</button
			>
		</div>
	{:else}
		<form
			method="POST"
			action="?/pay"
			class="space-y-3 card p-4"
			use:enhance={() => {
				busy = true;
				return async ({ update, result }) => {
					await update({ reset: false });
					if (result.type === 'success') {
						key = crypto.randomUUID();
						reference = '';
						received = '';
					}
					busy = false;
				};
			}}
		>
			<input type="hidden" name="method" value={method} />
			<input type="hidden" name="idempotencyKey" value={key} />
			<ChoiceButtons
				label={t('posPay.methods')}
				choices={methods.map((m) => ({ value: m.id, label: m.label }))}
				bind:value={method}
			/>
			<p class="text-sm text-muted">{current.hint}</p>
			<div>
				<label class="label" for="amount">{t('posPay.amount')}</label>
				<input
					id="amount"
					name="amount"
					class="field text-lg"
					inputmode="decimal"
					bind:value={amount}
					required
				/>
			</div>
			{#if method === 'cash'}
				<div>
					<label class="label" for="received">{t('posPay.received')}</label>
					<input
						id="received"
						name="received"
						class="field text-lg"
						inputmode="decimal"
						bind:value={received}
					/>
					{#if changePreview !== null}<p class="mt-1 text-sm">
							{t('posPay.change')}
							<Money cents={changePreview} class="font-semibold" />
						</p>{/if}
				</div>
			{:else}
				<div>
					<label class="label" for="reference">{t('posPay.reference')}</label>
					<input
						id="reference"
						name="reference"
						class="field"
						bind:value={reference}
						required
						autocomplete="off"
					/>
				</div>
			{/if}
			<FormError message={form?.error} />
			{#if form?.code === 'cash_closed'}
				<a class="btn-secondary w-full" href="/staff/caixa">{t('posPay.openDrawer')}</a>
			{/if}
			<button class="btn-primary w-full text-lg" disabled={busy}
				>{busy ? t('posPay.busy') : t('posPay.submit')}</button
			>
		</form>

		<p class="text-center">
			<button type="button" class="btn-ghost text-sm text-bad" onclick={() => (cancelOpen = true)}>
				{t('posPay.cancel')}
			</button>
		</p>
		<ConfirmedPost
			bind:open={cancelOpen}
			action="?/cancel"
			title={t('posPay.cancelConfirm')}
			text={t('posPay.cancelText')}
			confirmLabel={t('posPay.cancel')}
			cancelLabel={t('posPay.keep')}
		/>
	{/if}
</main>
