<script lang="ts">
	import { enhance } from '$app/forms';
	import Money from '#lib/components/atoms/Money.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';

	let { data, form } = $props();

	const KIND_LABEL = {
		sale: 'Venda em dinheiro',
		refund: 'Estorno em dinheiro',
		sangria: 'Sangria',
		suprimento: 'Suprimento'
	} as const;

	const time = (d: Date | string) =>
		new Date(d).toLocaleTimeString('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Sao_Paulo'
		});
	const dateTime = (d: Date | string) =>
		new Date(d).toLocaleString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Sao_Paulo'
		});

	let kind = $state<'sangria' | 'suprimento'>('sangria');
	let busy = $state(false);
	let confirmClose = $state(false);

	const submit = () => {
		busy = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update();
			busy = false;
		};
	};
</script>

<svelte:head><title>Gaveta · Equipe</title></svelte:head>

<main class="mx-auto max-w-xl space-y-4 p-4">
	<h1 class="page-title">Gaveta do caixa</h1>

	{#if data.closed}
		{@const c = data.closed}
		<section class="space-y-2 card p-4" aria-labelledby="closed-title">
			<h2 id="closed-title" class="font-semibold">Caixa fechado às {time(c.closedAt!)}</h2>
			<div class="flex justify-between"><span>Contado</span><Money cents={c.countedCents!} /></div>
			<div class="flex justify-between">
				<span>Esperado</span><Money cents={c.expectedCents!} />
			</div>
			<div
				class="flex justify-between text-lg font-bold {c.differenceCents! < 0 ? 'text-bad' : ''}"
			>
				<span
					>{c.differenceCents === 0
						? 'Sem diferença'
						: c.differenceCents! < 0
							? 'Falta'
							: 'Sobra'}</span
				>
				<Money cents={Math.abs(c.differenceCents!)} />
			</div>
			{#if c.closeNote}<p class="text-sm text-muted">Obs.: {c.closeNote}</p>{/if}
		</section>
	{/if}

	{#if !data.session}
		<form method="POST" action="?/open" class="space-y-3 card p-4" use:enhance={submit}>
			<h2 class="font-semibold">Abrir o caixa</h2>
			<p class="text-sm text-muted">
				Conte o dinheiro que fica na gaveta para troco. Vendas em dinheiro só podem ser registradas
				com o caixa aberto.
			</p>
			<div>
				<label class="label" for="float">Fundo de troco (R$)</label>
				<input
					id="float"
					name="float"
					class="field text-lg"
					inputmode="decimal"
					placeholder="0,00"
					required
				/>
			</div>
			<FormError message={form?.error} />
			<button class="btn-primary w-full text-lg" disabled={busy}>Abrir caixa</button>
		</form>
	{:else}
		{@const s = data.session}
		<section class="space-y-1 card p-4">
			<p class="alert-ok">Caixa aberto por {s.openedByName} em {dateTime(s.openedAt)}.</p>
			<div class="flex justify-between pt-2">
				<span>Fundo de troco</span><Money cents={s.openingFloatCents} />
			</div>
			{#if data.balance}
				<div class="flex justify-between text-sm text-muted">
					<span>Vendas em dinheiro</span><Money cents={data.balance.salesCents} />
				</div>
				<div class="flex justify-between text-sm text-muted">
					<span>Sangrias e estornos</span><Money
						cents={data.balance.sangriaCents + data.balance.refundsCents}
					/>
				</div>
				<div class="flex justify-between text-sm text-muted">
					<span>Suprimentos</span><Money cents={data.balance.suprimentoCents} />
				</div>
				<div class="flex justify-between text-lg font-bold">
					<span>Esperado na gaveta</span><Money cents={data.balance.expectedCents} />
				</div>
				<p class="text-xs text-muted">
					Só administradores veem o valor esperado; quem fecha o caixa conta sem saber.
				</p>
			{/if}
		</section>

		<form method="POST" action="?/movement" class="space-y-3 card p-4" use:enhance={submit}>
			<h2 class="font-semibold">Sangria ou suprimento</h2>
			<input type="hidden" name="kind" value={kind} />
			<div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de movimento">
				<button
					type="button"
					class="btn {kind === 'sangria' ? 'bg-ink text-canvas' : 'btn-secondary'}"
					aria-pressed={kind === 'sangria'}
					onclick={() => (kind = 'sangria')}>Sangria (retirar)</button
				>
				<button
					type="button"
					class="btn {kind === 'suprimento' ? 'bg-ink text-canvas' : 'btn-secondary'}"
					aria-pressed={kind === 'suprimento'}
					onclick={() => (kind = 'suprimento')}>Suprimento (colocar)</button
				>
			</div>
			<div>
				<label class="label" for="amount">Valor (R$)</label>
				<input id="amount" name="amount" class="field text-lg" inputmode="decimal" required />
			</div>
			<div>
				<label class="label" for="reason">Motivo{kind === 'sangria' ? '' : ' (opcional)'}</label>
				<input
					id="reason"
					name="reason"
					class="field"
					placeholder={kind === 'sangria' ? 'Ex.: depósito no cofre' : 'Ex.: mais troco'}
					required={kind === 'sangria'}
				/>
			</div>
			{#if form?.recorded}
				<p class="alert-ok" role="status">
					{form.recorded === 'sangria' ? 'Sangria registrada.' : 'Suprimento registrado.'}
				</p>
			{/if}
			<FormError message={form?.error} />
			<button class="btn-secondary w-full" disabled={busy}>Registrar</button>
		</form>

		<form method="POST" action="?/close" class="space-y-3 card p-4" use:enhance={submit}>
			<h2 class="font-semibold">Fechar o caixa</h2>
			<p class="text-sm text-muted">
				Conte todo o dinheiro da gaveta, inclusive o fundo de troco, e digite o total. A diferença
				aparece depois de fechar e não pode ser alterada.
			</p>
			<div>
				<label class="label" for="counted">Dinheiro contado (R$)</label>
				<input id="counted" name="counted" class="field text-lg" inputmode="decimal" required />
			</div>
			<div>
				<label class="label" for="note">Observação (opcional)</label>
				<input id="note" name="note" class="field" />
			</div>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={confirmClose} />
				Contei o dinheiro e quero fechar o caixa
			</label>
			<FormError message={form?.error} />
			<button class="btn-primary w-full text-lg" disabled={busy || !confirmClose}
				>Fechar caixa</button
			>
		</form>

		<section class="card p-4">
			<h2 class="mb-2 font-semibold">Movimentos ({data.movements.length})</h2>
			{#if data.movements.length === 0}
				<p class="text-sm text-muted">Nenhum movimento ainda.</p>
			{:else}
				<ul class="divide-y divide-line text-sm">
					{#each data.movements as m (m.id)}
						<li class="flex items-baseline gap-2 py-2">
							<span class="w-12 text-muted tabular-nums">{time(m.createdAt)}</span>
							<span class="flex-1">
								{KIND_LABEL[m.kind]}{#if m.orderNumber}
									· #{m.orderNumber}{/if}{#if m.reason}
									· {m.reason}{/if}
								{#if m.recordedByName}<span class="text-muted"> · {m.recordedByName}</span>{/if}
							</span>
							<Money cents={m.amountCents} class={m.amountCents < 0 ? 'text-bad' : ''} />
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</main>
