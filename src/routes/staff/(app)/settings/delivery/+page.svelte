<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import { guardUnsaved } from '#lib/client/unsaved.svelte.ts';
	import { formatBRL } from '#lib/domain/money.ts';
	import type { DeliveryRule } from '#lib/domain/pricing.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	let editing = $state<Partial<DeliveryRule> | null>(null);
	const t = useTexts();
	let formEl = $state<HTMLFormElement>();
	const guard = guardUnsaved(
		() => formEl,
		() => t('unsaved.confirm')
	);
	const brl = (c: number) => formatBRL(c).replace(/[R$\s]/g, '');
</script>

<svelte:head><title>Entrega · Configurações</title></svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="page-title">Áreas e taxas de entrega</h1>
		<button
			class="btn-primary"
			onclick={() => (editing = { matchKind: 'neighborhood', enabled: true, priority: 100 })}
			>Nova área</button
		>
	</div>
	<p class="text-sm text-muted">
		A taxa é calculada no servidor e gravada no pedido. Regras por CEP (prefixo) valem antes das de
		bairro com a mesma prioridade; menor prioridade vence.
	</p>
	<FormError message={form?.error} />

	{#if editing}
		<form
			method="POST"
			action="?/save"
			bind:this={formEl}
			use:enhance={() => {
				guard.saving();
				return async ({ update, result }) => {
					await update();
					if (result.type === 'success') {
						guard.saved();
						editing = null;
					} else guard.failed();
				};
			}}
			class="grid gap-3 card p-4 sm:grid-cols-2"
		>
			<input type="hidden" name="id" value={editing.id ?? ''} />
			<div>
				<label class="label" for="name">Nome</label><input
					class="field"
					id="name"
					name="name"
					value={editing.name ?? ''}
					required
				/>
			</div>
			<div>
				<label class="label" for="kind">Tipo</label>
				<select class="field" id="kind" name="matchKind" value={editing.matchKind}>
					<option value="neighborhood">Bairro</option>
					<option value="cep_prefix">Prefixo de CEP</option>
				</select>
			</div>
			<div>
				<label class="label" for="value">Bairro ou prefixo de CEP</label><input
					class="field"
					id="value"
					name="matchValue"
					value={editing.matchValue ?? ''}
					required
				/>
			</div>
			<div>
				<label class="label" for="fee">Taxa (R$)</label><input
					class="field"
					id="fee"
					name="fee"
					inputmode="decimal"
					value={editing.feeCents !== undefined ? brl(editing.feeCents) : ''}
					required
				/>
			</div>
			<div>
				<label class="label" for="min">Pedido mínimo (R$)</label><input
					class="field"
					id="min"
					name="minOrder"
					inputmode="decimal"
					value={editing.minOrderCents !== undefined ? brl(editing.minOrderCents) : ''}
				/>
			</div>
			<div>
				<label class="label" for="prio">Prioridade</label><input
					class="field"
					id="prio"
					name="priority"
					type="number"
					value={editing.priority ?? 100}
				/>
			</div>
			<label class="flex min-h-11 items-center gap-2"
				><input class="size-5" type="checkbox" name="enabled" checked={editing.enabled} /> Ativa</label
			>
			<div class="flex gap-2 sm:col-span-2">
				<button type="button" class="btn-secondary" onclick={() => (editing = null)}
					>Cancelar</button
				>
				<button class="btn-primary">Salvar</button>
			</div>
		</form>
	{/if}

	<div class="overflow-x-auto card">
		<table class="w-full text-sm">
			<thead class="bg-quiet text-left text-xs text-muted uppercase">
				<tr
					><th class="p-3">Nome</th><th class="p-3">Área</th><th class="p-3">Taxa</th><th
						class="p-3">Mínimo</th
					><th class="p-3">Prioridade</th><th class="p-3">Status</th><th></th></tr
				>
			</thead>
			<tbody class="divide-y divide-line">
				{#each data.rules as r (r.id)}
					<tr>
						<td class="p-3 font-medium">{r.name}</td>
						<td class="p-3"
							>{r.matchKind === 'cep_prefix' ? `CEP ${r.matchValue}…` : r.matchValue}</td
						>
						<td class="p-3"><Money cents={r.feeCents} /></td>
						<td class="p-3"><Money cents={r.minOrderCents} /></td>
						<td class="p-3">{r.priority}</td>
						<td class="p-3">{r.enabled ? 'Ativa' : 'Inativa'}</td>
						<td class="flex gap-1 p-2">
							<button class="btn-ghost min-h-9 text-sm" onclick={() => (editing = { ...r })}
								>Editar</button
							>
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={r.id} />
								<button
									class="btn-ghost min-h-9 text-sm text-bad"
									onclick={(e) => !confirm(`Excluir ${r.name}?`) && e.preventDefault()}
									>Excluir</button
								>
							</form>
						</td>
					</tr>
				{:else}
					<tr
						><td colspan="7" class="p-8 text-center text-muted"
							>Nenhuma área cadastrada. Sem áreas, a entrega própria fica indisponível no site.</td
						></tr
					>
				{/each}
			</tbody>
		</table>
	</div>

	<form class="flex flex-wrap items-end gap-2 card p-4" method="GET">
		<div>
			<label class="label" for="pcep">Testar CEP</label><input
				class="field"
				id="pcep"
				name="cep"
				value={data.preview?.cep ?? ''}
			/>
		</div>
		<div>
			<label class="label" for="phood">Bairro</label><input
				class="field"
				id="phood"
				name="bairro"
				value={data.preview?.hood ?? ''}
			/>
		</div>
		<button class="btn-secondary">Ver taxa</button>
		{#if data.preview}
			<p class="w-full text-sm" role="status">
				{#if data.preview.rule}Regra <strong>{data.preview.rule.name}</strong>: taxa <Money
						cents={data.preview.rule.feeCents}
					/>, mínimo
					<Money cents={data.preview.rule.minOrderCents} />.{:else}Fora da área de entrega.{/if}
			</p>
		{/if}
	</form>
</div>
