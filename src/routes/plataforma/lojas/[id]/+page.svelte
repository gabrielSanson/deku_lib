<script lang="ts">
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data, form } = $props();
	const shop = $derived(data.shop);
	const date = (d: Date | string | null) => (d ? formatDateTime(d) : '—');
	const statusLabel: Record<string, string> = {
		trial: 'Em teste',
		active: 'Em dia',
		past_due: 'Em atraso',
		suspended: 'Suspensa',
		closed: 'Encerrada'
	};
	const invoiceLabel: Record<string, string> = { open: 'Aberta', paid: 'Paga', void: 'Cancelada' };
</script>

<svelte:head><title>{shop.name} · Console da plataforma</title></svelte:head>

<div class="space-y-4">
	<div>
		<a class="text-sm underline" href="/plataforma">← Lojas</a>
		<h1 class="page-title">{shop.name}</h1>
		<p class="text-sm text-muted">
			{shop.slug} · {statusLabel[shop.status] ?? shop.status} · plano {shop.plan} · criada em
			{date(shop.created_at)}
			{#if shop.trial_ends_at}· teste até {date(shop.trial_ends_at)}{/if}
		</p>
	</div>

	{#if form && 'done' in form && form.done}<p class="alert-ok">{form.done}</p>{/if}
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />

	<section class="flex flex-wrap items-end gap-2 card p-4">
		<form method="post" action="?/view" target="_blank">
			<button class="btn-secondary">Ver como a loja</button>
		</form>
		{#if shop.status === 'suspended'}
			<form method="post" action="?/reactivate"><button class="btn-primary">Reativar</button></form>
		{:else if shop.status !== 'closed'}
			<form method="post" action="?/suspend"><button class="btn-danger">Suspender</button></form>
		{/if}
		<form method="post" action="?/extend" class="flex items-end gap-2">
			<label class="text-sm">
				Estender teste (dias)
				<input class="input w-24" name="days" type="number" min="1" max="90" value="14" />
			</label>
			<button class="btn-secondary">Estender</button>
		</form>
	</section>

	<section class="card p-4">
		<h2 class="mb-2 text-lg font-bold">Faturas</h2>
		{#each data.invoices as inv (inv.id)}
			<div class="flex flex-wrap items-center gap-3 border-t border-line py-2 text-sm">
				<span>{inv.periodStart} a {inv.periodEnd}</span>
				<span>{formatBRL(inv.amountCents)}</span>
				<span>{invoiceLabel[inv.status] ?? inv.status}</span>
				<span class="text-muted">vence {date(inv.dueAt)}</span>
				{#if inv.status === 'open'}
					<form method="post" action="?/paid">
						<input type="hidden" name="invoiceId" value={inv.id} />
						<button class="btn-secondary">Marcar como paga</button>
					</form>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-muted">Nenhuma fatura.</p>
		{/each}
	</section>

	<section class="grid gap-4 md:grid-cols-2">
		<div class="card p-4">
			<h2 class="mb-2 text-lg font-bold">Equipe</h2>
			<ul class="space-y-1 text-sm">
				{#each data.members as m (m.user_id)}
					<li>
						{m.display_name} · {m.role}{m.active ? '' : ' (inativo)'}
						<span class="text-muted">{m.email ?? ''}</span>
					</li>
				{/each}
			</ul>
		</div>
		<div class="card p-4">
			<h2 class="mb-2 text-lg font-bold">Endereços</h2>
			<ul class="space-y-1 text-sm">
				{#each data.domains as d (d.host)}
					<li>{d.host} · {d.kind}{d.verified_at ? '' : ' (não verificado)'}</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="card p-4">
		<h2 class="mb-2 text-lg font-bold">Falhas de tarefas</h2>
		{#each data.failedJobs as j (j.id)}
			<div class="border-t border-line py-1 text-sm">
				{j.name} · {date(j.completed_on)}
				<code class="block text-xs break-all text-muted">{JSON.stringify(j.output)}</code>
			</div>
		{:else}
			<p class="text-sm text-muted">Nenhuma falha.</p>
		{/each}
	</section>

	<section class="card p-4">
		<h2 class="mb-2 text-lg font-bold">Últimos registros</h2>
		<ul class="space-y-1 text-sm">
			{#each data.audit as a (a.id)}
				<li>
					<span class="text-muted">{date(a.created_at)}</span>
					{a.actor_type} · {a.action} · {a.object_type}
				</li>
			{:else}
				<li class="text-muted">Nada registrado.</li>
			{/each}
		</ul>
	</section>
</div>
