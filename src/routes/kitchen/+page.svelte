<script lang="ts">
	import { enhance } from '$app/forms';
	import Age from '#lib/components/Age.svelte';
	import LiveBanner from '#lib/components/LiveBanner.svelte';
	import { useLiveOrders } from '#lib/client/live.svelte.ts';
	import { formatTime } from '#lib/domain/time.ts';
	import type { OrderSummary } from '#lib/server/orders/queries.ts';

	let { data, form } = $props();

	let muted = $state(false);
	let station = $state('all');
	let known = new Set<string>();
	let primed = false;
	let audio: AudioContext | null = null;

	function chime() {
		if (muted) return;
		try {
			audio ??= new AudioContext();
			for (const [i, f] of [880, 1320].entries()) {
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

	// Chime once per order that enters the queue after the screen loaded.
	$effect(() => {
		const ids = data.orders.filter((o) => o.status === 'confirmed').map((o) => o.id);
		if (primed && ids.some((id) => !known.has(id))) chime();
		known = new Set(data.orders.map((o) => o.id));
		primed = true;
	});

	const live = useLiveOrders(() => data.live);

	const stations = $derived([
		'all',
		...new Set(data.orders.flatMap((o) => o.items.map((i) => i.prepStation)))
	]);
	const stationLabel: Record<string, string> = {
		all: 'Todas',
		grill: 'Chapa',
		fryer: 'Fritadeira',
		counter: 'Balcão'
	};
	const visible = (o: OrderSummary) => ({
		...o,
		items: station === 'all' ? o.items : o.items.filter((i) => i.prepStation === station)
	});
	const lanes = $derived([
		{
			key: 'confirmed',
			title: 'Novos',
			orders: data.orders.filter((o) => o.status === 'confirmed').map(visible)
		},
		{
			key: 'preparing',
			title: 'Em preparo',
			orders: data.orders.filter((o) => o.status === 'preparing').map(visible)
		},
		{
			key: 'ready',
			title: 'Prontos',
			orders: data.orders.filter((o) => o.status === 'ready').map(visible)
		}
	]);
	const nextAction: Record<string, { to: string; label: string } | undefined> = {
		confirmed: { to: 'preparing', label: 'Iniciar' },
		preparing: { to: 'ready', label: 'Pronto' },
		ready: { to: 'completed', label: 'Entregue' }
	};
	const fulfillment: Record<string, string> = {
		counter: 'BALCÃO',
		pickup: 'VIAGEM',
		delivery: 'ENTREGA'
	};
</script>

<svelte:head
	><title>Cozinha</title><link rel="manifest" href="/kitchen.webmanifest" /><meta
		name="theme-color"
		content="#0c0a09"
	/></svelte:head
>

<div class="min-h-dvh bg-stone-950 text-stone-50">
	<LiveBanner {live} />
	<header class="flex items-center gap-3 border-b border-stone-800 px-4 py-2">
		{#if data.staff.role === 'admin'}
			<a href="/staff" class="font-bold text-orange-400">← Painel</a>
		{/if}
		<h1 class="text-xl font-black tracking-wide">COZINHA</h1>
		<div class="flex gap-1" role="radiogroup" aria-label="Estação">
			{#each stations as s (s)}
				<button
					class="rounded-md px-3 py-2 text-sm font-semibold {station === s
						? 'bg-orange-500 text-black'
						: 'bg-stone-800'}"
					aria-pressed={station === s}
					onclick={() => (station = s)}>{stationLabel[s] ?? s}</button
				>
			{/each}
		</div>
		<span class="ml-auto text-sm text-stone-400">Atualizado {formatTime(live.lastRefresh)}</span>
		<button
			class="rounded-md bg-stone-800 px-3 py-2 text-sm font-semibold"
			aria-pressed={muted}
			onclick={() => {
				muted = !muted;
				if (!muted) chime();
			}}>{muted ? '🔇 Som desligado' : '🔔 Som ligado'}</button
		>
		{#if data.staff.role === 'kitchen'}
			<form method="POST" action="/staff/logout">
				<button class="rounded-md bg-stone-800 px-3 py-2 text-sm font-semibold">Sair</button>
			</form>
		{/if}
	</header>
	{#if form?.error}<p class="bg-red-700 px-4 py-2 font-semibold" role="alert">{form.error}</p>{/if}

	<main class="grid gap-3 p-3 md:grid-cols-3">
		{#each lanes as lane (lane.key)}
			<section aria-labelledby="lane-{lane.key}">
				<h2 id="lane-{lane.key}" class="mb-2 flex justify-between text-lg font-bold">
					{lane.title}<span class="text-stone-400 tabular-nums">{lane.orders.length}</span>
				</h2>
				<div class="space-y-3">
					{#each lane.orders as o (o.id)}
						{#if o.items.length}
							<article
								class="rounded-xl border-2 p-3 {lane.key === 'confirmed' && !o.kitchenSeenAt
									? 'animate-pulse border-orange-400 bg-stone-900'
									: 'border-stone-700 bg-stone-900'}"
							>
								<header class="mb-2 flex items-baseline justify-between gap-2">
									<span class="text-3xl font-black tabular-nums">#{o.orderNumber}</span>
									<span class="text-xs font-bold tracking-wider text-orange-300">
										{o.channel === 'ifood'
											? `IFOOD ${o.channelDisplayId ?? ''} · `
											: o.channel === 'web'
												? 'SITE · '
												: ''}{fulfillment[o.fulfillmentType]}
									</span>
									<span class="text-lg"
										><Age since={o.acceptedAt ?? o.createdAt} warnAfter={12} lateAfter={20} /></span
									>
								</header>
								{#if o.customerLabel}<p class="mb-1 text-sm text-stone-300">
										{o.customerLabel}
									</p>{/if}
								<ul class="space-y-1.5">
									{#each o.items as item (item.id)}
										<li>
											<p class="text-lg leading-tight font-bold">
												{item.quantity}× {item.productName}
											</p>
											{#each item.modifiers as m, i (i)}
												<p
													class="pl-4 text-base {m.optionName.startsWith('Sem ')
														? 'font-semibold text-red-300'
														: 'text-stone-200'}"
												>
													{m.quantity > 1 ? `${m.quantity}× ` : ''}{m.optionName}
												</p>
											{/each}
											{#if item.allergyFlag}<p class="pl-4 font-black text-red-400">
													⚠ ALERGIA
												</p>{/if}
											{#if item.note}<p class="pl-4 text-yellow-200 italic">“{item.note}”</p>{/if}
										</li>
									{/each}
								</ul>
								{#if o.notes}<p class="mt-2 rounded bg-yellow-900/60 p-2 text-sm">{o.notes}</p>{/if}
								<footer class="mt-3 flex gap-2">
									{#if lane.key === 'confirmed' && !o.kitchenSeenAt}
										<form method="POST" action="?/seen" use:enhance class="flex-1">
											<input type="hidden" name="orderId" value={o.id} />
											<button class="min-h-12 w-full rounded-lg bg-stone-700 font-bold"
												>Visto</button
											>
										</form>
									{/if}
									{#if nextAction[lane.key]}
										<form method="POST" action="?/move" use:enhance class="flex-1">
											<input type="hidden" name="orderId" value={o.id} />
											<input type="hidden" name="to" value={nextAction[lane.key]?.to} />
											<button
												class="min-h-12 w-full rounded-lg bg-orange-500 text-lg font-black text-black"
											>
												{nextAction[lane.key]?.label}
											</button>
										</form>
									{/if}
								</footer>
								{#if o.promisedAt}<p class="mt-1 text-right text-xs text-stone-400">
										Prometido {formatTime(o.promisedAt)}
									</p>{/if}
							</article>
						{/if}
					{:else}
						<p
							class="rounded-xl border border-dashed border-stone-700 p-6 text-center text-stone-500"
						>
							Vazio
						</p>
					{/each}
				</div>
			</section>
		{/each}
	</main>
</div>
