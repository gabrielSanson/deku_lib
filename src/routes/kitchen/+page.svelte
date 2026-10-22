<script lang="ts">
	import { onMount } from 'svelte';
	import LiveBanner from '#lib/components/organisms/LiveBanner.svelte';
	import OrderCard from '#lib/components/organisms/OrderCard.svelte';
	import { useLiveOrders } from '#lib/client/live.svelte.ts';
	import { formatTime } from '#lib/domain/time.ts';
	import type { OrderSummary } from '#lib/server/orders/queries.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();

	let muted = $state(false);
	let station = $state('all');
	let known = new Set<string>();
	let knownReady = new Set<string>();
	let knownCalls = new Map<string, number>();
	let primed = false;
	let audio: AudioContext | null = null;
	// The board doubles as the TV near the counter: a ticking clock drives the call pulse.
	let now = $state(Date.now());

	/** New order: two rising tones. Ready or called: three falling tones, so the two never mix up. */
	function chime(tones = [880, 1320]) {
		if (muted) return;
		try {
			audio ??= new AudioContext();
			for (const [i, f] of tones.entries()) {
				const osc = audio.createOscillator();
				const gain = audio.createGain();
				osc.frequency.value = f;
				gain.gain.setValueAtTime(0.25, audio.currentTime + i * 0.18);
				gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + i * 0.18 + 0.3);
				osc.connect(gain).connect(audio.destination);
				osc.start(audio.currentTime + i * 0.18);
				osc.stop(audio.currentTime + i * 0.18 + 0.3);
			}
		} catch {
			/* audio blocked until the first tap; the visual cue still shows */
		}
	}

	const readyChime = () => chime([1320, 990, 660]);

	// Chime once per order that enters the queue, turns ready or is called after the screen loaded.
	$effect(() => {
		const ids = data.orders.filter((o) => o.status === 'confirmed').map((o) => o.id);
		const ready = data.orders.filter((o) => o.status === 'ready');
		const calls = new Map(ready.map((o) => [o.id, o.calledAt ? +new Date(o.calledAt) : 0]));
		if (primed) {
			if (
				ready.some((o) => !knownReady.has(o.id)) ||
				[...calls].some(([id, at]) => at && at !== knownCalls.get(id))
			)
				readyChime();
			else if (ids.some((id) => !known.has(id))) chime();
		}
		known = new Set(data.orders.map((o) => o.id));
		knownReady = new Set(ready.map((o) => o.id));
		knownCalls = calls;
		primed = true;
	});

	onMount(() => {
		const tick = setInterval(() => (now = Date.now()), 1000);
		// Keep the TV or tablet awake; the lock drops when the tab is hidden, so take it again.
		let lock: WakeLockSentinel | null = null;
		const awake = async () => {
			try {
				if (document.visibilityState === 'visible')
					lock = await navigator.wakeLock?.request('screen');
			} catch {
				/* not supported or refused: the screen may sleep */
			}
		};
		awake();
		document.addEventListener('visibilitychange', awake);
		return () => {
			clearInterval(tick);
			document.removeEventListener('visibilitychange', awake);
			lock?.release().catch(() => {});
		};
	});

	/** Pulse a ready card for 15 s after staff tap "Chamar". */
	const justCalled = (o: OrderSummary) => !!o.calledAt && now - +new Date(o.calledAt) < 15_000;
	/** Ready for more than 10 minutes and not collected: shown smaller, at the bottom. */
	const waiting = (o: OrderSummary) =>
		o.status === 'ready' && !!o.readyAt && now - +new Date(o.readyAt) > 10 * 60_000;

	const live = useLiveOrders(() => data.live);

	const stations = $derived([
		'all',
		...new Set(data.orders.flatMap((o) => o.items.map((i) => i.prepStation)))
	]);
	const stationLabel = (s: string) =>
		s === 'all' || s === 'grill' || s === 'fryer' || s === 'counter'
			? t(`kitchen.station.${s}`)
			: s;
	const visible = (o: OrderSummary) => ({
		...o,
		items: station === 'all' ? o.items : o.items.filter((i) => i.prepStation === station)
	});
	const lanes = $derived([
		{
			key: 'confirmed' as const,
			title: t('kitchen.lane.new'),
			rule: t('kitchen.rule.confirmed'),
			orders: data.orders.filter((o) => o.status === 'confirmed').map(visible)
		},
		{
			key: 'preparing' as const,
			title: t('kitchen.lane.preparing'),
			rule: t('kitchen.rule.preparing'),
			orders: data.orders.filter((o) => o.status === 'preparing').map(visible)
		},
		{
			key: 'ready' as const,
			title: t('kitchen.lane.ready'),
			rule: t('kitchen.rule.ready'),
			// Waiting-for-pickup orders sink below the fresh ones.
			orders: data.orders
				.filter((o) => o.status === 'ready')
				.sort((a, b) => Number(waiting(a)) - Number(waiting(b)))
				.map(visible)
		}
	]);
	const nextAction = $derived<Record<string, { to: string; label: string } | undefined>>({
		confirmed: { to: 'preparing', label: t('kitchen.action.start') },
		preparing: { to: 'ready', label: t('kitchen.action.ready') },
		ready: { to: 'completed', label: t('kitchen.action.delivered') }
	});
</script>

<svelte:head
	><title>{t('kitchen.title')}</title><link rel="manifest" href="/kitchen.webmanifest" /><meta
		name="theme-color"
		content="#0c0a09"
	/></svelte:head
>

<div class="min-h-dvh bg-night text-stone-50">
	<LiveBanner {live} />
	<header class="flex items-center gap-3 border-b border-stone-800 px-4 py-2">
		{#if data.staff.role === 'admin'}
			<a href="/staff" class="font-bold text-brand-500">{t('kitchen.back')}</a>
		{/if}
		<h1 class="text-xl font-black tracking-wide uppercase">{t('kitchen.title')}</h1>
		<div class="flex gap-1" role="radiogroup" aria-label={t('kitchen.station')}>
			{#each stations as s (s)}
				<button
					class="rounded-md px-3 py-2 text-sm font-semibold {station === s
						? 'bg-brand-500 text-black'
						: 'bg-stone-800'}"
					aria-pressed={station === s}
					onclick={() => (station = s)}>{stationLabel(s)}</button
				>
			{/each}
		</div>
		<span class="ml-auto text-sm text-stone-400"
			>{t('kitchen.updated', { time: formatTime(live.lastRefresh) })}</span
		>
		<button
			class="rounded-md bg-stone-800 px-3 py-2 text-sm font-semibold"
			aria-pressed={muted}
			onclick={() => {
				muted = !muted;
				if (!muted) chime();
			}}>{muted ? t('kitchen.sound.off') : t('kitchen.sound.on')}</button
		>
		{#if data.staff.role === 'kitchen'}
			<form method="POST" action="/staff/logout">
				<button class="rounded-md bg-stone-800 px-3 py-2 text-sm font-semibold"
					>{t('kitchen.logout')}</button
				>
			</form>
		{/if}
	</header>
	{#if form?.error}<p class="bg-red-700 px-4 py-2 font-semibold" role="alert">{form.error}</p>{/if}

	<main class="grid gap-3 p-3 md:grid-cols-3">
		{#each lanes as lane (lane.key)}
			<section aria-labelledby="lane-{lane.key}">
				<h2 id="lane-{lane.key}" class="mb-1 flex justify-between text-lg font-bold">
					{lane.title}<span class="text-stone-400 tabular-nums">{lane.orders.length}</span>
				</h2>
				<p class="mb-2 text-sm text-stone-400">{lane.rule}</p>
				<div class="space-y-3">
					{#each lane.orders as o (o.id)}
						{#if o.items.length}
							<OrderCard
								order={o}
								lane={lane.key}
								waiting={waiting(o)}
								called={lane.key === 'ready' && justCalled(o)}
								fresh={lane.key === 'confirmed' && !o.kitchenSeenAt}
								nextAction={nextAction[lane.key]}
							/>
						{/if}
					{:else}
						<p
							class="rounded-xl border border-dashed border-stone-700 p-6 text-center text-stone-500"
						>
							{t('kitchen.empty')}
						</p>
					{/each}
				</div>
			</section>
		{/each}
	</main>
</div>
