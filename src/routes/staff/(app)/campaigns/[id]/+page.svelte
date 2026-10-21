<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import {
		buyXGetYParams,
		codeDiscountParams,
		type BuyXGetYParams,
		type CodeDiscountParams,
		type TemplateKey,
		type TimeWindow
	} from '#lib/domain/campaigns.ts';
	import { WEEKDAYS_PT } from '#lib/domain/hours.ts';
	import { formatBRL, parseBRL } from '#lib/domain/money.ts';
	import { toShopInput } from '#lib/domain/time.ts';

	let { data, form } = $props();

	// The form starts from the saved campaign; a save redirects back to the list.
	// svelte-ignore state_referenced_locally
	const c = data.campaign;
	const brl = (cents: number | null | undefined) =>
		cents ? formatBRL(cents).replace(/[R$\s]/g, '') : '';
	const cd = c?.templateKey === 'code_discount' ? (c.params as CodeDiscountParams) : null;
	const bx = c?.templateKey === 'buy_x_get_y' ? (c.params as BuyXGetYParams) : null;

	let name = $state(c?.name ?? '');
	let tagline = $state(c?.tagline ?? '');
	let templateKey = $state<TemplateKey>(c?.templateKey ?? 'code_discount');
	let code = $state(c?.code ?? '');
	let autoApply = $state(c?.autoApply ?? false);
	let startsAt = $state(toShopInput(c?.startsAt));
	let endsAt = $state(toShopInput(c?.endsAt));
	let windows = $state<TimeWindow[]>(c?.timeWindows ?? []);
	let minOrder = $state(brl(c?.minOrderCents));
	let maxUsesTotal = $state(c?.maxUsesTotal ? String(c.maxUsesTotal) : '');
	let maxUsesPerCustomer = $state(c?.maxUsesPerCustomer ? String(c.maxUsesPerCustomer) : '');
	let firstOrderOnly = $state(c?.firstOrderOnly ?? false);

	// Desconto no pedido
	let benefitType = $state<'percent' | 'fixed' | 'free_delivery'>(cd?.benefit.type ?? 'percent');
	let percent = $state(cd?.benefit.type === 'percent' ? cd.benefit.percent : 10);
	let maxDiscount = $state(cd?.benefit.type === 'percent' ? brl(cd.benefit.maxDiscountCents) : '');
	let amount = $state(cd?.benefit.type === 'fixed' ? brl(cd.benefit.amountCents) : '');

	// Leve X, ganhe Y
	let triggerKind = $state<'quantity' | 'min_order'>(bx?.trigger.kind ?? 'quantity');
	let triggerScope = $state<'all' | 'products' | 'categories'>(
		bx?.trigger.kind === 'quantity' ? bx.trigger.scope.type : 'products'
	);
	let triggerIds = $state<string[]>(bx?.trigger.kind === 'quantity' ? bx.trigger.scope.ids : []);
	let triggerQty = $state(bx?.trigger.kind === 'quantity' ? bx.trigger.quantity : 2);
	let rewardScope = $state<'same' | 'products' | 'categories'>(bx?.reward.scope.type ?? 'same');
	let rewardIds = $state<string[]>(bx?.reward.scope.ids ?? []);
	let rewardQty = $state(bx?.reward.quantity ?? 1);
	let rewardPercent = $state(bx?.reward.percent ?? 100);
	let target = $state<'cheapest' | 'most_expensive'>(bx?.reward.target ?? 'cheapest');
	let maxPerOrder = $state(bx?.maxRewardsPerOrder ?? 1);

	let error = $state<string | null>(null);

	// "One of the same items" only makes sense when a quantity triggers the offer.
	$effect(() => {
		if (triggerKind === 'min_order' && rewardScope === 'same') rewardScope = 'products';
	});

	const productName = (sku: string) => data.products.find((p) => p.sku === sku)?.name ?? sku;
	const categoryName = (id: string) => data.categories.find((x) => x.id === id)?.name ?? id;
	const names = (type: string, ids: string[]) =>
		ids.length
			? ids.map((id) => (type === 'categories' ? categoryName(id) : productName(id))).join(', ')
			: '…';
	const count = (s: string) => (s.trim() ? Number(s) : null);

	function params(): unknown {
		if (templateKey === 'code_discount') {
			return {
				benefit:
					benefitType === 'percent'
						? { type: 'percent', percent, maxDiscountCents: parseBRL(maxDiscount) || null }
						: benefitType === 'fixed'
							? { type: 'fixed', amountCents: parseBRL(amount) ?? 0 }
							: { type: 'free_delivery' }
			};
		}
		return {
			trigger:
				triggerKind === 'quantity'
					? {
							kind: 'quantity',
							scope: { type: triggerScope, ids: triggerIds },
							quantity: triggerQty
						}
					: { kind: 'min_order' },
			reward: {
				scope: { type: rewardScope, ids: rewardIds },
				quantity: rewardQty,
				percent: rewardPercent,
				target
			},
			maxRewardsPerOrder: maxPerOrder
		};
	}

	/** The offer in plain words, as a customer would read it. */
	const preview = $derived.by(() => {
		const off = rewardPercent === 100 ? 'grátis' : `com ${rewardPercent}% de desconto`;
		let what: string;
		if (templateKey === 'code_discount') {
			what =
				benefitType === 'percent'
					? `${percent}% de desconto no pedido${parseBRL(maxDiscount) ? ` (até R$ ${maxDiscount})` : ''}`
					: benefitType === 'fixed'
						? `R$ ${amount || '0'} de desconto no pedido`
						: 'Frete grátis na entrega';
		} else if (triggerKind === 'quantity') {
			const from = triggerScope === 'all' ? 'qualquer item' : names(triggerScope, triggerIds);
			const reward =
				rewardScope === 'same'
					? `mais ${rewardQty}`
					: `${rewardQty} de ${names(rewardScope, rewardIds)}`;
			what = `Leve ${triggerQty} de ${from} e ganhe ${reward} ${off}`;
		} else {
			what = `Ganhe ${rewardQty} de ${names(rewardScope, rewardIds)} ${off}`;
		}
		const min = parseBRL(minOrder) ? ` em pedidos a partir de R$ ${minOrder}` : '';
		const how = autoApply ? 'aplicado sozinho' : code ? `com o cupom ${code.toUpperCase()}` : '';
		return `${what}${min}${how ? `, ${how}` : ''}.`;
	});

	function payload(activate: boolean) {
		const schema = templateKey === 'code_discount' ? codeDiscountParams : buyXGetYParams;
		const p = params();
		if (!schema.safeParse(p).success) return null;
		return JSON.stringify({
			name,
			tagline,
			templateKey,
			params: p,
			code,
			autoApply,
			startsAt,
			endsAt,
			timeWindows: windows,
			minOrderCents: parseBRL(minOrder) ?? 0,
			maxUsesTotal: count(maxUsesTotal),
			maxUsesPerCustomer: count(maxUsesPerCustomer),
			firstOrderOnly,
			activate
		});
	}

	function toggle(list: string[], id: string): string[] {
		return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
	}
</script>

<svelte:head><title>{c ? c.name : 'Nova campanha'} · Campanhas</title></svelte:head>

{#snippet picker(type: string, ids: string[], onchange: (ids: string[]) => void, label: string)}
	{#if type === 'products' || type === 'categories'}
		<fieldset class="max-h-48 overflow-y-auto rounded-lg border border-line p-2">
			<legend class="px-1 text-sm font-semibold">{label}</legend>
			{#each type === 'products' ? data.products.map( (p) => ({ id: p.sku, name: p.name }) ) : data.categories as item (item.id)}
				<label class="flex items-center gap-2 py-1 text-sm">
					<input
						type="checkbox"
						class="size-4"
						checked={ids.includes(item.id)}
						onchange={() => onchange(toggle(ids, item.id))}
					/>
					{item.name}
				</label>
			{/each}
		</fieldset>
	{/if}
{/snippet}

<form
	method="POST"
	action="?/save"
	class="max-w-3xl space-y-5"
	use:enhance={({ formData, submitter, cancel }) => {
		const body = payload(submitter?.getAttribute('value') === 'activate');
		if (!body) {
			error = 'Revise as regras da promoção: falta escolher itens ou um valor.';
			cancel();
			return;
		}
		error = null;
		formData.set('payload', body);
		return async ({ update }) => update({ reset: false });
	}}
>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="page-title">{c ? c.name : 'Nova campanha'}</h1>
		<a class="btn-ghost" href="/staff/campaigns">Voltar</a>
	</div>
	{#if c && c.uses > 0}
		<p class="alert-warn">
			Esta campanha já foi usada em {c.uses} pedido(s). Mudanças valem só para os próximos pedidos.
		</p>
	{/if}

	<section class="grid gap-3 card p-4 sm:grid-cols-2">
		<div class="sm:col-span-2">
			<label class="label" for="name">Nome (aparece no resumo do pedido)</label>
			<input class="field" id="name" maxlength="80" bind:value={name} required />
		</div>
		<div class="sm:col-span-2">
			<label class="label" for="tagline">Frase curta (aparece na lista, opcional)</label>
			<input
				class="field"
				id="tagline"
				maxlength="80"
				bind:value={tagline}
				placeholder="Ex.: Almoço com 10% de desconto"
			/>
		</div>
		<fieldset class="sm:col-span-2">
			<legend class="label">Tipo de promoção</legend>
			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					class="btn {templateKey === 'code_discount' ? 'bg-ink text-white' : 'btn-secondary'}"
					aria-pressed={templateKey === 'code_discount'}
					onclick={() => (templateKey = 'code_discount')}>Desconto no pedido</button
				>
				<button
					type="button"
					class="btn {templateKey === 'buy_x_get_y' ? 'bg-ink text-white' : 'btn-secondary'}"
					aria-pressed={templateKey === 'buy_x_get_y'}
					onclick={() => (templateKey = 'buy_x_get_y')}>Leve X, ganhe Y</button
				>
			</div>
		</fieldset>
	</section>

	<section class="grid gap-3 card p-4 sm:grid-cols-2">
		<h2 class="font-semibold sm:col-span-2">O que o cliente ganha</h2>
		{#if templateKey === 'code_discount'}
			<div>
				<label class="label" for="btype">Desconto</label>
				<select class="field" id="btype" bind:value={benefitType}>
					<option value="percent">Porcentagem</option>
					<option value="fixed">Valor fixo (R$)</option>
					<option value="free_delivery">Frete grátis</option>
				</select>
			</div>
			{#if benefitType === 'percent'}
				<div>
					<label class="label" for="pct">Porcentagem (%)</label>
					<input class="field" id="pct" type="number" min="1" max="100" bind:value={percent} />
				</div>
				<div>
					<label class="label" for="maxd">Desconto máximo (R$, opcional)</label>
					<input class="field" id="maxd" inputmode="decimal" bind:value={maxDiscount} />
				</div>
			{:else if benefitType === 'fixed'}
				<div>
					<label class="label" for="amt">Valor (R$)</label>
					<input class="field" id="amt" inputmode="decimal" bind:value={amount} />
				</div>
			{/if}
			<p class="text-xs text-muted sm:col-span-2">
				Porcentagem vale só sobre a comida, nunca sobre a taxa de entrega.
			</p>
		{:else}
			<div>
				<label class="label" for="tkind">Quando</label>
				<select class="field" id="tkind" bind:value={triggerKind}>
					<option value="quantity">Levar uma quantidade de itens</option>
					<option value="min_order">Pedido acima do mínimo (brinde)</option>
				</select>
			</div>
			{#if triggerKind === 'quantity'}
				<div>
					<label class="label" for="tqty">Quantidade a levar</label>
					<input class="field" id="tqty" type="number" min="1" max="20" bind:value={triggerQty} />
				</div>
				<div>
					<label class="label" for="tscope">De quais itens</label>
					<select class="field" id="tscope" bind:value={triggerScope}>
						<option value="all">Qualquer item</option>
						<option value="products">Produtos escolhidos</option>
						<option value="categories">Categorias escolhidas</option>
					</select>
				</div>
				<div class="sm:col-span-2">
					{@render picker(
						triggerScope,
						triggerIds,
						(ids) => (triggerIds = ids),
						'Itens que contam'
					)}
				</div>
			{:else}
				<p class="text-sm text-muted">Defina o valor mínimo em "Limites" abaixo.</p>
			{/if}
			<div>
				<label class="label" for="rscope">Item que ganha</label>
				<select class="field" id="rscope" bind:value={rewardScope}>
					{#if triggerKind === 'quantity'}<option value="same">Um dos mesmos itens</option>{/if}
					<option value="products">Produtos escolhidos</option>
					<option value="categories">Categorias escolhidas</option>
				</select>
			</div>
			<div>
				<label class="label" for="rqty">Quantidade que ganha</label>
				<input class="field" id="rqty" type="number" min="1" max="10" bind:value={rewardQty} />
			</div>
			<div class="sm:col-span-2">
				{@render picker(rewardScope, rewardIds, (ids) => (rewardIds = ids), 'Itens de brinde')}
			</div>
			<div>
				<label class="label" for="rpct">Desconto no item (%)</label>
				<input class="field" id="rpct" type="number" min="1" max="100" bind:value={rewardPercent} />
			</div>
			<div>
				<label class="label" for="target">Qual item sai com desconto</label>
				<select class="field" id="target" bind:value={target}>
					<option value="cheapest">O mais barato</option>
					<option value="most_expensive">O mais caro</option>
				</select>
			</div>
			<div>
				<label class="label" for="maxpo">Vezes por pedido</label>
				<input class="field" id="maxpo" type="number" min="1" max="20" bind:value={maxPerOrder} />
			</div>
			<p class="text-xs text-muted sm:col-span-2">
				O cliente coloca o item de brinde no carrinho; o desconto aparece no resumo. Adicionais
				pagos do item continuam cobrados.
			</p>
		{/if}
	</section>

	<section class="grid gap-3 card p-4 sm:grid-cols-2">
		<h2 class="font-semibold sm:col-span-2">Como aplica</h2>
		<div>
			<label class="label" for="code">Código do cupom</label>
			<input
				class="field uppercase"
				id="code"
				maxlength="24"
				placeholder="EX: SEXTA15"
				bind:value={code}
			/>
		</div>
		<label class="flex items-center gap-2 self-end pb-2 text-sm">
			<input type="checkbox" class="size-5" bind:checked={autoApply} />
			Aplicar sozinho, sem código
		</label>
	</section>

	<section class="grid gap-3 card p-4 sm:grid-cols-2">
		<h2 class="font-semibold sm:col-span-2">Quando vale</h2>
		<div>
			<label class="label" for="starts">Começa (opcional)</label>
			<input class="field" id="starts" type="datetime-local" bind:value={startsAt} />
		</div>
		<div>
			<label class="label" for="ends">Termina (opcional)</label>
			<input class="field" id="ends" type="datetime-local" bind:value={endsAt} />
		</div>
		<div class="space-y-2 sm:col-span-2">
			<p class="label">Dias e horários (vazio = qualquer horário)</p>
			{#each windows as w, i (i)}
				<div class="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
					{#each WEEKDAYS_PT as day, d (d)}
						<label class="flex items-center gap-1 text-xs">
							<input
								type="checkbox"
								checked={w.days.includes(d)}
								onchange={() =>
									(w.days = w.days.includes(d)
										? w.days.filter((x) => x !== d)
										: [...w.days, d].sort())}
							/>{day.slice(0, 3)}
						</label>
					{/each}
					<input class="field w-28" type="time" bind:value={w.start} aria-label="Das" />
					<span class="text-sm">às</span>
					<input class="field w-28" type="time" bind:value={w.end} aria-label="Até" />
					<button
						type="button"
						class="btn-ghost min-h-9 px-2"
						onclick={() => (windows = windows.filter((_, j) => j !== i))}>Remover</button
					>
				</div>
			{/each}
			<button
				type="button"
				class="btn-secondary"
				onclick={() =>
					(windows = [...windows, { days: [1, 2, 3, 4, 5], start: '18:00', end: '20:00' }])}
				>Adicionar horário</button
			>
		</div>
	</section>

	<section class="grid gap-3 card p-4 sm:grid-cols-2">
		<h2 class="font-semibold sm:col-span-2">Limites</h2>
		<div>
			<label class="label" for="min">Pedido mínimo (R$)</label>
			<input class="field" id="min" inputmode="decimal" bind:value={minOrder} />
		</div>
		<div>
			<label class="label" for="maxt">Total de usos (vazio = sem limite)</label>
			<input class="field" id="maxt" type="number" min="1" bind:value={maxUsesTotal} />
		</div>
		<div>
			<label class="label" for="maxc">Usos por cliente (vazio = sem limite)</label>
			<input class="field" id="maxc" type="number" min="1" bind:value={maxUsesPerCustomer} />
		</div>
		<label class="flex items-center gap-2 self-end pb-2 text-sm">
			<input type="checkbox" class="size-5" bind:checked={firstOrderOnly} />
			Só no primeiro pedido do cliente
		</label>
		{#if maxUsesPerCustomer || firstOrderOnly}
			<p class="text-xs text-warn sm:col-span-2">
				Limites por cliente precisam saber quem é o cliente: no site vale pelo telefone; no caixa a
				promoção não se aplica a vendas sem cliente identificado.
			</p>
		{/if}
	</section>

	<section class="card bg-brand-50 p-4" aria-live="polite">
		<h2 class="mb-1 text-sm font-semibold">Como o cliente vai entender</h2>
		<p>{preview}</p>
	</section>

	<FormError message={error ?? form?.error} />
	<div class="flex flex-wrap gap-2">
		<button class="btn-secondary" name="intent" value="save">
			{c?.status === 'active' ? 'Salvar' : 'Salvar rascunho'}
		</button>
		{#if c?.status !== 'active'}
			<button class="btn-primary" name="intent" value="activate">Salvar e ativar</button>
		{/if}
	</div>
</form>
