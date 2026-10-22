<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data, form } = $props();
	const s = $derived(data.settings);
	let pauseReason = $state('');
</script>

<svelte:head><title>Loja · Configurações</title></svelte:head>

<div class="space-y-4">
	<section
		class="flex flex-wrap items-center justify-between gap-3 card p-4 {s.acceptingOrders
			? ''
			: 'border-red-300 bg-red-50'}"
	>
		<div>
			<h1 class="page-title">{s.acceptingOrders ? 'Loja aberta' : 'Loja pausada'}</h1>
			<p class="text-sm text-muted">
				{s.acceptingOrders ? 'Pedidos online estão sendo aceitos.' : (s.pauseReason ?? '')} · atualizado
				{formatDateTime(s.updatedAt)}
			</p>
		</div>
		<form method="POST" action="?/toggle" use:enhance class="flex gap-2">
			<input type="hidden" name="open" value={s.acceptingOrders ? '0' : '1'} />
			{#if s.acceptingOrders}
				<input
					class="field"
					name="pauseReason"
					placeholder="Motivo da pausa"
					bind:value={pauseReason}
				/>
				<button class="btn-danger whitespace-nowrap">Pausar pedidos</button>
			{:else}
				<button class="btn-primary">Abrir loja</button>
			{/if}
		</form>
	</section>

	<SettingsSection
		title="Operação"
		action="?/save"
		saveLabel="Salvar"
		saved={form?.ok ? 'Salvo.' : undefined}
	>
		<input type="hidden" name="version" value={s.version} />
		<label class="flex min-h-11 items-center gap-3"
			><input type="checkbox" class="size-5" name="acceptingOrders" checked={s.acceptingOrders} /> Aceitando
			pedidos</label
		>
		<div>
			<label class="label" for="pauseReason">Mensagem quando pausado</label>
			<input
				class="field"
				id="pauseReason"
				name="pauseReason"
				value={s.pauseReason ?? ''}
				maxlength="160"
			/>
		</div>
		<label class="flex min-h-11 items-center gap-3"
			><input
				type="checkbox"
				class="size-5"
				name="webOrderingEnabled"
				checked={s.webOrderingEnabled}
			/> Pedidos pelo site</label
		>
		<label class="flex min-h-11 items-center gap-3"
			><input type="checkbox" class="size-5" name="dineInEnabled" checked={s.dineInEnabled} /> Comer no
			local (o cliente pede pelo celular na mesa)</label
		>
		{#if s.dineInEnabled}
			<p class="-mt-2 pl-8 text-sm text-muted">
				Cole em cada mesa um QR Code com o link <code class="rounded bg-stone-100 px-1"
					>{page.url.origin}/?mesa=7</code
				> (troque o 7 pelo número da mesa). O pedido já chega com a mesa preenchida.
			</p>
		{/if}
		<label class="flex min-h-11 items-center gap-3"
			><input type="checkbox" class="size-5" name="pickupEnabled" checked={s.pickupEnabled} /> Para viagem
			/ retirada no balcão</label
		>
		<label class="flex min-h-11 items-center gap-3"
			><input type="checkbox" class="size-5" name="deliveryEnabled" checked={s.deliveryEnabled} /> Entrega
			própria</label
		>
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="prep">Tempo de preparo prometido (min)</label>
				<input
					class="field"
					id="prep"
					name="prepTimeMinutes"
					type="number"
					min="1"
					max="240"
					value={s.prepTimeMinutes}
					required
				/>
			</div>
			<div>
				<label class="label" for="max">Máximo de pedidos abertos no site (vazio = sem limite)</label
				>
				<input
					class="field"
					id="max"
					name="maxOpenOrders"
					type="number"
					min="1"
					value={s.maxOpenOrders ?? ''}
				/>
			</div>
		</div>
		<FormError message={form?.error} />
	</SettingsSection>
	<p class="text-sm text-muted">
		Cardápio, fotos e preços ficam em <a class="underline" href="/staff/menu/edit"
			>Editar cardápio</a
		>. Itens esgotados ficam em <a class="underline" href="/staff/menu">Cardápio</a>.
	</p>
</div>
