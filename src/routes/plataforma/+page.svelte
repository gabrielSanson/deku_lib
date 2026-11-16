<script lang="ts">
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data } = $props();
	const date = (d: Date | string | null) => (d ? formatDateTime(d).split(' ')[0] : '—');
	const statusLabel: Record<string, string> = {
		trial: 'Em teste',
		active: 'Em dia',
		past_due: 'Em atraso',
		suspended: 'Suspensa',
		closed: 'Encerrada'
	};
</script>

<svelte:head><title>Lojas · Console da plataforma</title></svelte:head>

<h1 class="mb-4 page-title">Lojas ({data.shops.length})</h1>
<div class="overflow-x-auto card">
	<table class="w-full text-sm">
		<thead class="text-left text-muted">
			<tr>
				<th class="p-2">Loja</th>
				<th class="p-2">Situação</th>
				<th class="p-2">Plano</th>
				<th class="p-2">Teste até</th>
				<th class="p-2">Último pedido</th>
				<th class="p-2 text-right">Pedidos 7 dias</th>
				<th class="p-2 text-right">Alertas</th>
			</tr>
		</thead>
		<tbody>
			{#each data.shops as s (s.id)}
				<tr class="border-t border-line">
					<td class="p-2">
						<a class="font-bold underline" href="/plataforma/lojas/{s.id}">{s.name}</a>
						<div class="text-xs text-muted">{s.host ?? s.slug}</div>
					</td>
					<td class="p-2">{statusLabel[s.status] ?? s.status}</td>
					<td class="p-2">{s.plan}</td>
					<td class="p-2">{date(s.trialEndsAt)}</td>
					<td class="p-2">{date(s.lastOrderAt)}</td>
					<td class="p-2 text-right">{s.orders7d}</td>
					<td class="p-2 text-right">{s.openAlerts}</td>
				</tr>
			{:else}
				<tr><td class="p-4 text-muted" colspan="7">Nenhuma loja ainda.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
