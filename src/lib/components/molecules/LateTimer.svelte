<script lang="ts">
	// Minutes since an order was placed, red once its promised time has passed.
	import { onMount } from 'svelte';

	let {
		since,
		deadline = null,
		suffix = 'min'
	}: { since: string; deadline?: string | null; suffix?: string } = $props();

	let now = $state(Date.now());
	onMount(() => {
		const id = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(id);
	});
	const minutes = $derived(Math.max(0, Math.floor((now - Date.parse(since)) / 60_000)));
	const late = $derived(deadline != null && now > Date.parse(deadline));
</script>

<span class="font-semibold tabular-nums {late ? 'text-bad' : ''}" class:late
	>{minutes} {suffix}</span
>
