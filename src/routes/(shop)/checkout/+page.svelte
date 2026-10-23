<script lang="ts">
	import { untrack } from 'svelte';
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { cart } from '#lib/client/cart.svelte.ts';
	import ChoiceButtons from '#lib/components/molecules/ChoiceButtons.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import type { CheckoutPaymentMethod } from '#lib/domain/payment-rules.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();

	type Quote = {
		subtotalCents: number;
		deliveryFeeCents: number;
		discountCents: number;
		offerName: string | null;
		couponError: string | null;
		couponBlocks: boolean;
		totalCents: number;
		deliveryError: string | null;
		lines: { sku: string; name: string; quantity: number; lineTotalCents: number }[];
	};

	const STEPS = ['receive', 'address', 'you', 'payment', 'review'] as const;
	type StepKey = (typeof STEPS)[number];
	const STEP_LABEL: Record<
		StepKey,
		| 'checkout.step.receive'
		| 'checkout.step.address'
		| 'checkout.step.you'
		| 'checkout.step.payment'
		| 'checkout.step.review'
	> = {
		receive: 'checkout.step.receive',
		address: 'checkout.step.address',
		you: 'checkout.step.you',
		payment: 'checkout.step.payment',
		review: 'checkout.step.review'
	};

	let step = $state<StepKey>('receive');
	let fulfillmentType = $state<'dine_in' | 'pickup' | 'delivery'>('pickup');
	let tableLabel = $state('');
	let name = $state(untrack(() => data.prefill.name));
	let phone = $state(untrack(() => data.prefill.phone));
	let email = $state(untrack(() => data.prefill.email));
	let marketingConsent = $state(false);
	let couponInput = $state('');
	let couponCode = $state('');
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
	let payment = $state<CheckoutPaymentMethod>('pix_key');
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
		} else if (data.kiosk && data.store.dineIn) {
			fulfillmentType = 'dine_in';
		} else if (!data.store.pickup) {
			fulfillmentType = data.store.dineIn ? 'dine_in' : 'delivery';
		}
		if (data.onlineMethods.includes('pix')) payment = 'pix';
		else if (data.store.pixKey) payment = 'pix_key';
		else if (data.kiosk) payment = 'counter';
		else if (data.onlineMethods.length) payment = data.onlineMethods[0];
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
			couponCode: couponCode || undefined,
			idempotencyKey
		})
	);

	// Re-quote on the server whenever the cart, fulfillment or address changes.
	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const body = new FormData();
		// The quote reads the cart, address, coupon and phone (for once-per-customer offers).
		body.set('payload', payload);
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

	// At the totem, and when eating in, the order is called by number: the phone is optional.
	const phoneOptional = $derived(fulfillmentType === 'dine_in' || data.kiosk);
	const phoneOk = $derived(
		phoneOptional
			? // Eating in only needs a name to call out; the phone is optional.
				phone.trim().length === 0 || phone.trim().length >= 8
			: phone.trim().length >= 8
	);
	const canPlace = $derived(
		cart.lines.length > 0 &&
			data.store.open &&
			quote !== null &&
			!quote.deliveryError &&
			!(couponCode && quote.couponBlocks) &&
			name.trim().length >= 2 &&
			phoneOk
	);
	const addressOk = $derived(
		fulfillmentType !== 'delivery' ||
			(/^\d{5}-?\d{3}$/.test(addr.cep) &&
				addr.neighborhood.trim().length > 0 &&
				addr.street.trim().length > 0 &&
				addr.number.trim().length > 0 &&
				addr.city.trim().length > 0 &&
				addr.state.trim().length === 2)
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
		// Typing a card on a shared screen is not offered at the totem; the counter takes cards.
		...(data.onlineMethods.includes('online_card') && !data.kiosk
			? [
					{
						id: 'online_card',
						label: t('checkout.method.card'),
						hint: t('checkout.method.card.hint')
					}
				]
			: []),
		...(data.kiosk
			? [
					{
						id: 'counter',
						label: t('checkout.method.counter'),
						hint: t('checkout.method.counter.hint')
					}
				]
			: [])
	] as { id: typeof payment; label: string; hint: string }[]);

	// Each step must be finished before the customer moves on.
	const stepDone = $derived<Record<StepKey, boolean>>({
		receive: true,
		address: addressOk,
		you: name.trim().length >= 2 && phoneOk,
		payment: methods.length > 0,
		review: canPlace
	});
	// The totem never delivers, so it skips the address step.
	const steps = $derived<readonly StepKey[]>(
		data.kiosk ? STEPS.filter((s) => s !== 'address') : STEPS
	);
	const index = $derived(steps.indexOf(step));
	const isLast = $derived(index === steps.length - 1);
	function next() {
		if (stepDone[step] && index < steps.length - 1) step = steps[index + 1];
	}
	function back() {
		if (index > 0) step = steps[index - 1];
	}
</script>

<svelte:head><title>{t('checkout.title')} · {data.shopName}</title></svelte:head>

<section class="space-y-5 py-4 pb-44">
	<h1 class="text-2xl font-black">{t('checkout.title')}</h1>

	{#if cart.ready && cart.lines.length === 0}
		<div class="card p-6 text-center">
			<p class="mb-3 text-muted">{t('cart.empty')}</p>
			<a class="btn-primary" href="/cardapio">{t('cart.seeMenu')}</a>
		</div>
	{:else}
		<ol
			class="flex gap-2 text-xs font-semibold"
			aria-label={t('checkout.stepOf', { current: index + 1, total: steps.length })}
		>
			{#each steps as s, i (s)}
				<li
					class="flex-1 rounded-full px-2 py-1 text-center {i === index
						? 'bg-brand-500 text-black'
						: i < index
							? 'bg-ok-tint text-ok'
							: 'bg-quiet text-muted'}"
					aria-current={i === index ? 'step' : undefined}
				>
					{t(STEP_LABEL[s])}
				</li>
			{/each}
		</ol>

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
					if (result.type === 'redirect') {
						cart.clear();
						// Card payments continue on the provider's own page.
						if (new URL(result.location, location.href).origin !== location.origin) {
							location.href = result.location;
							return;
						}
					}
					await applyAction(result);
				};
			}}
		>
			<input type="hidden" name="payload" value={payload} />

			{#if step === 'receive'}
				<fieldset class="space-y-2">
					<legend class="mb-2 text-lg font-bold">{t('checkout.how')}</legend>
					<ChoiceButtons
						label={t('checkout.how')}
						class="grid gap-2 {data.store.dineIn && !data.kiosk ? 'grid-cols-3' : 'grid-cols-2'}"
						choices={[
							...(data.store.dineIn
								? [{ value: 'dine_in' as const, label: t('checkout.dineIn') }]
								: []),
							{
								value: 'pickup' as const,
								label: t('checkout.pickup'),
								disabled: !data.store.pickup
							},
							...(data.kiosk
								? []
								: [
										{
											value: 'delivery' as const,
											label: t('checkout.delivery'),
											disabled: !data.store.delivery
										}
									])
						]}
						bind:value={fulfillmentType}
					/>
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
			{:else if step === 'address'}
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
				{:else}
					<p class="card p-4 text-sm text-muted">{t('checkout.addressNotNeeded')}</p>
				{/if}
			{:else if step === 'you'}
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
						<label class="label" for="phone"
							>{phoneOptional ? t('checkout.phoneOptional') : t('checkout.phone')}</label
						><input
							id="phone"
							class="field"
							type="tel"
							autocomplete="tel"
							bind:value={phone}
							placeholder="(11) 98765-4321"
							required={!phoneOptional}
							aria-describedby={phoneOptional ? 'phone-hint' : undefined}
						/>
						{#if phoneOptional}<p id="phone-hint" class="mt-1 text-xs text-muted">
								{t('checkout.phoneOptional.hint')}
							</p>{/if}
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
			{:else if step === 'payment'}
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

				<div class="card p-4">
					<label class="label" for="coupon">{t('checkout.coupon')}</label>
					<div class="flex gap-2">
						<input
							id="coupon"
							class="field uppercase"
							maxlength="24"
							autocomplete="off"
							autocapitalize="characters"
							bind:value={couponInput}
							readonly={!!couponCode}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									couponCode = couponInput.trim();
								}
							}}
						/>
						{#if couponCode}
							<button
								type="button"
								class="btn-secondary"
								onclick={() => {
									couponCode = '';
									couponInput = '';
								}}>{t('checkout.coupon.remove')}</button
							>
						{:else}
							<button
								type="button"
								class="btn-secondary"
								disabled={!couponInput.trim()}
								onclick={() => (couponCode = couponInput.trim())}
								>{t('checkout.coupon.apply')}</button
							>
						{/if}
					</div>
					{#if couponCode && quote?.couponError}
						<p
							class="mt-2 {quote.couponBlocks ? 'alert-error' : 'text-sm text-muted'}"
							role="status"
						>
							{quote.couponError}
						</p>
					{/if}
				</div>
			{:else}
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
						{#if quote.discountCents > 0}
							<div class="flex justify-between text-sm font-semibold text-ok">
								<span
									>{t('checkout.discountLine')}{quote.offerName
										? ` · ${quote.offerName}`
										: ''}</span
								><span>− <Money cents={quote.discountCents} /></span>
							</div>
						{/if}
						{#if fulfillmentType === 'delivery'}
							<div class="flex justify-between text-sm">
								<span>{t('checkout.deliveryLine')}</span>{#if quote.deliveryError}<span>—</span
									>{:else}<Money cents={quote.deliveryFeeCents} />{/if}
							</div>
						{/if}
						{#if quote.deliveryError}<p class="alert-error">{quote.deliveryError}</p>{/if}
					{:else if quoting}
						<p class="text-sm text-muted">{t('checkout.calculating')}</p>
					{:else if fulfillmentType === 'delivery'}
						<p class="text-sm text-muted">{t('checkout.enterCep')}</p>
					{/if}
					<FormError message={quoteError} />
				</section>

				<FormError message={placeError ?? form?.error} />
				<p class="text-center text-xs text-muted">
					{t('checkout.noHiddenFees')}
				</p>
			{/if}

			<!-- Persistent total and step controls -->
			<div
				class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-4 shadow-(--shadow-card)"
			>
				<div class="mx-auto flex max-w-3xl items-center gap-3">
					<div class="min-w-0 flex-1">
						<p class="text-xs text-muted">{t('cart.total')}</p>
						<p class="text-lg font-bold">
							{#if quote}<Money cents={quote.totalCents} />{:else}—{/if}
						</p>
					</div>
					{#if index > 0}
						<button type="button" class="btn-ghost" onclick={back}>{t('checkout.back')}</button>
					{/if}
					{#if isLast}
						<button
							class="btn-primary text-lg"
							disabled={!canPlace || busy || methods.length === 0}
						>
							{busy
								? t('checkout.sending')
								: t(payment === 'counter' ? 'checkout.placeAtCounter' : 'checkout.goPay')}
						</button>
					{:else}
						<button type="button" class="btn-primary" disabled={!stepDone[step]} onclick={next}
							>{t('checkout.next')}</button
						>
					{/if}
				</div>
			</div>
		</form>
	{/if}
</section>
