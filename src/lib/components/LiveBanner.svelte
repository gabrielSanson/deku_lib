<script lang="ts">
	import { formatTime } from '#lib/domain/time.ts';
	import type { LiveState } from '#lib/client/live.svelte.ts';

	let { live }: { live: LiveState } = $props();
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
		Sem internet. Os pedidos podem estar desatualizados (última atualização {formatTime(live.lastRefresh)}).
	</div>
{:else if !live.connected}
	<div class="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900" role="status">
		Conexão ao vivo indisponível. Atualizando a cada 8 s (última {formatTime(live.lastRefresh)}).
	</div>
{/if}
