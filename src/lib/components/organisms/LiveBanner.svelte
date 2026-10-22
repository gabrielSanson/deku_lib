<script lang="ts">
	import { formatTime } from '#lib/domain/time.ts';
	import type { LiveState } from '#lib/client/live.svelte.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { live }: { live: LiveState } = $props();
	const t = useTexts();
	let online = $state(true);
	$effect(() => {
		online = navigator.onLine;
		const up = () => (online = true);
		const down = () => (online = false);
		window.addEventListener('online', up);
		window.addEventListener('offline', down);
		return () => {
			window.removeEventListener('online', up);
			window.removeEventListener('offline', down);
		};
	});
</script>

{#if !online}
	<div class="bg-bad px-4 py-2 text-center text-sm font-semibold text-white" role="status">
		{t('staff.offline')}
	</div>
{:else if !live.connected}
	<div class="bg-brand-tint px-4 py-1.5 text-center text-xs font-medium text-warn" role="status">
		{t('staff.polling', { time: formatTime(live.lastRefresh) })}
	</div>
{/if}
