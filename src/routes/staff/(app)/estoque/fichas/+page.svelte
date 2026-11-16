<script lang="ts">
	import { formatBRL } from '#lib/domain/money.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	const channels = ['counter', 'web', 'ifood'] as const;
	const channelName = $derived({
		counter: t('orders.channel.counter'),
		web: t('orders.channel.web'),
		ifood: t('orders.channel.ifood')
	});
	const margin = (price: number, cost: number | null) =>
		cost == null || price <= 0 ? '—' : `${Math.round(((price - cost) / price) * 100)}%`;
</script>

<p class="text-sm text-muted">{t('stock.recipes.intro')}</p>

<div class="overflow-x-auto card">
	<table class="w-full text-sm">
		<thead class="text-left text-muted">
			<tr>
				<th class="p-2">{t('stock.recipes.product')}</th>
				<th class="p-2 text-right">{t('stock.recipes.cost')}</th>
				{#each channels as c (c)}
					<th class="p-2 text-right">{t('stock.recipes.margin', { channel: channelName[c] })}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each data.products as p (p.sku)}
				<tr class="border-t border-line">
					<td class="p-2">
						<a class="font-medium underline" href="/staff/estoque/fichas/produto/{p.sku}"
							>{p.name}</a
						>
					</td>
					<td class="p-2 text-right tabular-nums">
						{#if p.costCents == null}<span class="text-bad">{t('stock.recipes.missing')}</span>
						{:else}{formatBRL(p.costCents)}{/if}
					</td>
					{#each channels as c (c)}
						<td class="p-2 text-right tabular-nums">{margin(p.prices[c], p.costCents)}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if data.options.length}
	<h2 class="section-label">{t('stock.recipes.options')}</h2>
	<ul class="divide-y divide-line card">
		{#each data.options as o (o.sku)}
			<li class="flex justify-between gap-2 p-3 text-sm">
				<a class="underline" href="/staff/estoque/fichas/opcao/{o.sku}">{o.name}</a>
				<span class="tabular-nums">
					{#if o.costCents == null}<span class="text-muted">{t('stock.recipes.missing')}</span>
					{:else}{formatBRL(o.costCents)} · {margin(o.priceCents, o.costCents)}{/if}
				</span>
			</li>
		{/each}
	</ul>
{/if}
