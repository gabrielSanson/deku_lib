<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
	import Timeline, { type Step } from '#lib/components/organisms/Timeline.svelte';
	import { fulfillmentLabel } from '#lib/domain/fulfillment.ts';
	import { enhance } from '$app/forms';
	import { getsReadyAlert, pickupCode } from '#lib/domain/pickup.ts';
	import { formatTime } from '#lib/domain/time.ts';
	import { rememberOrder } from '#lib/client/last-order.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	const o = $derived(data.order);
	const code = $derived(pickupCode(o.orderNumber));
	const collects = $derived(getsReadyAlert(o.fulfillmentType));
	const open = $derived(!['completed', 'cancelled', 'rejected'].includes(o.status));
	const ready = $derived(collects && o.status === 'ready');

	// "Avisar quando ficar pronto": web push, asked for only after the customer taps.
	type NotifyState = 'idle' | 'busy' | 'on' | 'blocked' | 'unsupported' | 'ios';
	let notify = $state<NotifyState>('idle');
	let subscription = $state<{ endpoint: string; p256dh: string; auth: string } | null>(null);
	let notifyForm = $state<HTMLFormElement>();
	const remembered = () => {
		try {
			return localStorage.getItem(`deku-aviso-${page.params.token}`) === '1';
		} catch {
			return false;
		}
	};

	function keyBytes(base64url: string) {
		const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
			.replace(/-/g, '+')
			.replace(/_/g, '/');
		return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
	}

	async function enableAlert() {
		if (!data.pushKey) return;
		notify = 'busy';
		try {
			if ((await Notification.requestPermission()) !== 'granted') {
				notify = 'blocked';
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const sub =
				(await reg.pushManager.getSubscription()) ??
				(await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: keyBytes(data.pushKey)
				}));
			const json = sub.toJSON();
			subscription = {
				endpoint: sub.endpoint,
				p256dh: json.keys?.p256dh ?? '',
				auth: json.keys?.auth ?? ''
			};
			// Wait for the hidden fields to update, then send them.
			await tick();
			notifyForm?.requestSubmit();
		} catch {
			notify = 'unsupported';
		}
	}

	// While the page is open it beeps and vibrates when the order is ready or called again.
	let lastSignal: string | null = null;
	function signalReady() {
		try {
			const audio = new AudioContext();
			for (const [i, f] of [1320, 990, 660].entries()) {
				const osc = audio.createOscillator();
				const gain = audio.createGain();
				osc.frequency.value = f;
				gain.gain.setValueAtTime(0.3, audio.currentTime + i * 0.2);
				gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + i * 0.2 + 0.35);
				osc.connect(gain).connect(audio.destination);
				osc.start(audio.currentTime + i * 0.2);
				osc.stop(audio.currentTime + i * 0.2 + 0.35);
			}
		} catch {
			/* audio blocked: the alert and the tab title still show */
		}
		navigator.vibrate?.([200, 100, 200]);
	}
	$effect(() => {
		const signal = ready ? `${o.readyAt}|${o.calledAt}` : '';
		if (lastSignal !== null && signal && signal !== lastSignal) signalReady();
		lastSignal = signal;
	});

	onMount(() => {
		const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
		const installed = matchMedia('(display-mode: standalone)').matches;
		const supported =
			!!data.pushKey &&
			'serviceWorker' in navigator &&
			'PushManager' in window &&
			'Notification' in window;
		if (!supported) notify = ios && !installed ? 'ios' : 'unsupported';
		else if (Notification.permission === 'denied') notify = 'blocked';
		else if (Notification.permission === 'granted' && remembered()) notify = 'on';
	});

	// At the totem the screen goes back to the menu for the next customer.
	const KIOSK_SECONDS = 45;
	let kioskLeft = $state(KIOSK_SECONDS);
	$effect(() => {
		if (!data.kiosk) return;
		const tick = setInterval(() => {
			kioskLeft -= 1;
			if (kioskLeft <= 0) goto('/cardapio');
		}, 1000);
		// Any touch gives the customer more time to read.
		const more = () => (kioskLeft = KIOSK_SECONDS);
		window.addEventListener('pointerdown', more);
		return () => {
			clearInterval(tick);
			window.removeEventListener('pointerdown', more);
		};
	});

	onMount(() => {
		// The totem is shared: it must not offer this order to the next customer.
		if (page.params.token && !data.kiosk) rememberOrder(page.params.token);
		const t = setInterval(
			() => document.visibilityState === 'visible' && invalidate('app:public-order'),
			10_000
		);
		return () => clearInterval(t);
	});

	// Three steps on the card (mockup 10). The first two are reached by the kitchen,
	// the last one depends on how the order is delivered.
	const rank: Record<string, number> = {
		new: 0,
		confirmed: 1,
		preparing: 2,
		ready: 3,
		completed: 4
	};
	const r = $derived(rank[o.status] ?? 0);
	const cancelled = $derived(o.status === 'cancelled' || o.status === 'rejected');
	const waitingPayment = $derived(o.status === 'new' && o.paymentStatus !== 'paid');
	const statusLabel = $derived(
		o.status === 'ready' && o.fulfillmentType === 'delivery'
			? t('order.step.out')
			: t(
					(
						{
							new: 'order.step.new',
							confirmed: 'order.step.confirmed',
							preparing: 'order.step.preparing',
							ready: 'order.step.ready',
							completed: 'order.step.completed'
						} as const
					)[o.status as 'new'] ?? 'order.step.new'
				)
	);
	const stepState = (reachedAt: number, doneAt: number): Step['state'] =>
		r >= doneAt ? 'done' : r === reachedAt ? 'current' : 'next';
	const timeline = $derived<Step[]>([
		{
			label: t('order.step.confirmed'),
			time: o.acceptedAt ? formatTime(o.acceptedAt) : null,
			state: stepState(1, 2)
		},
		{
			label: t('order.step.preparing'),
			hint: t('order.track.hintPreparing'),
			state: stepState(2, 3)
		},
		{
			label: o.fulfillmentType === 'delivery' ? t('order.step.out') : t('order.step.ready'),
			time: o.readyAt ? formatTime(o.readyAt) : null,
			hint: t('order.track.hintReady'),
			state: stepState(3, 4)
		}
	]);

	// Minutes left until the promised time, refreshed every 30 seconds.
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});
	const eta = $derived.by(() => {
		if (!o.promisedAt || !open || r >= 3) return null;
		const min = Math.ceil((new Date(o.promisedAt).getTime() - now) / 60_000);
		return min > 0
			? { label: t('order.track.etaLabel'), value: t('order.track.etaMinutes', { min }) }
			: { label: null, value: t('order.track.etaSoon') };
	});
	const isNew = $derived(page.url.searchParams.has('novo'));
</script>

<svelte:head
	><title
		>{ready
			? t('order.readyTabTitle', { number: code })
			: t('order.pageTitle', { number: o.orderNumber })}</title
	><meta name="robots" content="noindex" /></svelte:head
>

<section class="mx-auto max-w-2xl space-y-5 py-6">
	<div>
		<h1 class="page-title">{t('order.track.title')}</h1>
		<p class="mt-1 text-muted">{t('order.track.subtitle')}</p>
	</div>
	{#if isNew && !data.kiosk}<p class="alert-ok">{t('order.sent')}</p>{/if}

	<div class="space-y-5 rounded-(--radius-card) bg-night p-6 text-white">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<!-- The order number is also the code called out at the counter (pickupCode). -->
			<div>
				<h2
					class="font-display text-2xl font-black tracking-tight whitespace-nowrap tabular-nums min-[400px]:text-3xl sm:text-4xl"
				>
					{t('order.track.orderNumber', { number: code })}
				</h2>
				<p class="mt-1 text-stone-300">{fulfillmentLabel(o.fulfillmentType, o.tableLabel)}</p>
			</div>
			<span class="pill shrink-0 bg-brand-500 px-4 py-1.5 text-sm font-bold text-black"
				>{cancelled ? t('order.cancelled') : statusLabel}</span
			>
		</div>
		<hr class="border-night-line" />

		{#if cancelled}
			<p class="alert-error text-center">{t('order.cancelled')}</p>
		{:else if waitingPayment && o.paymentPlan === 'counter'}
			<p
				class="rounded-(--radius-control) bg-brand-500 p-4 text-center text-xl font-black text-black"
				role="status"
			>
				{t('order.kiosk.payAtCounter', { number: code })}
			</p>
		{:else if waitingPayment}
			<p class="rounded-(--radius-control) bg-night-2 p-4 text-center text-stone-200">
				{t('order.track.waitingPayment')}
			</p>
		{:else}
			<Timeline steps={timeline} dark />
		{/if}

		{#if eta && !cancelled && !waitingPayment}
			<div class="flex items-center gap-4 rounded-(--radius-control) bg-night-2 p-4">
				<Icon name="timer" class="size-8 shrink-0 text-brand-500" />
				<span class="h-10 w-px bg-night-line" aria-hidden="true"></span>
				<p class="flex flex-col">
					{#if eta.label}<span class="text-sm text-stone-300">{eta.label}</span>{/if}
					<span class="font-display text-3xl leading-tight font-black">{eta.value}</span>
				</p>
			</div>
		{/if}
	</div>

	{#if ready}
		<p class="rounded-xl bg-brand-500 p-5 text-center text-xl font-black text-black" role="alert">
			{t('order.readyPickup', { number: code })}
		</p>
	{:else if collects && open && !data.kiosk}
		<form
			method="POST"
			action="?/notify"
			bind:this={notifyForm}
			class="card p-4"
			use:enhance={() =>
				async ({ result }) => {
					if (result.type === 'success') {
						notify = 'on';
						try {
							localStorage.setItem(`deku-aviso-${page.params.token}`, '1');
						} catch {
							/* the alert still works; the card may show again after a reload */
						}
					} else notify = 'unsupported';
				}}
		>
			<input type="hidden" name="endpoint" value={subscription?.endpoint ?? ''} />
			<input type="hidden" name="p256dh" value={subscription?.p256dh ?? ''} />
			<input type="hidden" name="auth" value={subscription?.auth ?? ''} />
			{#if notify === 'on'}
				<p class="text-center font-semibold text-ok" role="status">✓ {t('order.notify.on')}</p>
			{:else if notify === 'blocked'}
				<p class="text-sm text-muted" role="status">{t('order.notify.blocked')}</p>
			{:else if notify === 'ios'}
				<p class="text-sm text-muted">{t('order.notify.ios')}</p>
			{:else if notify === 'unsupported'}
				<p class="text-sm text-muted">{t('order.notify.unsupported')}</p>
			{:else}
				<button
					type="button"
					class="btn-primary w-full text-lg"
					disabled={notify === 'busy'}
					onclick={enableAlert}>🔔 {t('order.notify.cta')}</button
				>
				<p class="mt-2 text-center text-sm text-muted">{t('order.notify.text')}</p>
			{/if}
		</form>
	{/if}

	<section class="space-y-1 card p-5 text-sm">
		<div class="mb-2 flex items-baseline justify-between">
			<h2 class="font-semibold">{t('order.track.itemsTitle')}</h2>
			<Money cents={o.totalCents} class="font-bold" />
		</div>
		{#each o.items as item, i (i)}
			<div class="flex justify-between gap-2">
				<span
					>{item.quantity}× {item.productName}{item.modifiers.length
						? ` (${item.modifiers.join(', ')})`
						: ''}</span
				><Money cents={item.lineTotalCents} />
			</div>
		{/each}
		{#if o.deliveryFeeCents}<div class="flex justify-between">
				<span>{t('order.delivery')}</span><Money cents={o.deliveryFeeCents} />
			</div>{/if}
		{#if o.discountCents}<div class="flex justify-between">
				<span>{t('order.discount')}{o.offerName ? ` · ${o.offerName}` : ''}</span><span
					>−<Money cents={o.discountCents} /></span
				>
			</div>{/if}
		<div class="flex justify-between border-t border-line pt-2 text-base font-bold">
			<span>{t('order.total')}</span><Money cents={o.totalCents} />
		</div>
		<div class="flex justify-between pt-1">
			<span>{t('order.payment')}</span><PaymentBadge status={o.paymentStatus} />
		</div>
	</section>

	{#if o.paymentPlan === 'pix_key' && o.status === 'new' && o.paymentStatus !== 'paid'}
		<a class="btn-primary w-full" href="/checkout/payment/{page.params.token}"
			>{t('order.payPix')}</a
		>
	{/if}
	<a class="relative btn-primary btn-lg w-full" href="/cardapio">
		<Icon name="burger" class="size-6" />{t(
			data.kiosk ? 'order.kiosk.newOrder' : 'order.track.menuCta'
		)}
		<Icon name="arrow" class="absolute right-5 size-5" />
	</a>
	{#if data.kiosk}
		<p class="text-center text-sm text-muted" aria-live="polite">
			{t('order.kiosk.returning', { seconds: kioskLeft })}
		</p>
	{/if}
</section>
