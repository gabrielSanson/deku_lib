<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import ProductImage from '#lib/components/atoms/ProductImage.svelte';
	import StatusPill, { type PillTone } from '#lib/components/atoms/StatusPill.svelte';
	import ConfirmDialog from '#lib/components/molecules/ConfirmDialog.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import RowMenu from '#lib/components/molecules/RowMenu.svelte';
	import SegmentedTabs from '#lib/components/molecules/SegmentedTabs.svelte';
	import StatTile from '#lib/components/molecules/StatTile.svelte';
	import { TEMPLATES, isTemplateKey, type CampaignStatus } from '#lib/domain/campaigns.ts';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data, form } = $props();

	// Ending a campaign asks first, in a dialog.
	let ending = $state<{ id: string; name: string } | null>(null);
	let endOpen = $state(false);
	let endForm = $state<HTMLFormElement>();

	const STATUS: Record<CampaignStatus, { label: string; tone: PillTone }> = {
		draft: { label: 'Rascunho', tone: 'quiet' },
		active: { label: 'Ativa', tone: 'ok' },
		paused: { label: 'Pausada', tone: 'warn' },
		ended: { label: 'Encerrada', tone: 'quiet' }
	};
	const templateLabel = (k: string) => (isTemplateKey(k) ? TEMPLATES[k].label : k);
	const ret = (revenue: number, discount: number) =>
		discount > 0 ? `R$ ${(revenue / discount).toFixed(1).replace('.', ',')}` : '—';
	const brl = (cents: number) =>
		(cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

	const tabs = $derived(
		[
			{ key: 'todas', label: 'Todas' },
			{ key: 'ativas', label: 'Ativas' },
			{ key: 'rascunhos', label: 'Rascunhos' },
			{ key: 'encerradas', label: 'Encerradas' }
		].map((t) => ({
			...t,
			href: `?status=${t.key}&dias=${data.days}${data.q ? `&q=${encodeURIComponent(data.q)}` : ''}`
		}))
	);
	const periods = [7, 30, 90, 365];
	const periodLabel = $derived(
		data.days === 365 ? 'no último ano' : `nos últimos ${data.days} dias`
	);
</script>

<svelte:head><title>Campanhas · Equipe</title></svelte:head>

<main class="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="page-title">Campanhas</h1>
			<p class="mt-1 text-muted">
				Crie e gerencie campanhas promocionais para atrair mais clientes.
			</p>
		</div>
		<a class="btn-primary" href="/staff/campaigns/new">Nova campanha</a>
	</div>
	<FormError message={form?.error} />

	<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo das campanhas">
		<StatTile icon="crown" label="Ativas" value={String(data.totals.active)} hint="agora" />
		<StatTile
			icon="check"
			label="Usos no mês"
			value={String(data.totals.uses)}
			hint={periodLabel}
		/>
		<StatTile
			icon="tag"
			label="Desconto concedido"
			value={brl(data.totals.discountCents)}
			hint={periodLabel}
		/>
		<StatTile
			icon="users"
			label="Novos clientes"
			value={String(data.totals.newCustomers)}
			hint={periodLabel}
		/>
	</section>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<SegmentedTabs
			label="Status das campanhas"
			active={data.tab}
			tabs={tabs.map((t) => ({ key: t.key, label: t.label, href: t.href }))}
		/>
		<form method="GET" class="flex items-center gap-2">
			<input type="hidden" name="status" value={data.tab} />
			<input type="hidden" name="dias" value={data.days} />
			<div class="relative">
				<Icon
					name="search"
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
				/>
				<input
					class="field min-h-10 w-56 pl-9"
					type="search"
					name="q"
					value={data.q}
					placeholder="Buscar campanha ou cupom"
					aria-label="Buscar campanha ou cupom"
				/>
			</div>
			<select
				class="field min-h-10 w-auto"
				name="dias"
				aria-label="Período"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			>
				{#each periods as d (d)}
					<option value={d} selected={data.days === d}
						>{d === 365 ? 'Último ano' : `Últimos ${d} dias`}</option
					>
				{/each}
			</select>
		</form>
	</div>

	<div class="overflow-x-auto card">
		<table class="w-full text-sm">
			<thead class="bg-stone-50 text-left text-xs text-muted uppercase">
				<tr>
					<th class="p-3">Campanha</th>
					<th class="p-3">Benefício</th>
					<th class="p-3">Aplicação</th>
					<th class="p-3">Vigência</th>
					<th class="p-3 text-right">Usos</th>
					<th class="p-3 text-right">Desconto</th>
					<th class="p-3 text-right">Receita</th>
					<th class="p-3 text-right">Retorno</th>
					<th class="p-3 text-right">Novos</th>
					<th class="p-3 text-left">Status</th>
					<th class="p-3"><span class="sr-only">Ações</span></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each data.campaigns as c (c.id)}
					<tr class="hover:bg-quiet/50">
						<td class="p-3">
							<div class="flex items-center gap-3">
								<ProductImage src={c.imageUrl} tone="brand" class="size-12 shrink-0 rounded-lg" />
								<div class="min-w-0">
									<a
										class="font-semibold underline-offset-2 hover:underline"
										href="/staff/campaigns/{c.id}">{c.name}</a
									>
									{#if c.tagline}<p class="truncate text-xs text-muted">{c.tagline}</p>{/if}
								</div>
							</div>
						</td>
						<td class="p-3">{templateLabel(c.templateKey)}</td>
						<td class="p-3">{c.code ?? (c.autoApply ? 'Automática' : 'Sem código')}</td>
						<td class="p-3 text-xs text-muted">
							{#if c.startsAt}{formatDateTime(c.startsAt)}{:else}Sem início{/if}
							{#if c.endsAt}<br />até {formatDateTime(c.endsAt)}{/if}
						</td>
						<td class="p-3 text-right tabular-nums">{c.uses}</td>
						<td class="p-3 text-right"><Money cents={c.discountCents} /></td>
						<td class="p-3 text-right"><Money cents={c.revenueCents} /></td>
						<td class="p-3 text-right tabular-nums">{ret(c.revenueCents, c.discountCents)}</td>
						<td class="p-3 text-right tabular-nums">{c.newCustomers}</td>
						<td class="p-3">
							<StatusPill tone={STATUS[c.status].tone} label={STATUS[c.status].label} />
						</td>
						<td class="p-3">
							<RowMenu label="Mais ações de {c.name}">
								<form method="POST" action="?/status" use:enhance>
									<input type="hidden" name="id" value={c.id} />
									{#if c.status === 'active'}
										<button name="status" value="paused">Pausar</button>
									{:else if c.status !== 'ended'}
										<button name="status" value="active">Ativar</button>
									{/if}
									{#if c.status !== 'ended'}
										<button
											type="button"
											class="text-bad"
											onclick={() => {
												ending = { id: c.id, name: c.name };
												endOpen = true;
											}}>Encerrar</button
										>
									{/if}
								</form>
							</RowMenu>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="11" class="p-10 text-center text-muted">
							{data.total === 0
								? 'Nenhuma campanha ainda. Crie um cupom ou uma promoção automática.'
								: 'Nenhuma campanha com este filtro.'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="text-sm text-muted">Mostrando {data.campaigns.length} de {data.total} campanhas.</p>

	<form method="POST" action="?/status" use:enhance bind:this={endForm} hidden>
		<input type="hidden" name="id" value={ending?.id ?? ''} />
		<input type="hidden" name="status" value="ended" />
	</form>
	<ConfirmDialog
		bind:open={endOpen}
		title="Encerrar a campanha?"
		text="{ending?.name ?? 'A campanha'} deixa de valer. Os pedidos já feitos não mudam."
		confirmLabel="Encerrar"
		danger
		onconfirm={() => endForm?.requestSubmit()}
	/>

	<details class="card p-4 text-sm text-muted">
		<summary class="cursor-pointer font-semibold text-ink">Como funcionam as campanhas</summary>
		<p class="mt-3">
			Cada pedido usa uma promoção só: a de maior desconto. Pedidos cancelados, recusados ou
			estornados não contam. "Retorno" é quanto os pedidos pagaram para cada R$ 1 de desconto;
			inclui quem compraria de qualquer jeito, então serve para comparar campanhas.
		</p>
	</details>
</main>
