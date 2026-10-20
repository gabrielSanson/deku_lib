<script lang="ts">
	// Minutes since a timestamp, refreshed every 15 s. Turns amber/red as it ages.
	import { onMount } from 'svelte';

	let {
		since,
		warnAfter = 10,
		lateAfter = 20
	}: { since: Date | string; warnAfter?: number; lateAfter?: number } = $props();

	let now = $state(Date.now());
	onMount(() => {
		const t = setInterval(() => (now = Date.now()), 15_000);
		return () => clearInterval(t);
	});
	const minutes = $derived(Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000)));
	const tone = $derived(
		minutes >= lateAfter
			? 'text-bad font-bold'
			: minutes >= warnAfter
				? 'text-warn font-semibold'
				: 'text-muted'
	);
</script>

<span class="tabular-nums {tone}" title={new Date(since).toLocaleString('pt-BR')}
	>{minutes} min</span
>
