<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
	import { formatBRL, parseBRL } from '#lib/domain/money.ts';

	let { data, form } = $props();

	type Method = 'cash' | 'external_pix' | 'terminal_card' | 'softpos_nfc';
	const methods: { id: Method; label: string; hint: string }[] = [
		{ id: 'cash', label: 'Dinheiro', hint: 'Informe o valor recebido para calcular o troco.' },
		{
			id: 'external_pix',
			label: 'Pix',
			hint: 'Confira o Pix no app do banco/PSP e informe o ID (E2E) da transação.'
		},
		{
			id: 'terminal_card',
			label: 'Maquininha',
			hint: 'Passe o cartão na maquininha e informe o NSU/autorização impresso.'
		},
		{
			id: 'softpos_nfc',
			label: 'Aproximação (celular)',
			hint: 'Cobre no app Tap to Pay do seu PSP e informe o código da transação.'
		}
	];
	let method = $state<Method>(
		page.url.searchParams.get('method') === 'external_pix' ? 'external_pix' : 'cash'
	);
	// Defaults to what is still owed; the cashier can overwrite it.
	let amount = $derived(formatBRL(data.remainingCents).replace(/[R$\s]/g, ''));
	let received = $state('');
	let reference = $state('');
	let busy = $state(false);
	let key = $state(crypto.randomUUID());

	const changePreview = $derived.by(() => {
		const a = parseBRL(amount);
		const r = parseBRL(received);
		return a && r && r >= a ? r - a : null;
	});
	const current = $derived(methods.find((m) => m.id === method)!);
	const paid = $derived(data.order.paymentStatus === 'paid');
</script>

<svelte:head><title>Pagamento #{data.order.orderNumber}</title></svelte:head>

<main class="mx-auto max-w-xl space-y-4 p-4">
	<div class="flex items-center justify-between">
		<h1 class="page-title">Pedido #{data.order.orderNumber}</h1>
		<PaymentBadge status={data.order.paymentStatus} />
	</div>
	<div class="space-y-1 card p-4">
		<div class="flex justify-between text-lg">
			<span>Total</span><Money cents={data.order.totalCents} class="font-bold" />
		</div>
		<div class="flex justify-between text-sm text-muted">
			<span>Já pago</span><Money cents={data.paidCents} />
		</div>
		<div class="flex justify-between text-xl font-bold">
			<span>Falta</span><Money cents={data.remainingCents} />
		</div>
	</div>

	{#if form?.ok && form.changeCents}
		<p class="alert-ok text-lg" role="status">
			Troco: <strong><Money cents={form.changeCents} /></strong>
		</p>
	{/if}

	{#if paid}
		<div class="space-y-3">
			<p class="alert-ok">Pagamento confirmado.</p>
			<button
				class="btn-primary w-full text-lg"
				onclick={() => goto(`/staff/pos/${data.order.id}/complete`)}>Continuar</button
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
			<div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma de pagamento">
				{#each methods as m (m.id)}
					<button
						type="button"
						class="btn {method === m.id ? 'bg-ink text-canvas' : 'btn-secondary'}"
						aria-pressed={method === m.id}
						onclick={() => (method = m.id)}>{m.label}</button
					>
				{/each}
			</div>
			<p class="text-sm text-muted">{current.hint}</p>
			<div>
				<label class="label" for="amount">Valor a cobrar (R$)</label>
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
					<label class="label" for="received">Valor recebido (R$)</label>
					<input
						id="received"
						name="received"
						class="field text-lg"
						inputmode="decimal"
						bind:value={received}
					/>
					{#if changePreview !== null}<p class="mt-1 text-sm">
							Troco: <Money cents={changePreview} class="font-semibold" />
						</p>{/if}
				</div>
			{:else}
				<div>
					<label class="label" for="reference">Código da transação (NSU / E2E)</label>
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
			<button class="btn-primary w-full text-lg" disabled={busy}
				>{busy ? 'Registrando…' : 'Confirmar pagamento'}</button
			>
		</form>

		<form method="POST" action="?/cancel" use:enhance class="text-center">
			<button
				class="btn-ghost text-sm text-bad"
				onclick={(e) => !confirm('Cancelar este pedido?') && e.preventDefault()}
			>
				Cancelar pedido
			</button>
		</form>
	{/if}
</main>
