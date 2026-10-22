<script lang="ts">
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';

	let { data, form } = $props();
	const p = $derived(data.profile);
	let pixEnabled = $derived(data.profile.pix.enabled);
</script>

<svelte:head><title>Dados e Pix · Configurações</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">Dados da loja e pagamentos</h1>

	<SettingsSection
		title="Dados da loja"
		hint="Aparecem no site, no app instalado e nos comprovantes."
		action="?/store"
		saveLabel="Salvar dados"
		saved={form?.ok === 'store' ? 'Dados salvos.' : undefined}
	>
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
	</SettingsSection>

	<SettingsSection
		title="Como o cliente do site paga"
		hint="Todo pedido do site é pago na hora, antes de ir para a cozinha."
		action="?/payments"
		saveLabel="Salvar pagamentos"
		saved={form?.ok === 'payments' ? 'Pagamentos salvos.' : undefined}
		warning={form?.ok === 'payments' ? form.warning : undefined}
	>
		<fieldset class="space-y-4">
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
	</SettingsSection>
	<FormError message={form?.error} />
</div>
