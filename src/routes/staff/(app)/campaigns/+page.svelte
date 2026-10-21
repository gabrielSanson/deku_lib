<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import Money from '#lib/components/Money.svelte';
	import { TEMPLATES, isTemplateKey, type CampaignStatus } from '#lib/domain/campaigns.ts';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data, form } = $props();

	const STATUS: Record<CampaignStatus, { label: string; cls: string }> = {
		draft: { label: 'Rascunho', cls: 'bg-stone-100 text-muted' },
		active: { label: 'Ativa', cls: 'bg-green-100 text-ok' },
		paused: { label: 'Pausada', cls: 'bg-amber-100 text-warn' },
		ended: { label: 'Encerrada', cls: 'bg-stone-100 text-muted' }
	};
	const templateLabel = (k: string) => (isTemplateKey(k) ? TEMPLATES[k].label : k);
	const ret = (revenue: number, discount: number) =>
		discount > 0 ? `R$ ${(revenue / discount).toFixed(1).replace('.', ',')}` : '—';
</script>

<svelte:head><title>Campanhas · Equipe</title></svelte:head>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-xl font-bold">Campanhas e cupons</h1>
		<a class="btn-primary" href="/staff/campaigns/new">Nova campanha</a>
	</div>
	<p class="text-sm text-muted">
		Cada pedido usa uma promoção só: a de maior desconto. Pedidos cancelados, recusados ou
		estornados não contam. "Retorno" é quanto os pedidos pagaram para cada R$ 1 de desconto; inclui
		quem compraria de qualquer jeito, então serve para comparar campanhas.
	</p>
	<FormError message={form?.error} />

	<nav class="flex gap-2 text-sm" aria-label="Período">
		{#each [7, 30, 90, 365] as d (d)}
			<a
				href="?dias={d}"
				class="btn min-h-9 px-3 {data.days === d ? 'bg-ink text-white' : 'btn-secondary'}"
				aria-current={data.days === d ? 'page' : undefined}>{d === 365 ? '1 ano' : `${d} dias`}</a
			>
		{/each}
	</nav>

	<div class="overflow-x-auto card">
		<table class="w-full text-sm">
			<thead class="bg-stone-50 text-left text-xs text-muted uppercase">
				<tr>
					<th class="p-3">Campanha</th>
					<th class="p-3">Status</th>
					<th class="p-3 text-right">Usos</th>
					<th class="p-3 text-right">Desconto dado</th>
					<th class="p-3 text-right">Receita</th>
					<th class="p-3 text-right">Retorno</th>
					<th class="p-3 text-right">Clientes novos</th>
					<th class="p-3"><span class="sr-only">Ações</span></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each data.campaigns as c (c.id)}
					<tr>
						<td class="p-3">
							<a
								class="font-semibold underline-offset-2 hover:underline"
								href="/staff/campaigns/{c.id}">{c.name}</a
							>
							<p class="text-xs text-muted">
								{templateLabel(c.templateKey)} · {c.code ??
									(c.autoApply ? 'automática' : 'sem código')}
								{#if c.endsAt}· até {formatDateTime(c.endsAt)}{/if}
							</p>
						</td>
						<td class="p-3">
							<span class="rounded-full px-2 py-0.5 text-xs font-semibold {STATUS[c.status].cls}"
								>{STATUS[c.status].label}</span
							>
						</td>
						<td class="p-3 text-right tabular-nums">{c.uses}</td>
						<td class="p-3 text-right"><Money cents={c.discountCents} /></td>
						<td class="p-3 text-right"><Money cents={c.revenueCents} /></td>
						<td class="p-3 text-right tabular-nums">{ret(c.revenueCents, c.discountCents)}</td>
						<td class="p-3 text-right tabular-nums">{c.newCustomers}</td>
						<td class="p-3">
							<form method="POST" action="?/status" use:enhance class="flex justify-end gap-1">
								<input type="hidden" name="id" value={c.id} />
								{#if c.status === 'active'}
									<button class="btn-secondary min-h-9 px-3" name="status" value="paused"
										>Pausar</button
									>
								{:else if c.status !== 'ended'}
									<button class="btn-secondary min-h-9 px-3" name="status" value="active"
										>Ativar</button
									>
								{/if}
								{#if c.status !== 'ended'}
									<button
										class="btn-ghost min-h-9 px-3"
										name="status"
										value="ended"
										onclick={(e) => {
											if (!confirm('Encerrar a campanha? Os pedidos já feitos não mudam.'))
												e.preventDefault();
										}}>Encerrar</button
									>
								{/if}
							</form>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="8" class="p-10 text-center text-muted">
							Nenhuma campanha ainda. Crie um cupom ou uma promoção automática.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
