<script lang="ts">
	import { goto } from '$app/navigation';
	import Money from '#lib/components/atoms/Money.svelte';
	import PaymentBadge from '#lib/components/atoms/PaymentBadge.svelte';
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
		<div class="card p-4">
			<div class="text-sm text-muted">Total recebido</div>
			<Money cents={totalPaid} class="text-2xl font-bold" />
		</div>
		<div class="card p-4">
			<div class="text-sm text-muted">Dinheiro esperado na gaveta</div>
			<Money cents={cash} class="text-2xl font-bold" />
		</div>
		<div class="card p-4">
			<div class="text-sm text-muted">iFood ({data.ifood.count} pedidos, pago no app)</div>
			<Money cents={data.ifood.amountCents} class="text-2xl font-bold" />
		</div>
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
