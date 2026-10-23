<script lang="ts">
	import { goto } from '$app/navigation';
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
	import AnalyticsMetric from '#lib/components/molecules/AnalyticsMetric.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { METHOD_LABEL_PT } from '#lib/domain/tender-labels.ts';
	import type { PaymentStatus } from '#lib/domain/order-status.ts';

	let { data } = $props();
	const paid = $derived(data.byMethod.filter((m) => m.status === 'paid'));
	const refunded = $derived(data.byMethod.filter((m) => m.status === 'refunded'));
	const totalPaid = $derived(paid.reduce((n, m) => n + m.amountCents, 0));
	const cash = $derived(paid.find((m) => m.method === 'cash')?.amountCents ?? 0);
</script>

<svelte:head><title>Caixa do dia · Equipe</title></svelte:head>

<main class="mx-auto max-w-4xl space-y-4 p-4">
	<div class="flex flex-wrap items-center gap-2">
		<h1 class="mr-auto page-title">Fechamento do dia</h1>
		<input
			class="field w-44"
			type="date"
			value={data.day}
			onchange={(e) => goto(`?day=${e.currentTarget.value}`)}
			aria-label="Dia"
		/>
	</div>
	<p class="text-sm text-muted">
		Confira o dinheiro na gaveta e os extratos da maquininha/PSP contra estes valores. Pagamentos
		pendentes ou desconhecidos não entram nos totais.
	</p>

	<section class="grid gap-3 sm:grid-cols-3">
		<AnalyticsMetric label="Total recebido" value={formatBRL(totalPaid)} />
		<AnalyticsMetric label="Vendas em dinheiro" value={formatBRL(cash)} />
		<AnalyticsMetric
			label="iFood ({data.ifood.count} pedidos, pago no app)"
			value={formatBRL(data.ifood.amountCents)}
		/>
	</section>

	<section class="card p-4">
		<h2 class="mb-2 font-semibold">Por forma de pagamento</h2>
		<table class="w-full text-sm">
			<thead
				><tr class="text-left text-muted"
					><th>Forma</th><th>Qtd.</th><th class="text-right">Recebido</th></tr
				></thead
			>
			<tbody>
				{#each paid as m (m.method)}<tr
						><td class="py-1"
							>{METHOD_LABEL_PT[m.method as keyof typeof METHOD_LABEL_PT] ?? m.method}</td
						><td>{m.count}</td><td class="text-right"><Money cents={m.amountCents} /></td></tr
					>{:else}<tr><td colspan="3" class="py-4 text-center text-muted">Nenhum pagamento.</td></tr
					>{/each}
				{#each refunded as m (m.method)}<tr class="text-bad"
						><td class="py-1"
							>Estornado · {METHOD_LABEL_PT[m.method as keyof typeof METHOD_LABEL_PT] ??
								m.method}</td
						><td>{m.count}</td><td class="text-right">−<Money cents={m.amountCents} /></td></tr
					>{/each}
			</tbody>
		</table>
	</section>

	<section class="card p-4">
		<h2 class="mb-2 font-semibold">
			Gaveta ({data.sessions.length} abertura{data.sessions.length === 1 ? '' : 's'})
		</h2>
		{#if data.sessions.length === 0}
			<p class="text-sm text-muted">O caixa não foi aberto neste dia.</p>
		{:else}
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>Aberto por</th><th>Fechado</th><th class="text-right">Esperado</th><th
							class="text-right">Contado</th
						><th class="text-right">Diferença</th></tr
					></thead
				>
				<tbody class="divide-y divide-line">
					{#each data.sessions as s (s.id)}
						<tr>
							<td class="py-2">{s.openedByName}</td>
							<td>{s.status === 'open' ? 'Ainda aberto' : (s.closedByName ?? '')}</td>
							<td class="text-right"
								>{#if s.expectedCents !== null}<Money cents={s.expectedCents} />{/if}</td
							>
							<td class="text-right"
								>{#if s.countedCents !== null}<Money cents={s.countedCents} />{/if}</td
							>
							<td class="text-right font-semibold {(s.differenceCents ?? 0) < 0 ? 'text-bad' : ''}"
								>{#if s.differenceCents !== null}<Money cents={s.differenceCents} />{/if}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section class="card p-4">
		<h2 class="mb-2 font-semibold">Divergências ({data.issues.length})</h2>
		{#if data.issues.length === 0}
			<p class="alert-ok">Tudo conferido: cada pedido do dia tem pagamento igual ao total.</p>
		{:else}
			<table class="w-full text-sm">
				<thead
					><tr class="text-left text-muted"
						><th>Pedido</th><th>Status</th><th>Pagamento</th><th class="text-right">Total</th><th
							class="text-right">Recebido</th
						></tr
					></thead
				>
				<tbody class="divide-y divide-line">
					{#each data.issues as i (i.id)}
						<tr>
							<td class="py-2"
								><a class="font-semibold underline" href="/staff/orders/{i.id}">#{i.orderNumber}</a
								></td
							>
							<td>{i.status}</td>
							<td><PaymentBadge status={i.paymentStatus as PaymentStatus} /></td>
							<td class="text-right"><Money cents={i.totalCents} /></td>
							<td class="text-right"><Money cents={i.paidCents} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
</main>
