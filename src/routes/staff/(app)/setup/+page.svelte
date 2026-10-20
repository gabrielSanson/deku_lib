<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/FormError.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data, form } = $props();
	const labels: Record<string, string> = {
		loja: 'Loja',
		cardapio: 'Cardápio',
		entrega: 'Retirada e entrega',
		equipe: 'Equipe',
		pagamentos: 'Pagamentos',
		ifood: 'iFood',
		concluir: 'Concluir'
	};
	const index = $derived(data.steps.indexOf(data.step));
	const nextStep = $derived(data.steps[index + 1]);
	const prevStep = $derived(data.steps[index - 1]);
	const p = $derived(data.profile);
	const ifood = $derived(data.ifood);
	const keep =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
	let pixEnabled = $derived(data.profile.pix.enabled);
	const problem = $derived(
		form && 'ifoodProblem' in form
			? (form.ifoodProblem as { stage: string; title: string; action: string; detail: string })
			: null
	);
</script>

<svelte:head><title>Configuração · {labels[data.step]}</title></svelte:head>

<main class="mx-auto max-w-3xl space-y-4 p-4">
	<h1 class="text-2xl font-black">Configurar a loja</h1>
	<nav aria-label="Passos" class="flex flex-wrap gap-1 text-sm">
		{#each data.steps as s, i (s)}
			<a
				href="?passo={s}"
				class="rounded-full px-3 py-1 {s === data.step
					? 'bg-brand-600 font-semibold text-white'
					: i < index
						? 'bg-brand-100 text-brand-700'
						: 'bg-stone-100 text-muted'}"
				aria-current={s === data.step ? 'step' : undefined}>{i + 1}. {labels[s]}</a
			>
		{/each}
	</nav>

	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'ok' in form && typeof form.ok === 'string'}<p class="alert-ok">{form.ok}</p>{/if}
	{#if form && 'warning' in form}<p class="alert-warn">{form.warning}</p>{/if}

	{#if data.step === 'loja'}
		<form method="POST" action="?/store" use:enhance={keep} class="space-y-4 card p-4">
			<h2 class="text-lg font-bold">Dados da loja</h2>
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
			<button class="btn-primary w-full">Salvar e continuar</button>
		</form>
	{:else if data.step === 'cardapio'}
		<section class="space-y-3 card p-4">
			<h2 class="text-lg font-bold">Cardápio</h2>
			{#if data.counts.products > 0}
				<p class="alert-ok">
					{data.counts.products} produto(s) em {data.counts.categories} categoria(s).
				</p>
			{:else}
				<p class="text-sm">
					O cardápio está vazio. Cadastre categorias, produtos, fotos e adicionais no editor, ou
					comece pelo exemplo e ajuste.
				</p>
				<form method="POST" action="?/sampleMenu" use:enhance>
					<button class="btn-secondary w-full">Carregar cardápio de exemplo</button>
				</form>
			{/if}
			<a class="btn-primary w-full" href="/staff/menu/edit">Abrir o editor de cardápio</a>
			<p class="text-xs text-muted">
				Dica: cada produto tem um código (SKU). Se você vende no iFood, use o mesmo código como
				"código externo" no cardápio do iFood para os pedidos chegarem certos na cozinha.
			</p>
		</section>
	{:else if data.step === 'entrega'}
		<form method="POST" action="?/fulfillment" use:enhance={keep} class="space-y-3 card p-4">
			<h2 class="text-lg font-bold">Retirada e entrega (pedidos do site)</h2>
			<label class="flex min-h-11 items-center gap-3"
				><input
					type="checkbox"
					class="size-5"
					name="pickupEnabled"
					checked={data.settings.pickupEnabled}
				/> Cliente retira no balcão</label
			>
			<label class="flex min-h-11 items-center gap-3"
				><input
					type="checkbox"
					class="size-5"
					name="deliveryEnabled"
					checked={data.settings.deliveryEnabled}
				/> Entrega própria (seu motoboy)</label
			>
			<p class="text-sm {data.counts.zones ? 'text-muted' : 'text-warn'}">
				{data.counts.zones
					? `${data.counts.zones} área(s) de entrega ativa(s).`
					: 'Nenhuma área de entrega cadastrada: com a entrega ligada, o site recusa todos os endereços.'}
				<a class="underline" href="/staff/settings/delivery">Cadastrar áreas e taxas</a>
			</p>
			<button class="btn-primary w-full">Salvar e continuar</button>
		</form>
	{:else if data.step === 'equipe'}
		<section class="space-y-3 card p-4">
			<h2 class="text-lg font-bold">Equipe</h2>
			<p class="text-sm">
				{data.counts.staff} pessoa(s) com acesso. Crie uma conta para cada pessoa: caixa, cozinha e gerente
				veem só o que precisam.
			</p>
			<a class="btn-secondary w-full" href="/staff/settings/staff">Gerenciar equipe</a>
			<a class="btn-primary w-full" href="?passo={nextStep}">Continuar</a>
		</section>
	{:else if data.step === 'pagamentos'}
		<form method="POST" action="?/payments" use:enhance={keep} class="space-y-4 card p-4">
			<h2 class="text-lg font-bold">Como o cliente do site paga</h2>
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
						>O site mostra um QR Code com o valor e o número do pedido. Sem taxa de intermediário. A
						confirmação não é automática: a equipe confere o Pix no app do banco e registra no
						pedido.</span
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
						Faça um pedido de teste e pague R$ 1 para conferir que o Pix cai na conta certa.
					</p>
				</div>
			{:else}
				<input type="hidden" name="pixKey" value={p.pix.key ?? ''} />
				<input type="hidden" name="pixMerchantName" value={p.pix.merchantName ?? ''} />
				<input type="hidden" name="pixMerchantCity" value={p.pix.merchantCity ?? ''} />
			{/if}
			<p class="text-sm text-muted">
				Pagamento online com confirmação automática (Pix e cartão) precisa de um provedor de
				pagamento (PSP).
				{data.onlineProvider
					? `Provedor ativo: ${data.onlineProvider}.`
					: 'Nenhum está conectado; isso é opcional.'}
			</p>
			<button class="btn-primary w-full">Salvar e continuar</button>
		</form>
	{:else if data.step === 'ifood'}
		<section class="space-y-4 card p-4">
			<div class="flex items-center justify-between gap-2">
				<h2 class="text-lg font-bold">iFood (opcional)</h2>
				<span
					class="rounded-full px-3 py-1 text-xs font-semibold {ifood.enabled
						? 'bg-ok/15 text-ok'
						: 'bg-line text-muted'}">{ifood.enabled ? 'Ligado' : 'Desligado'}</span
				>
			</div>
			<p class="text-sm">
				A loja funciona sem o iFood. Sem a integração, a equipe lança os pedidos do iFood no Caixa
				em "iFood (manual)". Com ela, os pedidos chegam sozinhos na cozinha e o status volta para o
				iFood.
			</p>
			<p class="alert-warn text-sm">
				Esta integração foi feita a partir da documentação pública do iFood e ainda não passou pela
				homologação do iFood. Teste com pedidos de teste antes de depender dela.
			</p>

			<ol class="list-decimal space-y-2 pl-5 text-sm">
				<li>
					No <strong>Portal do Desenvolvedor iFood</strong> (developer.ifood.com.br), crie um
					aplicativo do tipo "centralizado" para a sua loja e copie o <strong>Client ID</strong> e o
					<strong>Client Secret</strong>.
				</li>
				<li>
					No <strong>Portal do Parceiro</strong>, autorize esse aplicativo para a loja e copie o
					<strong>Merchant ID</strong> (código da loja).
				</li>
				<li>Cole os três abaixo e clique em "Salvar e testar".</li>
				<li>
					No cardápio do iFood, use o código (SKU) de cada produto daqui como "código externo".
				</li>
			</ol>

			{#if ifood.source === 'env'}
				<p class="text-sm text-muted">
					As credenciais atuais vêm das variáveis do servidor (IFOOD_*). Salvar aqui passa a usar as
					credenciais do app.
				</p>
			{/if}
			{#if !data.canStoreSecrets}
				<p class="alert-error text-sm">
					O servidor não tem APP_SECRET configurado, então não pode guardar o Client Secret com
					segurança. Rode deploy/setup.sh de novo ou defina APP_SECRET no servidor.
				</p>
			{/if}
			{#if ifood.problem}<p class="alert-error text-sm">{ifood.problem}</p>{/if}

			<form method="POST" action="?/ifoodSave" use:enhance={keep} class="space-y-3">
				<div>
					<label class="label" for="clientId">Client ID</label>
					<input
						class="field font-mono"
						id="clientId"
						name="clientId"
						value={ifood.clientId ?? ''}
						autocomplete="off"
						required
					/>
				</div>
				<div>
					<label class="label" for="clientSecret">Client Secret</label>
					<input
						class="field font-mono"
						id="clientSecret"
						name="clientSecret"
						type="password"
						autocomplete="new-password"
						placeholder={ifood.hasSecret ? 'Já salvo. Deixe em branco para manter.' : ''}
						required={!ifood.hasSecret}
					/>
				</div>
				<div>
					<label class="label" for="merchantId">Merchant ID</label>
					<input
						class="field font-mono"
						id="merchantId"
						name="merchantId"
						value={ifood.merchantId ?? ''}
						autocomplete="off"
						required
					/>
				</div>
				<div class="flex flex-wrap gap-2">
					<button class="btn-primary" disabled={!data.canStoreSecrets}>Salvar e testar</button>
				</div>
			</form>
			{#if ifood.clientId}
				<form method="POST" action="?/ifoodTest" use:enhance>
					<button class="btn-secondary">Testar conexão de novo</button>
				</form>
			{/if}

			{#if problem}
				<div class="space-y-1 alert-error" role="alert">
					<p class="font-semibold">{problem.title}</p>
					<p>{problem.action}</p>
					<details class="text-xs">
						<summary>Detalhe técnico</summary>
						<code class="break-all">{problem.detail}</code>
					</details>
				</div>
			{:else if ifood.lastCheckAt}
				<p class="text-sm {ifood.lastCheckOk ? 'text-ok' : 'text-bad'}">
					Último teste em {formatDateTime(ifood.lastCheckAt)}:
					{ifood.lastCheckOk ? 'conexão funcionando.' : ifood.lastCheckError}
				</p>
			{/if}

			{#if ifood.enabled}
				<form method="POST" action="?/ifoodEnable" use:enhance>
					<input type="hidden" name="enabled" value="0" />
					<button class="btn-danger">Desligar iFood</button>
				</form>
			{:else if ifood.lastCheckOk && ifood.source === 'app'}
				<form
					method="POST"
					action="?/ifoodEnable"
					use:enhance
					class="space-y-2 border-t border-line pt-3"
				>
					<input type="hidden" name="enabled" value="1" />
					<label class="flex items-start gap-3 text-sm"
						><input type="checkbox" class="mt-1 size-5" name="understood" required />
						Entendi que a integração ainda não foi homologada pelo iFood e vou acompanhar os primeiros
						pedidos também no Gestor de Pedidos do iFood.</label
					>
					<button class="btn-primary">Ligar recebimento automático de pedidos</button>
				</form>
			{/if}
			<p class="text-xs text-muted">
				Se o iFood pedir um endereço de webhook, use <code class="break-all">{data.webhookUrl}</code
				>. Mesmo sem webhook, o sistema consulta o iFood a cada 30 segundos.
			</p>
			<a class="btn-ghost w-full" href="?passo={nextStep}"
				>{ifood.enabled ? 'Continuar' : 'Pular por enquanto'}</a
			>
		</section>
	{:else if data.step === 'concluir'}
		<form method="POST" action="?/finish" class="space-y-3 card p-4">
			<h2 class="text-lg font-bold">Tudo pronto?</h2>
			<ul class="space-y-1 text-sm">
				<li>{data.counts.products ? '✓' : '•'} Cardápio: {data.counts.products} produto(s)</li>
				<li>
					{data.settings.pickupEnabled || data.counts.zones ? '✓' : '•'} Retirada{data.settings
						.deliveryEnabled
						? ` e entrega (${data.counts.zones} área(s))`
						: ''}
				</li>
				<li>{data.counts.staff > 1 ? '✓' : '•'} Equipe: {data.counts.staff} pessoa(s)</li>
				<li>
					{data.settings.payOnFulfillmentEnabled || p.pix.enabled ? '✓' : '•'} Pagamento:
					{[
						data.settings.payOnFulfillmentEnabled ? 'na retirada/entrega' : null,
						p.pix.enabled ? 'Pix na chave da loja' : null
					]
						.filter(Boolean)
						.join(', ') || 'nenhum para o site'}
				</li>
				<li>
					{ifood.enabled ? '✓ iFood ligado' : '• iFood desligado (use "iFood (manual)" no Caixa)'}
				</li>
			</ul>
			{#if data.counts.products === 0}
				<p class="alert-warn text-sm">Sem produtos, o site e o caixa ficam vazios.</p>
			{/if}
			<label class="flex min-h-11 items-center gap-3"
				><input
					type="checkbox"
					class="size-5"
					name="open"
					checked={!data.settings.acceptingOrders && data.counts.products > 0}
				/> Abrir a loja para pedidos pelo site agora</label
			>
			<button class="btn-primary w-full">Concluir configuração</button>
			<p class="text-xs text-muted">
				Você pode voltar aqui a qualquer momento em Loja → Configuração.
			</p>
		</form>
	{/if}

	<div class="flex justify-between">
		{#if prevStep}<a class="btn-ghost" href="?passo={prevStep}">← {labels[prevStep]}</a>{:else}<span
			></span>{/if}
		{#if nextStep && data.step !== 'concluir'}<a class="btn-ghost" href="?passo={nextStep}"
				>{labels[nextStep]} →</a
			>{/if}
	</div>
</main>
