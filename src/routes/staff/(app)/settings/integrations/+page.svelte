<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data, form } = $props();
	const s = $derived(data.ifood.summary);
	const statusClass: Record<string, string> = {
		processed: 'text-ok',
		sent: 'text-ok',
		ignored: 'text-muted',
		skipped: 'text-muted',
		received: 'text-warn',
		pending: 'text-warn',
		failed: 'text-bad font-semibold',
		dead: 'text-bad font-semibold'
	};
</script>

<svelte:head><title>Integrações · Equipe</title></svelte:head>

<div class="space-y-6">
	<FormError message={form?.error} />
	{#if form?.ok}<p class="alert-ok">{form.ok}</p>{/if}

	<section class="space-y-2 card p-4">
		<h2 class="text-lg font-bold">Pagamento online</h2>
		{#if data.paymentProvider === 'none'}
			<p class="alert-warn">
				Desligado. Clientes do site pagam na retirada ou na entrega. Ligar exige escolher um
				provedor (PSP) e configurar as credenciais.
			</p>
		{:else if data.paymentProvider === 'local_stub'}
			<p class="alert-warn">
				Simulador local ativo. Nenhum dinheiro real é cobrado. Não é permitido em produção.
			</p>
		{/if}
	</section>

	<section class="space-y-2 card p-4">
		<h2 class="text-lg font-bold">Cardápio (Directus)</h2>
		<p class="text-sm">
			{data.directus
				? 'Conectado. O cardápio do site e do caixa vem do Directus.'
				: 'Não configurado. Usando o cardápio de demonstração embutido.'}
		</p>
	</section>

	<section class="space-y-3 card p-4">
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-lg font-bold">iFood</h2>
			<span
				class="rounded-full px-3 py-1 text-xs font-semibold {data.ifood.enabled
					? 'bg-ok/15 text-ok'
					: 'bg-line text-muted'}">{data.ifood.enabled ? 'Ligado' : 'Desligado'}</span
			>
		</div>
		{#if !data.ifood.enabled}
			<p class="alert-warn">
				A integração está desligada (IFOOD_ENABLED). Ela foi escrita a partir da documentação
				pública do iFood e ainda não passou pela homologação. Enquanto isso, lance pedidos do iFood
				pelo Caixa usando "iFood (manual)".
			</p>
		{:else if !data.ifoodConfigured}
			<p class="alert-error">
				Ligada, mas faltam credenciais (IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET, IFOOD_MERCHANT_ID).
			</p>
		{/if}
		<dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
			<div>
				<dt class="text-muted">Último evento</dt>
				<dd>{s.last_event ? formatDateTime(s.last_event) : '—'}</dd>
			</div>
			<div>
				<dt class="text-muted">Último via polling</dt>
				<dd>{s.last_poll_event ? formatDateTime(s.last_poll_event) : '—'}</dd>
			</div>
			<div>
				<dt class="text-muted">Eventos em 24h</dt>
				<dd>{s.today}</dd>
			</div>
			<div>
				<dt class="text-muted">Aguardando confirmação</dt>
				<dd class={s.waiting ? 'font-semibold text-warn' : ''}>{s.waiting}</dd>
			</div>
			<div>
				<dt class="text-muted">Com falha</dt>
				<dd class={s.failed ? 'font-semibold text-bad' : ''}>{s.failed}</dd>
			</div>
			<div>
				<dt class="text-muted">Desistidos</dt>
				<dd class={s.dead ? 'font-semibold text-bad' : ''}>{s.dead}</dd>
			</div>
		</dl>

		<h3 class="pt-2 font-semibold">Envios para o iFood</h3>
		{#if data.ifood.outbound.length === 0}
			<p class="text-sm text-muted">Nenhum envio ainda.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-left text-muted"
						><tr
							><th class="py-1">Pedido</th><th>Ação</th><th>Situação</th><th>Tentativas</th><th
							></th></tr
						></thead
					>
					<tbody>
						{#each data.ifood.outbound as o (o.id)}
							<tr class="border-t border-line align-top">
								<td class="py-1"
									><a class="underline" href="/staff/orders/{o.order_id}">#{o.order_number}</a></td
								>
								<td>{o.action}</td>
								<td class={statusClass[o.status]}
									>{o.status}{#if o.last_error}<br /><span class="text-xs font-normal text-muted"
											>{o.last_error}</span
										>{/if}</td
								>
								<td>{o.attempts}</td>
								<td>
									{#if o.status === 'failed'}
										<form method="POST" action="?/retry" use:enhance>
											<input type="hidden" name="id" value={o.id} /><button
												class="btn-secondary min-h-9 px-3 text-xs">Tentar de novo</button
											>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<h3 class="pt-2 font-semibold">Eventos recebidos</h3>
		{#if data.ifood.events.length === 0}
			<p class="text-sm text-muted">Nenhum evento recebido.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-left text-muted"
						><tr><th class="py-1">Quando</th><th>Tipo</th><th>Via</th><th>Situação</th><th></th></tr
						></thead
					>
					<tbody>
						{#each data.ifood.events as e (e.id)}
							<tr class="border-t border-line align-top">
								<td class="py-1 whitespace-nowrap">{formatDateTime(e.received_at)}</td>
								<td>{e.event_type}</td>
								<td>{e.delivery_method}</td>
								<td class={statusClass[e.processing_status]}
									>{e.processing_status}{#if e.error}<br /><span
											class="text-xs font-normal text-muted">{e.error}</span
										>{/if}</td
								>
								<td>
									{#if e.processing_status === 'failed' || e.processing_status === 'dead' || e.processing_status === 'ignored'}
										<form method="POST" action="?/replay" use:enhance>
											<input type="hidden" name="id" value={e.id} /><button
												class="btn-secondary min-h-9 px-3 text-xs">Reprocessar</button
											>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
