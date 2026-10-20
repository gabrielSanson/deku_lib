<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data, form } = $props();
	const s = $derived(data.settings);
	let pauseReason = $state('');
</script>

<svelte:head><title>Loja · Configurações</title></svelte:head>

<div class="space-y-4">
	<section class="card flex flex-wrap items-center justify-between gap-3 p-4 {s.acceptingOrders ? '' : 'border-red-300 bg-red-50'}">
		<div>
			<h1 class="text-xl font-bold">{s.acceptingOrders ? 'Loja aberta' : 'Loja pausada'}</h1>
			<p class="text-sm text-muted">
				{s.acceptingOrders ? 'Pedidos online estão sendo aceitos.' : (s.pauseReason ?? '')} · atualizado {formatDateTime(s.updatedAt)}
			</p>
		</div>
		<form method="POST" action="?/toggle" use:enhance class="flex gap-2">
			<input type="hidden" name="open" value={s.acceptingOrders ? '0' : '1'} />
			{#if s.acceptingOrders}
				<input class="field" name="pauseReason" placeholder="Motivo da pausa" bind:value={pauseReason} />
				<button class="btn-danger whitespace-nowrap">Pausar pedidos</button>
			{:else}
				<button class="btn-primary">Abrir loja</button>
			{/if}
		</form>
	</section>

	<form method="POST" action="?/save" use:enhance={() => async ({ update }) => update({ reset: false })} class="card space-y-4 p-4">
		<input type="hidden" name="version" value={s.version} />
		<h2 class="font-semibold">Operação</h2>
		<label class="flex min-h-11 items-center gap-3"><input type="checkbox" class="size-5" name="acceptingOrders" checked={s.acceptingOrders} /> Aceitando pedidos</label>
		<div>
			<label class="label" for="pauseReason">Mensagem quando pausado</label>
			<input class="field" id="pauseReason" name="pauseReason" value={s.pauseReason ?? ''} maxlength="160" />
		</div>
		<label class="flex min-h-11 items-center gap-3"><input type="checkbox" class="size-5" name="webOrderingEnabled" checked={s.webOrderingEnabled} /> Pedidos pelo site</label>
		<label class="flex min-h-11 items-center gap-3"><input type="checkbox" class="size-5" name="pickupEnabled" checked={s.pickupEnabled} /> Retirada no balcão</label>
		<label class="flex min-h-11 items-center gap-3"><input type="checkbox" class="size-5" name="deliveryEnabled" checked={s.deliveryEnabled} /> Entrega própria</label>
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="prep">Tempo de preparo prometido (min)</label>
				<input class="field" id="prep" name="prepTimeMinutes" type="number" min="1" max="240" value={s.prepTimeMinutes} required />
			</div>
			<div>
				<label class="label" for="max">Máximo de pedidos abertos no site (vazio = sem limite)</label>
				<input class="field" id="max" name="maxOpenOrders" type="number" min="1" value={s.maxOpenOrders ?? ''} />
			</div>
		</div>
		<FormError message={form?.error} />
		{#if form?.ok}<p class="alert-ok">Salvo.</p>{/if}
		<button class="btn-primary">Salvar</button>
	</form>
	<p class="text-sm text-muted">
		Cardápio, fotos e preços são editados no CMS. Itens esgotados ficam em <a class="underline" href="/staff/menu">Cardápio</a>.
	</p>
</div>
