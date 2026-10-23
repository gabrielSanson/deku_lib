<script lang="ts">
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { useTexts } from '#lib/texts/context.ts';
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

	const t = useTexts();
	let reasonFor = $state<OrderStatus | null>(null);

	const actionLabel: Partial<Record<OrderStatus, string>> = {
		confirmed: t('actions.confirmed'),
		preparing: t('actions.preparing'),
		ready: t('actions.ready'),
		completed: t('actions.completed'),
		cancelled: t('actions.cancelled'),
		rejected: t('actions.rejected')
	};
</script>

<div class="space-y-2 card p-3">
	<h2 class="font-semibold">{t('actions.title')}</h2>
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
					<TextField
						label={t('actions.reason')}
						hideLabel
						id="status-reason"
						name="reason"
						placeholder={t('actions.reason')}
						required
					/>
					<div class="flex gap-2">
						<button type="button" class="btn-secondary flex-1" onclick={() => (reasonFor = null)}
							>{t('actions.back')}</button
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
		<p class="text-sm text-muted">{t('actions.none')}</p>
	{/each}
</div>
