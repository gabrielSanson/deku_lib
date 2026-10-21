<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import Money from '#lib/components/Money.svelte';
	import PaymentBadge from '#lib/components/PaymentBadge.svelte';
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

	onMount(() => {
		if (page.params.token) rememberOrder(page.params.token);
		const t = setInterval(
			() => document.visibilityState === 'visible' && invalidate('app:public-order'),
			10_000
		);
		return () => clearInterval(t);
	});

	const steps = $derived([
		{ key: 'new', label: t('order.step.new') },
		{ key: 'confirmed', label: t('order.step.confirmed') },
		{ key: 'preparing', label: t('order.step.preparing') },
		{
			key: 'ready',
			label: o.fulfillmentType === 'delivery' ? t('order.step.out') : t('order.step.ready')
		},
		{ key: 'completed', label: t('order.step.completed') }
	]);
	const idx = $derived(steps.findIndex((s) => s.key === o.status));
	const isNew = $derived(page.url.searchParams.has('novo'));
</script>

<svelte:head
	><title
		>{ready
			? t('order.readyTabTitle', { number: code })
			: t('order.pageTitle', { number: o.orderNumber })}</title
	><meta name="robots" content="noindex" /></svelte:head
>

<section class="space-y-5 py-6">
	{#if isNew}<p class="alert-ok">{t('order.sent')}</p>{/if}
	<div class="rounded-(--radius-card) bg-night p-6 text-center text-white">
		<!-- Collected at the counter: the order number is the code that is called out. -->
		<p class="text-sm font-semibold tracking-wide text-stone-300">
			{collects ? t('order.codeLabel') : t('order.label')}
		</p>
		<h1 class="font-display text-7xl font-black tracking-tight text-brand-500 tabular-nums">
			#{code}
		</h1>
		{#if o.promisedAt && idx >= 0 && idx < 4}<p class="mt-2 text-stone-300">
				{t('order.eta', { time: formatTime(o.promisedAt) })}
			</p>{/if}
	</div>

	{#if ready}
		<p class="rounded-xl bg-brand-500 p-5 text-center text-xl font-black text-black" role="alert">
			{t('order.readyPickup', { number: code })}
		</p>
	{:else if collects && open}
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

	{#if o.status === 'cancelled' || o.status === 'rejected'}
		<p class="alert-error text-center">
			{t('order.cancelled')}
		</p>
	{:else}
		<ol class="space-y-0 card p-5" aria-label={t('order.progress')}>
			{#each steps as s, i (s.key)}
				<li
					class="relative flex items-center gap-4 pb-5 last:pb-0 {i <= idx ? '' : 'opacity-50'}"
					aria-current={i === idx ? 'step' : undefined}
				>
					{#if i < steps.length - 1}
						<span
							class="absolute top-9 left-4 h-[calc(100%-1.25rem)] w-0.5 {i < idx
								? 'bg-ok'
								: 'bg-line'}"
							aria-hidden="true"
						></span>
					{/if}
					<span
						class="relative grid size-9 shrink-0 place-items-center rounded-full text-sm font-black {i <
						idx
							? 'bg-ok text-white'
							: i === idx
								? 'bg-brand-500 text-black ring-4 ring-brand-100'
								: 'bg-quiet text-stone-500'}">{i < idx ? '✓' : i + 1}</span
					>
					<span class={i === idx ? 'text-lg font-extrabold' : 'font-medium'}>{s.label}</span>
				</li>
			{/each}
		</ol>
	{/if}

	<div class="space-y-1 card p-5 text-sm">
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
	</div>
	{#if o.paymentPlan === 'pix_key' && o.status === 'new' && o.paymentStatus !== 'paid'}
		<a class="btn-primary w-full" href="/checkout/payment/{page.params.token}"
			>{t('order.payPix')}</a
		>
	{/if}
	<a class="btn-secondary w-full" href="/">{t('errors.backToMenu')}</a>
</section>
