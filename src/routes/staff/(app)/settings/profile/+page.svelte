<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';

	let { data, form } = $props();
	const p = $derived(data.profile);
	let pixEnabled = $derived(data.profile.pix.enabled);
	const keep =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<svelte:head><title>Dados e Pix · Configurações</title></svelte:head>

<div class="space-y-4">
	<h1 class="text-xl font-bold">Dados da loja e pagamentos</h1>

	<form method="POST" action="?/store" use:enhance={keep} class="space-y-4 card p-4">
		<h2 class="font-semibold">Dados da loja</h2>
		<p class="text-sm text-muted">Aparecem no site, no app instalado e nos comprovantes.</p>
		<div>
			<label class="label" for="displayName">Nome da loja</label>
			<input
				class="field"
				id="displayName"
				name="displayName"
				value={p.displayName}
				required
				maxlength="80"
			/>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="phone">Telefone ou WhatsApp</label>
				<input
					class="field"
					id="phone"
					name="phone"
					value={p.phone ?? ''}
					inputmode="tel"
					placeholder="(11) 99999-9999"
				/>
			</div>
			<div>
				<label class="label" for="city">Cidade</label>
				<input class="field" id="city" name="city" value={p.city ?? ''} placeholder="São Paulo" />
			</div>
		</div>
		<div>
			<label class="label" for="addressLine">Endereço para retirada</label>
			<input
				class="field"
				id="addressLine"
				name="addressLine"
				value={p.addressLine ?? ''}
				placeholder="Rua Exemplo, 123 - Centro"
			/>
		</div>
		{#if form?.ok === 'store'}<p class="alert-ok">Dados salvos.</p>{/if}
		<button class="btn-primary">Salvar dados</button>
	</form>

	<form method="POST" action="?/payments" use:enhance={keep} class="space-y-4 card p-4">
		<h2 class="font-semibold">Como o cliente do site paga</h2>
		<fieldset class="space-y-4">
			<label class="flex min-h-11 items-start gap-3"
				><input
					type="checkbox"
					class="mt-1 size-5"
					name="payOnFulfillmentEnabled"
					checked={data.settings.payOnFulfillmentEnabled}
				/>
				<span
					>Pagar na retirada ou na entrega
					<span class="block text-sm text-muted"
						>Dinheiro, Pix ou maquininha na hora. A loja confirma o pedido antes de preparar.</span
					></span
				></label
			>
			<label class="flex min-h-11 items-start gap-3"
				><input type="checkbox" class="mt-1 size-5" name="pixEnabled" bind:checked={pixEnabled} />
				<span
					>Pix na chave da loja
					<span class="block text-sm text-muted"
						>O site mostra um QR Code com o valor e o número do pedido. A equipe confere o Pix no
						app do banco e registra no pedido.</span
					></span
				></label
			>
			{#if pixEnabled}
				<div class="space-y-3 rounded-lg border border-line p-3">
					<div>
						<label class="label" for="pixKey">Chave Pix</label>
						<input
							class="field"
							id="pixKey"
							name="pixKey"
							value={p.pix.key ?? ''}
							placeholder="CNPJ, CPF, celular, e-mail ou chave aleatória"
							required
						/>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<label class="label" for="pixMerchantName">Nome do recebedor</label>
							<input
								class="field"
								id="pixMerchantName"
								name="pixMerchantName"
								value={p.pix.merchantName ?? p.displayName}
								maxlength="25"
								required
							/>
						</div>
						<div>
							<label class="label" for="pixMerchantCity">Cidade do recebedor</label>
							<input
								class="field"
								id="pixMerchantCity"
								name="pixMerchantCity"
								value={p.pix.merchantCity ?? p.city ?? ''}
								maxlength="15"
								required
							/>
						</div>
					</div>
					<p class="text-xs text-muted">
						Depois de trocar a chave, faça um pedido de teste e pague R$ 1 para conferir que o Pix
						cai na conta certa.
					</p>
				</div>
			{:else}
				<input type="hidden" name="pixKey" value={p.pix.key ?? ''} />
				<input type="hidden" name="pixMerchantName" value={p.pix.merchantName ?? ''} />
				<input type="hidden" name="pixMerchantCity" value={p.pix.merchantCity ?? ''} />
			{/if}
		</fieldset>
		<p class="text-sm text-muted">
			Pagamento online com confirmação automática precisa de um provedor de pagamento (PSP).
			{data.onlineProvider
				? `Provedor ativo: ${data.onlineProvider}.`
				: 'Nenhum está conectado; isso é opcional.'}
		</p>
		{#if form?.ok === 'payments'}
			<p class="alert-ok">Pagamentos salvos.</p>
			{#if form.warning}<p class="alert-warn">{form.warning}</p>{/if}
		{/if}
		<button class="btn-primary">Salvar pagamentos</button>
	</form>
	<FormError message={form?.error} />
</div>
