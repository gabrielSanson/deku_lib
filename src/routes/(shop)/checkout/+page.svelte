<script lang="ts">
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { cart } from '#lib/client/cart.svelte.ts';
	import FormError from '#lib/components/FormError.svelte';
	import Money from '#lib/components/Money.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();

	type Quote = {
		subtotalCents: number;
		deliveryFeeCents: number;
		totalCents: number;
		deliveryError: string | null;
		lines: { sku: string; name: string; quantity: number; lineTotalCents: number }[];
	};

	let fulfillmentType = $state<'dine_in' | 'pickup' | 'delivery'>('pickup');
	let tableLabel = $state('');
	let name = $state('');
	let phone = $state('');
	let email = $state('');
	let marketingConsent = $state(false);
	let addr = $state({
		cep: '',
		street: '',
		number: '',
		complement: '',
		neighborhood: '',
		city: 'São Paulo',
		state: 'SP',
		instructions: ''
	});
	let payment = $state<'pix' | 'online_card' | 'pix_key' | 'on_fulfillment'>('on_fulfillment');
	let idempotencyKey = $state(crypto.randomUUID());
	let quote = $state<Quote | null>(null);
	let quoteError = $state<string | null>(null);
	let quoting = $state(false);
	let busy = $state(false);
	let placeError = $state<string | null>(null);

	$effect(() => {
		let table: string | null = null;
		try {
			table = sessionStorage.getItem('deku-mesa');
		} catch {
			/* no storage: nothing to prefill */
		}
		if (data.store.dineIn && table) {
			fulfillmentType = 'dine_in';
			tableLabel = table;
		} else if (!data.store.pickup) {
			fulfillmentType = data.store.dineIn ? 'dine_in' : 'delivery';
		}
		if (data.onlineMethods.includes('pix')) payment = 'pix';
		else if (data.store.pixKey) payment = 'pix_key';
		else if (!data.store.payOnFulfillment && data.onlineMethods.length)
			payment = data.onlineMethods[0];
	});

	const payload = $derived(
		JSON.stringify({
			lines: cart.payload(),
			fulfillmentType,
			tableLabel: fulfillmentType === 'dine_in' ? tableLabel.trim() || undefined : undefined,
			address:
				fulfillmentType === 'delivery'
					? {
							...addr,
							complement: addr.complement || undefined,
							instructions: addr.instructions || undefined
						}
					: undefined,
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
		body.set(
			'payload',
			JSON.stringify({
				...p,
				name: p.name || 'xx',
				phone: p.phone || '11999999999',
				email: '',
				payment: 'on_fulfillment'
			})
		);
		if (!cart.ready || cart.lines.length === 0) return;
		if (fulfillmentType === 'delivery' && !/^\d{5}-?\d{3}$/.test(addr.cep)) {
			quote = null;
			return;
		}
		clearTimeout(timer);
		timer = setTimeout(async () => {
			quoting = true;
			let result;
			try {
				const res = await fetch('?/quote', {
					method: 'POST',
					body,
					headers: { 'x-sveltekit-action': 'true' }
				});
				result = deserialize(await res.text());
			} catch {
				quoteError = navigator.onLine ? t('errors.generic') : t('errors.offline');
				quote = null;
				return;
			} finally {
				quoting = false;
			}
			if (result.type === 'success') {
				quote = (result.data as { quote: Quote }).quote;
				quoteError = null;
			} else if (result.type === 'failure') {
				quoteError =
					(result.data as { quoteError?: string; error?: string })?.quoteError ??
					(result.data as { error?: string })?.error ??
					t('errors.generic');
			} else if (result.type === 'error') {
				quoteError = t('errors.generic');
				quote = null;
				quote = null;
			}
		}, 350);
	});

	const canPlace = $derived(
		cart.lines.length > 0 &&
			data.store.open &&
			quote !== null &&
			!quote.deliveryError &&
			name.trim().length >= 2 &&
			phone.trim().length >= 8
	);
	const methods = $derived([
		...(data.onlineMethods.includes('pix')
			? [
					{
						id: 'pix',
						label: t('checkout.method.pix'),
						hint: t('checkout.method.pix.hint')
					}
				]
			: data.store.pixKey
				? [
						{
							id: 'pix_key',
							label: t('checkout.method.pix'),
							hint: t('checkout.method.pixKey.hint')
						}
					]
				: []),
		...(data.onlineMethods.includes('online_card')
			? [
					{
						id: 'online_card',
						label: t('checkout.method.card'),
						hint: t('checkout.method.card.hint')
					}
				]
			: []),
		...(data.store.payOnFulfillment
			? [
					{
						id: 'on_fulfillment',
						label:
							fulfillmentType === 'delivery'
								? t('checkout.method.onDelivery')
								: t('checkout.method.onPickup'),
						hint: t('checkout.method.onFulfillment.hint')
					}
				]
			: [])
	] as { id: typeof payment; label: string; hint: string }[]);
</script>

<svelte:head><title>{t('checkout.title')} · {data.shopName}</title></svelte:head>

<section class="space-y-5 py-4">
	<h1 class="text-2xl font-black">{t('checkout.title')}</h1>

	{#if cart.ready && cart.lines.length === 0}
		<div class="card p-6 text-center">
			<p class="mb-3 text-muted">{t('cart.empty')}</p>
			<a class="btn-primary" href="/">{t('cart.seeMenu')}</a>
		</div>
	{:else}
		<form
			method="POST"
			action="?/place"
			class="space-y-5"
			use:enhance={() => {
				busy = true;
				placeError = null;
				return async ({ result }) => {
					busy = false;
					// Keep what the customer typed: show the problem here instead of the error page.
					if (result.type === 'error') {
						placeError = navigator.onLine ? t('errors.generic') : t('errors.offline');
						return;
					}
					if (result.type === 'redirect') cart.clear();
					await applyAction(result);
				};
			}}
		>
			<input type="hidden" name="payload" value={payload} />

			<fieldset class="space-y-2">
				<legend class="mb-2 text-lg font-bold">{t('checkout.how')}</legend>
				<div class="grid gap-2 {data.store.dineIn ? 'grid-cols-3' : 'grid-cols-2'}">
					{#if data.store.dineIn}
						<button
							type="button"
							class="btn {fulfillmentType === 'dine_in' ? 'bg-ink text-white' : 'btn-secondary'}"
							aria-pressed={fulfillmentType === 'dine_in'}
							onclick={() => (fulfillmentType = 'dine_in')}>{t('checkout.dineIn')}</button
						>
					{/if}
					<button
						type="button"
						disabled={!data.store.pickup}
						class="btn {fulfillmentType === 'pickup' ? 'bg-ink text-white' : 'btn-secondary'}"
						aria-pressed={fulfillmentType === 'pickup'}
						onclick={() => (fulfillmentType = 'pickup')}>{t('checkout.pickup')}</button
					>
					<button
						type="button"
						disabled={!data.store.delivery}
						class="btn {fulfillmentType === 'delivery' ? 'bg-ink text-white' : 'btn-secondary'}"
						aria-pressed={fulfillmentType === 'delivery'}
						onclick={() => (fulfillmentType = 'delivery')}>{t('checkout.delivery')}</button
					>
				</div>
				{#if fulfillmentType === 'dine_in'}
					<div>
						<label class="label" for="table">{t('checkout.table')}</label>
						<input
							id="table"
							class="field"
							maxlength="20"
							inputmode="numeric"
							bind:value={tableLabel}
						/>
					</div>
				{/if}
				<p class="text-sm text-muted">
					{t(fulfillmentType === 'delivery' ? 'checkout.etaDelivery' : 'checkout.eta', {
						minutes: data.store.prepTimeMinutes
					})}
				</p>
			</fieldset>

			{#if fulfillmentType === 'delivery'}
				<fieldset class="grid grid-cols-6 gap-3 card p-4">
					<legend class="px-1 font-semibold">{t('checkout.address')}</legend>
					<div class="col-span-3">
						<label class="label" for="cep">{t('checkout.cep')}</label><input
							id="cep"
							class="field"
							inputmode="numeric"
							autocomplete="postal-code"
							bind:value={addr.cep}
							placeholder="00000-000"
							required
						/>
					</div>
					<div class="col-span-3">
						<label class="label" for="hood">{t('checkout.neighborhood')}</label><input
							id="hood"
							class="field"
							bind:value={addr.neighborhood}
							required
						/>
					</div>
					<div class="col-span-4">
						<label class="label" for="street">{t('checkout.street')}</label><input
							id="street"
							class="field"
							autocomplete="address-line1"
							bind:value={addr.street}
							required
						/>
					</div>
					<div class="col-span-2">
						<label class="label" for="num">{t('checkout.number')}</label><input
							id="num"
							class="field"
							bind:value={addr.number}
							required
						/>
					</div>
					<div class="col-span-6">
						<label class="label" for="comp">{t('checkout.complement')}</label><input
							id="comp"
							class="field"
							autocomplete="address-line2"
							bind:value={addr.complement}
						/>
					</div>
					<div class="col-span-4">
						<label class="label" for="city">{t('checkout.city')}</label><input
							id="city"
							class="field"
							bind:value={addr.city}
							required
						/>
					</div>
					<div class="col-span-2">
						<label class="label" for="uf">{t('checkout.state')}</label><input
							id="uf"
							class="field uppercase"
							maxlength="2"
							bind:value={addr.state}
							required
						/>
					</div>
					<div class="col-span-6">
						<label class="label" for="inst">{t('checkout.reference')}</label><input
							id="inst"
							class="field"
							bind:value={addr.instructions}
						/>
					</div>
				</fieldset>
			{/if}

			<fieldset class="grid gap-3 card p-4">
				<legend class="px-1 font-semibold">{t('checkout.you')}</legend>
				<div>
					<label class="label" for="name">{t('checkout.name')}</label><input
						id="name"
						class="field"
						autocomplete="name"
						bind:value={name}
						required
					/>
				</div>
				<div>
					<label class="label" for="phone">{t('checkout.phone')}</label><input
						id="phone"
						class="field"
						type="tel"
						autocomplete="tel"
						bind:value={phone}
						placeholder="(11) 98765-4321"
						required
					/>
				</div>
				<div>
					<label class="label" for="email">{t('checkout.email')}</label><input
						id="email"
						class="field"
						type="email"
						autocomplete="email"
						bind:value={email}
					/>
				</div>
				<label class="flex items-start gap-2 text-sm"
					><input type="checkbox" class="mt-0.5 size-5" bind:checked={marketingConsent} />
					{t('checkout.marketing')}</label
				>
				<p class="text-xs text-muted">
					{t('checkout.privacy')}
					<a href="/p/privacidade" class="underline">{t('checkout.privacyLink')}</a>.
				</p>
			</fieldset>

			<fieldset class="space-y-2">
				<legend class="mb-2 text-lg font-bold">{t('checkout.payment')}</legend>
				{#if methods.length === 0}
					<p class="alert-warn">{t('checkout.noPayment')}</p>
				{/if}
				{#each methods as m (m.id)}
					<label
						class="flex cursor-pointer items-start gap-3 card p-3 {payment === m.id
							? 'border-brand-600 ring-1 ring-brand-600'
							: ''}"
					>
						<input
							type="radio"
							name="paymethod"
							class="mt-1 size-5"
							value={m.id}
							bind:group={payment}
						/>
						<span
							><span class="font-semibold">{m.label}</span><br /><span class="text-sm text-muted"
								>{m.hint}</span
							></span
						>
					</label>
				{/each}
			</fieldset>

			<section class="space-y-1 card p-4" aria-live="polite">
				<h2 class="mb-2 font-semibold">{t('checkout.summary')}</h2>
				{#if quote}
					{#each quote.lines as l, i (i)}
						<div class="flex justify-between text-sm">
							<span>{l.quantity}× {l.name}</span><Money cents={l.lineTotalCents} />
						</div>
					{/each}
					<div class="flex justify-between border-t border-line pt-2 text-sm">
						<span>{t('cart.subtotal')}</span><Money cents={quote.subtotalCents} />
					</div>
					{#if fulfillmentType === 'delivery'}
						<div class="flex justify-between text-sm">
							<span>{t('checkout.deliveryLine')}</span>{#if quote.deliveryError}<span>—</span
								>{:else}<Money cents={quote.deliveryFeeCents} />{/if}
						</div>
					{/if}
					<div class="flex justify-between text-lg font-bold">
						<span>{t('cart.total')}</span><Money cents={quote.totalCents} />
					</div>
					{#if quote.deliveryError}<p class="alert-error">{quote.deliveryError}</p>{/if}
				{:else if quoting}
					<p class="text-sm text-muted">{t('checkout.calculating')}</p>
				{:else if fulfillmentType === 'delivery'}
					<p class="text-sm text-muted">{t('checkout.enterCep')}</p>
				{/if}
				<FormError message={quoteError} />
			</section>

			<FormError message={placeError ?? form?.error} />
			<button
				class="btn-primary w-full text-lg"
				disabled={!canPlace || busy || methods.length === 0}
			>
				{busy
					? t('checkout.sending')
					: payment === 'on_fulfillment'
						? t('checkout.place')
						: t('checkout.goPay')}
			</button>
			<p class="text-center text-xs text-muted">
				{t('checkout.noHiddenFees')}
			</p>
		</form>
	{/if}
</section>
