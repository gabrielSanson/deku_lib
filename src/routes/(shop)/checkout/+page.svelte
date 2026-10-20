<script lang="ts">
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { cart } from '#lib/client/cart.svelte.ts';
	import FormError from '#lib/components/FormError.svelte';
	import Money from '#lib/components/Money.svelte';

	let { data, form } = $props();

	type Quote = {
		subtotalCents: number;
		deliveryFeeCents: number;
		totalCents: number;
		deliveryError: string | null;
		lines: { sku: string; name: string; quantity: number; lineTotalCents: number }[];
	};

	let fulfillmentType = $state<'pickup' | 'delivery'>('pickup');
	let name = $state('');
	let phone = $state('');
	let email = $state('');
	let marketingConsent = $state(false);
	let addr = $state({ cep: '', street: '', number: '', complement: '', neighborhood: '', city: 'São Paulo', state: 'SP', instructions: '' });
	let payment = $state<'pix' | 'online_card' | 'on_fulfillment'>('on_fulfillment');
	let idempotencyKey = $state(crypto.randomUUID());
	let quote = $state<Quote | null>(null);
	let quoteError = $state<string | null>(null);
	let quoting = $state(false);
	let busy = $state(false);

	$effect(() => {
		if (!data.store.pickup && data.store.delivery) fulfillmentType = 'delivery';
		if (data.onlineMethods.includes('pix')) payment = 'pix';
		else if (!data.store.payOnFulfillment && data.onlineMethods.length) payment = data.onlineMethods[0];
	});

	const payload = $derived(
		JSON.stringify({
			lines: cart.payload(),
			fulfillmentType,
			address: fulfillmentType === 'delivery' ? { ...addr, complement: addr.complement || undefined, instructions: addr.instructions || undefined } : undefined,
			name,
			phone,
			email,
			marketingConsent,
			payment,
			idempotencyKey
		})
	);

	// Re-quote on the server whenever the cart, fulfillment or address changes.
	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const body = new FormData();
		const p = JSON.parse(payload);
		// Quote needs only cart + address; send placeholders for the rest.
		body.set('payload', JSON.stringify({ ...p, name: p.name || 'xx', phone: p.phone || '11999999999', email: '', payment: 'on_fulfillment' }));
		if (!cart.ready || cart.lines.length === 0) return;
		if (fulfillmentType === 'delivery' && !/^\d{5}-?\d{3}$/.test(addr.cep)) {
			quote = null;
			return;
		}
		clearTimeout(timer);
		timer = setTimeout(async () => {
			quoting = true;
			const res = await fetch('?/quote', { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
			const result = deserialize(await res.text());
			quoting = false;
			if (result.type === 'success') {
				quote = (result.data as { quote: Quote }).quote;
				quoteError = null;
			} else if (result.type === 'failure') {
				quoteError = (result.data as { quoteError?: string; error?: string })?.quoteError ?? (result.data as { error?: string })?.error ?? 'Erro ao calcular.';
				quote = null;
			}
		}, 350);
	});

	const canPlace = $derived(
		cart.lines.length > 0 && data.store.open && quote !== null && !quote.deliveryError && name.trim().length >= 2 && phone.trim().length >= 8
	);
	const methods = $derived([
		...(data.onlineMethods.includes('pix') ? [{ id: 'pix', label: 'Pix', hint: 'Pague agora com QR Code. O pedido vai para a cozinha assim que o Pix for confirmado.' }] : []),
		...(data.onlineMethods.includes('online_card') ? [{ id: 'online_card', label: 'Cartão online', hint: 'Você será levado à página segura do provedor de pagamento.' }] : []),
		...(data.store.payOnFulfillment ? [{ id: 'on_fulfillment', label: fulfillmentType === 'delivery' ? 'Pagar na entrega' : 'Pagar na retirada', hint: 'Dinheiro, Pix ou cartão no balcão/entrega. A loja confirma o pedido.' }] : [])
	] as { id: typeof payment; label: string; hint: string }[]);
</script>

<svelte:head><title>Finalizar pedido · {data.shopName}</title></svelte:head>

<section class="space-y-5 py-4">
	<h1 class="text-2xl font-black">Finalizar pedido</h1>

	{#if cart.ready && cart.lines.length === 0}
		<div class="card p-6 text-center"><p class="mb-3 text-muted">Seu carrinho está vazio.</p><a class="btn-primary" href="/">Ver cardápio</a></div>
	{:else}
		<form
			method="POST"
			action="?/place"
			class="space-y-5"
			use:enhance={() => {
				busy = true;
				return async ({ result }) => {
					if (result.type === 'redirect') cart.clear();
					await applyAction(result);
					busy = false;
				};
			}}
		>
			<input type="hidden" name="payload" value={payload} />

			<fieldset class="space-y-2">
				<legend class="mb-2 text-lg font-bold">Como você quer receber?</legend>
				<div class="grid grid-cols-2 gap-2">
					<button type="button" disabled={!data.store.pickup} class="btn {fulfillmentType === 'pickup' ? 'bg-ink text-white' : 'btn-secondary'}" aria-pressed={fulfillmentType === 'pickup'} onclick={() => (fulfillmentType = 'pickup')}>Retirar na loja</button>
					<button type="button" disabled={!data.store.delivery} class="btn {fulfillmentType === 'delivery' ? 'bg-ink text-white' : 'btn-secondary'}" aria-pressed={fulfillmentType === 'delivery'} onclick={() => (fulfillmentType = 'delivery')}>Entrega</button>
				</div>
				<p class="text-sm text-muted">Previsão: cerca de {data.store.prepTimeMinutes} min{fulfillmentType === 'delivery' ? ' + deslocamento' : ''}.</p>
			</fieldset>

			{#if fulfillmentType === 'delivery'}
				<fieldset class="card grid grid-cols-6 gap-3 p-4">
					<legend class="px-1 font-semibold">Endereço</legend>
					<div class="col-span-3"><label class="label" for="cep">CEP</label><input id="cep" class="field" inputmode="numeric" autocomplete="postal-code" bind:value={addr.cep} placeholder="00000-000" required /></div>
					<div class="col-span-3"><label class="label" for="hood">Bairro</label><input id="hood" class="field" bind:value={addr.neighborhood} required /></div>
					<div class="col-span-4"><label class="label" for="street">Rua</label><input id="street" class="field" autocomplete="address-line1" bind:value={addr.street} required /></div>
					<div class="col-span-2"><label class="label" for="num">Número</label><input id="num" class="field" bind:value={addr.number} required /></div>
					<div class="col-span-6"><label class="label" for="comp">Complemento</label><input id="comp" class="field" autocomplete="address-line2" bind:value={addr.complement} /></div>
					<div class="col-span-4"><label class="label" for="city">Cidade</label><input id="city" class="field" bind:value={addr.city} required /></div>
					<div class="col-span-2"><label class="label" for="uf">UF</label><input id="uf" class="field uppercase" maxlength="2" bind:value={addr.state} required /></div>
					<div class="col-span-6"><label class="label" for="inst">Ponto de referência</label><input id="inst" class="field" bind:value={addr.instructions} /></div>
				</fieldset>
			{/if}

			<fieldset class="card grid gap-3 p-4">
				<legend class="px-1 font-semibold">Seus dados</legend>
				<div><label class="label" for="name">Nome</label><input id="name" class="field" autocomplete="name" bind:value={name} required /></div>
				<div><label class="label" for="phone">Celular (WhatsApp)</label><input id="phone" class="field" type="tel" autocomplete="tel" bind:value={phone} placeholder="(11) 98765-4321" required /></div>
				<div><label class="label" for="email">E-mail (opcional)</label><input id="email" class="field" type="email" autocomplete="email" bind:value={email} /></div>
				<label class="flex items-start gap-2 text-sm"><input type="checkbox" class="mt-0.5 size-5" bind:checked={marketingConsent} /> Quero receber promoções por WhatsApp ou e-mail. (Opcional; você pode cancelar quando quiser.)</label>
				<p class="text-xs text-muted">Usamos seus dados apenas para preparar e entregar o pedido. Veja a <a href="/p/privacidade" class="underline">política de privacidade</a>.</p>
			</fieldset>

			<fieldset class="space-y-2">
				<legend class="mb-2 text-lg font-bold">Pagamento</legend>
				{#if methods.length === 0}
					<p class="alert-warn">Nenhuma forma de pagamento disponível no momento.</p>
				{/if}
				{#each methods as m (m.id)}
					<label class="card flex cursor-pointer items-start gap-3 p-3 {payment === m.id ? 'border-brand-600 ring-1 ring-brand-600' : ''}">
						<input type="radio" name="paymethod" class="mt-1 size-5" value={m.id} bind:group={payment} />
						<span><span class="font-semibold">{m.label}</span><br /><span class="text-sm text-muted">{m.hint}</span></span>
					</label>
				{/each}
			</fieldset>

			<section class="card space-y-1 p-4" aria-live="polite">
				<h2 class="mb-2 font-semibold">Resumo</h2>
				{#if quote}
					{#each quote.lines as l, i (i)}
						<div class="flex justify-between text-sm"><span>{l.quantity}× {l.name}</span><Money cents={l.lineTotalCents} /></div>
					{/each}
					<div class="flex justify-between border-t border-line pt-2 text-sm"><span>Subtotal</span><Money cents={quote.subtotalCents} /></div>
					{#if fulfillmentType === 'delivery'}
						<div class="flex justify-between text-sm"><span>Entrega</span>{#if quote.deliveryError}<span>—</span>{:else}<Money cents={quote.deliveryFeeCents} />{/if}</div>
					{/if}
					<div class="flex justify-between text-lg font-bold"><span>Total</span><Money cents={quote.totalCents} /></div>
					{#if quote.deliveryError}<p class="alert-error">{quote.deliveryError}</p>{/if}
				{:else if quoting}
					<p class="text-sm text-muted">Calculando…</p>
				{:else if fulfillmentType === 'delivery'}
					<p class="text-sm text-muted">Informe o CEP para calcular a entrega.</p>
				{/if}
				<FormError message={quoteError} />
			</section>

			<FormError message={form?.error} />
			<button class="btn-primary w-full text-lg" disabled={!canPlace || busy || methods.length === 0}>
				{busy ? 'Enviando…' : payment === 'on_fulfillment' ? 'Fazer pedido' : 'Ir para o pagamento'}
			</button>
			<p class="text-center text-xs text-muted">Sem taxas escondidas: o total acima é o valor final.</p>
		</form>
	{/if}
</section>
