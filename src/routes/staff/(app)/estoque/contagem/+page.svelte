<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import { qty } from '../units';

	let { data, form } = $props();
	const t = useTexts();
</script>

<p class="text-sm text-muted">{t('stock.count.intro')}</p>
<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
{#if form && 'adjusted' in form}<p class="alert-ok" role="status">
		{t('stock.count.done', { n: form.adjusted as number })}
	</p>{/if}

{#if data.items.length === 0}
	<p class="text-muted">{t('stock.none')}</p>
{:else}
	<form method="POST" use:enhance class="space-y-3">
		<ul class="divide-y divide-line card">
			{#each data.items as i (i.id)}
				<li class="flex items-center justify-between gap-3 p-3">
					<label for="c-{i.id}" class="min-w-0">
						<span class="block font-medium">{i.name}</span>
						<span class="text-sm text-muted">{t('stock.onHand')}: {qty(i.onHand)} {i.baseUnit}</span
						>
					</label>
					<input
						id="c-{i.id}"
						name="c:{i.id}"
						type="number"
						min="0"
						step="1"
						inputmode="numeric"
						class="field w-28 text-right"
						placeholder={String(Math.max(i.onHand, 0))}
					/>
				</li>
			{/each}
		</ul>
		<button class="btn-primary w-full sm:w-auto">{t('stock.count.save')}</button>
	</form>
{/if}
