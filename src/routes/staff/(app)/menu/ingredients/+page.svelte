<script lang="ts">
	import EmptyState from '#lib/components/molecules/EmptyState.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';

	let { data, form } = $props();
	let editing = $state<string | null>(null);
	let confirming = $state<string | null>(null);
	const t = useTexts();
</script>

<svelte:head><title>{t('ingredients.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-3xl space-y-4 p-4">
	<div>
		<h1 class="page-title">{t('ingredients.title')}</h1>
		<p class="text-sm text-muted">
			{t('ingredients.introBefore')}
			<a class="underline" href="/staff/menu">{t('ingredients.availability')}</a>.
		</p>
	</div>
	<FormError message={form?.error} />

	<form
		method="POST"
		action="?/save"
		use:enhance
		class="grid gap-3 card p-4 sm:grid-cols-[2fr_2fr_auto] sm:items-end"
	>
		<TextField
			label={t('ingredients.new')}
			id="new-name"
			name="name"
			required
			maxlength={80}
			placeholder={t('ingredients.newPlaceholder')}
		/>
		<TextField
			label={t('ingredients.allergensComma')}
			id="new-allergens"
			name="allergens"
			placeholder={t('ingredients.allergensPlaceholder')}
		/>
		<input type="hidden" name="position" value={data.ingredients.length} />
		<button class="btn-primary">{t('ingredients.add')}</button>
	</form>

	{#if data.ingredients.length === 0}
		<EmptyState title={t('ingredients.none')} />
	{:else}
		<ul class="divide-y divide-line card">
			{#each data.ingredients as ing (ing.id)}
				<li class="p-3">
					{#if editing === ing.id}
						<GuardedForm
							action="?/save"
							after={(result) => {
								if (result.type === 'success') editing = null;
							}}
							class="grid gap-3 sm:grid-cols-[2fr_2fr_5rem_auto] sm:items-end"
						>
							<input type="hidden" name="id" value={ing.id} />
							<TextField
								label={t('ingredients.name')}
								id="name-{ing.id}"
								name="name"
								value={ing.name}
								required
								maxlength={80}
							/>
							<TextField
								label={t('ingredients.allergens')}
								id="all-{ing.id}"
								name="allergens"
								value={ing.allergens.join(', ')}
							/>
							<TextField
								label={t('menuEdit.order')}
								id="pos-{ing.id}"
								name="position"
								type="number"
								value={ing.position}
							/>
							<div class="flex gap-2">
								<button class="btn-primary">{t('menuEdit.save')}</button>
								<button type="button" class="btn-ghost" onclick={() => (editing = null)}
									>{t('menuEdit.cancel')}</button
								>
							</div>
						</GuardedForm>
					{:else}
						<div class="flex flex-wrap items-center gap-3">
							<div class="min-w-0 flex-1">
								<p class="font-medium">
									{ing.name}
									{#if !ing.available}<span
											class="ml-1 rounded-full bg-bad-tint px-2 py-0.5 text-xs font-semibold text-bad"
											>{t('ingredients.missing')}</span
										>{/if}
								</p>
								<p class="text-xs text-muted">
									{ing.allergens.length
										? `${t('ingredients.allergensLine', { list: ing.allergens.join(', ') })} `
										: ''}
									{ing.products.length
										? t('ingredients.usedIn', { list: ing.products.join(', ') })
										: t('ingredients.unused')}
								</p>
							</div>
							{#if confirming === ing.id}
								<form method="POST" action="?/delete" use:enhance class="flex items-center gap-2">
									<input type="hidden" name="id" value={ing.id} />
									<span class="text-sm">{t('ingredients.deleteAsk')}</span>
									<button class="btn-danger min-h-9 text-sm">{t('menuEdit.delete')}</button>
									<button
										type="button"
										class="btn-ghost min-h-9 text-sm"
										onclick={() => (confirming = null)}>{t('ingredients.no')}</button
									>
								</form>
							{:else}
								<button class="btn-secondary min-h-9 text-sm" onclick={() => (editing = ing.id)}
									>{t('menuEdit.edit')}</button
								>
								<button
									class="btn-ghost min-h-9 text-sm text-bad"
									onclick={() => (confirming = ing.id)}>{t('ingredients.deleteMore')}</button
								>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</main>
