<script lang="ts">
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';

	let { data, form } = $props();
	const s = $derived(data.settings);
	let enabled = $derived(data.settings.enabled);
</script>

<svelte:head><title>Nota fiscal · Configurações</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">Nota fiscal (NFC-e)</h1>
	<p class="alert-warn">
		Peça ao seu contador para conferir estes dados. Comece em <strong>Homologação</strong> (notas de
		teste, sem valor) e só passe para <strong>Produção</strong> depois que as notas de teste saírem
		autorizadas. Esta integração com a Focus NFe ainda não emitiu notas reais. O passo a passo está
		em <code>docs/nota-fiscal.md</code>.
	</p>
	{#if !data.canStoreSecrets}
		<p class="alert-error">
			O servidor não tem APP_SECRET configurado, então não pode guardar o token.
		</p>
	{/if}

	<SettingsSection
		title="Emissão automática"
		hint="Com a emissão ligada, cada pedido pago (balcão, totem e site) recebe uma NFC-e. Pedidos do iFood ficam de fora."
		action="?/save"
		saveLabel="Salvar"
		saved={form?.ok ? 'Configuração salva.' : undefined}
	>
		<label class="flex items-start gap-3">
			<input type="checkbox" class="mt-1 size-5" name="enabled" bind:checked={enabled} />
			<span><strong>Emitir NFC-e para pedidos pagos</strong></span>
		</label>
		<div>
			<label class="label" for="environment">Ambiente</label>
			<select class="field" id="environment" name="environment" value={s.environment}>
				<option value="homologacao">Homologação (teste, sem valor fiscal)</option>
				<option value="producao">Produção (notas reais)</option>
			</select>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="cnpj">CNPJ da loja</label>
				<input
					class="field"
					id="cnpj"
					name="cnpj"
					value={s.cnpj ?? ''}
					inputmode="numeric"
					placeholder="00.000.000/0001-00"
				/>
			</div>
			<div>
				<label class="label" for="token">Token da Focus NFe</label>
				<input
					class="field"
					id="token"
					name="token"
					type="password"
					autocomplete="off"
					placeholder={s.hasToken ? 'Guardado. Digite só para trocar.' : 'Cole o token aqui'}
				/>
			</div>
		</div>
		<div class="grid gap-3 sm:grid-cols-3">
			<div>
				<label class="label" for="defaultNcm">NCM padrão</label>
				<input
					class="field"
					id="defaultNcm"
					name="defaultNcm"
					value={s.defaultNcm ?? ''}
					inputmode="numeric"
					placeholder="8 números"
				/>
			</div>
			<div>
				<label class="label" for="defaultCfop">CFOP</label>
				<input class="field" id="defaultCfop" name="defaultCfop" value={s.defaultCfop} />
			</div>
			<div>
				<label class="label" for="defaultCsosn">CSOSN / CST</label>
				<input class="field" id="defaultCsosn" name="defaultCsosn" value={s.defaultCsosn} />
			</div>
		</div>
		<p class="text-xs text-muted">
			O NCM é o código fiscal do produto; o contador informa qual usar para lanches, bebidas e
			porções. CFOP 5102 e CSOSN 102 são comuns no Simples Nacional, mas confirme.
		</p>
	</SettingsSection>
	<FormError message={form?.error} />
</div>
