<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { requiresReason, type OrderStatus } from '#lib/domain/order-status.ts';

	// The next steps staff may take on an order. Cancelling or refusing asks for a reason first.
	let {
		next,
		version,
		error
	}: {
		next: OrderStatus[];
		version: number;
		error?: string;
	} = $props();

	let reasonFor = $state<OrderStatus | null>(null);

	const actionLabel: Partial<Record<OrderStatus, string>> = {
		confirmed: 'Confirmar pedido',
		preparing: 'Iniciar preparo',
		ready: 'Marcar como pronto',
		completed: 'Entregue ao cliente',
		cancelled: 'Cancelar',
		rejected: 'Recusar'
	};
</script>

<div class="space-y-2 card p-3">
	<h2 class="font-semibold">Ações</h2>
	<FormError message={error} />
	{#each next as to (to)}
		{#if requiresReason(to)}
			{#if reasonFor === to}
				<form
					method="POST"
					action="?/transition"
					use:enhance={() =>
						async ({ update }) => {
							await update();
							reasonFor = null;
						}}
					class="space-y-2"
				>
					<input type="hidden" name="to" value={to} />
					<input type="hidden" name="version" value={version} />
					<input class="field" name="reason" placeholder="Motivo (obrigatório)" required />
					<div class="flex gap-2">
						<button type="button" class="btn-secondary flex-1" onclick={() => (reasonFor = null)}
							>Voltar</button
						>
						<button class="btn-danger flex-1">{actionLabel[to]}</button>
					</div>
				</form>
			{:else}
				<button class="btn-secondary w-full text-bad" onclick={() => (reasonFor = to)}
					>{actionLabel[to]}</button
				>
			{/if}
		{:else}
			<form method="POST" action="?/transition" use:enhance>
				<input type="hidden" name="to" value={to} />
				<input type="hidden" name="version" value={version} />
				<button class="btn-primary w-full">{actionLabel[to]}</button>
			</form>
		{/if}
	{:else}
		<p class="text-sm text-muted">Nenhuma ação disponível.</p>
	{/each}
</div>
