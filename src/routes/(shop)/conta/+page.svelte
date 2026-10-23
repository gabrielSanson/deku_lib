<script lang="ts">
	import TextField from '#lib/components/molecules/TextField.svelte';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import StatusBadge from '#lib/components/atoms/StatusBadge.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
</script>

<svelte:head><title>{t('account.mine.title')}</title></svelte:head>

<div class="space-y-6 py-4">
	<h1 class="page-title">{t('account.mine.title')}</h1>

	<section class="card p-5">
		<form method="POST" action="?/save" class="grid gap-4 sm:grid-cols-2">
			<TextField
				label={t('account.name')}
				name="name"
				autocomplete="name"
				required
				minlength={2}
				maxlength={60}
				value={data.customer.name ?? ''}
			/>
			<TextField
				label={t('account.phone')}
				name="phone"
				type="tel"
				inputmode="tel"
				autocomplete="tel"
				maxlength={25}
				value={data.customer.phone ?? ''}
			/>
			<div class="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
				<p class="flex items-center gap-2 text-sm text-muted">
					<Icon name="mail" class="size-4" />{data.customer.email ?? ''}
				</p>
				<div class="flex items-center gap-3">
					{#if form?.saved}<span class="text-sm font-semibold text-ok" role="status"
							>{t('account.mine.saved')}</span
						>{/if}
					<button class="btn-primary">{t('account.mine.save')}</button>
				</div>
			</div>
			{#if form?.error}<p class="alert-error sm:col-span-2" role="alert">{form.error}</p>{/if}
		</form>
	</section>

	<section class="space-y-3">
		<h2 class="section-label">{t('account.mine.orders')}</h2>
		{#if data.orders.length === 0}
			<p class="card p-5 text-muted">{t('account.mine.noOrders')}</p>
		{:else}
			<ul class="space-y-3">
				{#each data.orders as order (order.orderNumber)}
					<li class="flex flex-wrap items-center justify-between gap-3 card p-4">
						<div>
							<p class="font-display text-lg font-extrabold">#{order.orderNumber}</p>
							<p class="text-sm text-muted">{formatDateTime(order.createdAt)}</p>
						</div>
						<div class="flex items-center gap-3">
							<span class="font-semibold tabular-nums"><Money cents={order.totalCents} /></span>
							<StatusBadge status={order.status} />
							<a href="/orders/{order.publicToken}" class="btn-quiet min-h-10 px-3 text-sm"
								>{t('account.mine.track')}</a
							>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<form method="POST" action="?/logout">
		<button class="btn-secondary w-full sm:w-auto">
			<Icon name="logout" class="size-5" />{t('account.mine.logout')}
		</button>
	</form>
</div>
