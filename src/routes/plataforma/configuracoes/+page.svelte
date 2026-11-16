<script lang="ts">
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatBRL } from '#lib/domain/money.ts';

	let { data, form } = $props();
</script>

<svelte:head><title>Configurações · Console da plataforma</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">Configurações da plataforma</h1>
	{#if form && 'done' in form && form.done}<p class="alert-ok">{form.done}</p>{/if}
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />

	<form method="post" action="?/pix" class="space-y-3 card p-4">
		<h2 class="text-lg font-bold">Cobrança por Pix</h2>
		<TextField label="Chave Pix da plataforma" name="pixKey" value={data.settings.pixKey ?? ''} />
		<TextField
			label="Nome do recebedor"
			name="pixMerchantName"
			maxlength={25}
			value={data.settings.pixMerchantName ?? ''}
		/>
		<TextField
			label="Cidade do recebedor"
			name="pixMerchantCity"
			maxlength={15}
			value={data.settings.pixMerchantCity ?? ''}
		/>
		<TextField
			label="Dias de carência depois do vencimento"
			name="graceDays"
			type="number"
			value={String(data.settings.graceDays)}
		/>
		<button class="btn-primary">Salvar</button>
	</form>

	<section class="space-y-3 card p-4">
		<h2 class="text-lg font-bold">Planos</h2>
		{#each data.plans as p (p.code)}
			<form method="post" action="?/price" class="flex flex-wrap items-end gap-2">
				<input type="hidden" name="code" value={p.code} />
				<TextField label="{p.name} (mensal)" name="price" value={formatBRL(p.price_cents)} />
				<button class="btn-secondary">Salvar preço</button>
			</form>
		{/each}
	</section>
</div>
