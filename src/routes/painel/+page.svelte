<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();

	const preparing = $derived(data.orders.filter((o) => o.status === 'preparing'));
	// Newest ready order first, so the one just called sits at the top.
	const ready = $derived(data.orders.filter((o) => o.status === 'ready').reverse());

	let audio: AudioContext | null = null;
	let soundOn = $state(false);
	let seen: Set<string> | null = null;
	let flash = $state<string | null>(null);

	function chime() {
		if (!audio) return;
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
	}

	function enableSound() {
		try {
			audio ??= new AudioContext();
			void audio.resume();
			soundOn = true;
			chime();
		} catch {
			/* no audio on this device: the screen still updates */
		}
	}

	// Chime and highlight when an order turns ready or is called again.
	$effect(() => {
		const keys = ready.map((o) => o.alertKey).filter((k): k is string => !!k);
		if (seen) {
			const fresh = ready.find((o) => o.alertKey && !seen!.has(o.alertKey));
			if (fresh) {
				flash = fresh.code;
				chime();
				setTimeout(() => (flash = null), 12_000);
			}
		}
		seen = new Set(keys);
	});

	onMount(() => {
		const poll = setInterval(() => invalidate('app:board'), 4000);
		let lock: WakeLockSentinel | null = null;
		const awake = async () => {
			try {
				if (document.visibilityState === 'visible')
					lock = await navigator.wakeLock?.request('screen');
			} catch {
				/* the screen may sleep */
			}
		};
		awake();
		document.addEventListener('visibilitychange', awake);
		return () => {
			clearInterval(poll);
			document.removeEventListener('visibilitychange', awake);
			lock?.release().catch(() => {});
		};
	});
</script>

<svelte:head><title>{data.shopName} · Pedidos</title></svelte:head>

<!-- Browsers only allow sound after a tap; the first tap anywhere turns it on. -->
<svelte:window onpointerdown={() => !soundOn && enableSound()} />

<main class="grid min-h-dvh grid-cols-[2fr_3fr] bg-stone-950 text-white select-none">
	<section class="border-r border-stone-800 p-6">
		<h1 class="mb-6 text-4xl font-black tracking-wide text-stone-300 uppercase">
			{t('board.preparing')}
		</h1>
		<ul class="flex flex-wrap content-start gap-x-10 gap-y-4" aria-live="polite">
			{#each preparing as o (o.code)}
				<li class="text-6xl font-black text-stone-300 tabular-nums">{o.code}</li>
			{/each}
		</ul>
	</section>

	<section class="p-6">
		<h2 class="mb-6 text-4xl font-black tracking-wide text-brand-400 uppercase">
			{t('board.ready')}
		</h2>
		{#if ready.length === 0 && preparing.length === 0}
			<p class="text-2xl text-stone-500">{t('board.empty')}</p>
		{/if}
		<ul class="flex flex-wrap content-start gap-5" aria-live="assertive">
			{#each ready as o (o.code)}
				<li
					class="rounded-2xl px-6 py-3 text-8xl font-black tabular-nums {flash === o.code
						? 'animate-pulse bg-brand-400 text-black'
						: 'bg-stone-800 text-brand-400'}"
				>
					{o.code}
				</li>
			{/each}
		</ul>
	</section>

	{#if !soundOn}
		<p class="fixed right-4 bottom-4 rounded-lg bg-stone-800 px-4 py-2 text-lg text-stone-300">
			{t('board.sound')}
		</p>
	{/if}
</main>
