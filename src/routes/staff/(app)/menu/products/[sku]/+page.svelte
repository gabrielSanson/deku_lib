<script lang="ts">
	import FileField from '#lib/components/molecules/FileField.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import TextArea from '#lib/components/molecules/TextArea.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { untrack } from 'svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import { formatBRL, parseBRL } from '#lib/domain/money.ts';
	import { cropTo43 } from '#lib/client/image-crop.ts';
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const p = $derived(data.product);
	const channels = [
		{ id: 'counter', label: t('product.channel.counter') },
		{ id: 'web', label: t('product.channel.web') },
		{ id: 'ifood', label: t('product.channel.ifood') }
	];
	let busy = $state(false);
	let confirmDelete = $state(false);
	let preview = $state<string | null>(null);
	// What the customer sees, updated while the form is edited.
	const live = $state({
		name: untrack(() => p.name),
		description: untrack(() => p.description),
		price: untrack(() => (p.priceCents ? formatBRL(p.priceCents).replace(/[R$\s]/g, '') : ''))
	});
	function track(e: Event) {
		const el = e.target as HTMLInputElement | HTMLTextAreaElement;
		if (el.id === 'name' || el.id === 'description' || el.id === 'price') live[el.id] = el.value;
	}

	async function pick(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (preview) URL.revokeObjectURL(preview);
		if (!file) {
			preview = null;
			return;
		}
		// Cut to the menu's 4:3 shape and shrink it before it is uploaded.
		const cropped = await cropTo43(file);
		if (cropped !== file) {
			const files = new DataTransfer();
			files.items.add(cropped);
			input.files = files.files;
		}
		preview = URL.createObjectURL(cropped);
	}
</script>

<svelte:head
	><title>{t('product.tabTitle', { name: data.isNew ? t('product.new') : p.name })}</title
	></svelte:head
>

<main class="mx-auto max-w-2xl space-y-4 p-4">
	<a class="btn-ghost min-h-9" href="/staff/menu/edit">{t('menuEdit.back')}</a>
	<h1 class="page-title">{data.isNew ? t('product.new') : p.name}</h1>
	<FormError message={form?.error} />
	{#if page.url.searchParams.has('salvo') && !form}<p class="alert-ok">{t('product.saved')}</p>{/if}

	<section class="card p-4" aria-label={t('product.preview')}>
		<p class="mb-3 section-label">{t('product.preview')}</p>
		<div class="flex gap-3">
			{#if preview || p.imageUrl}
				<img src={preview ?? p.imageUrl} alt="" class="size-24 shrink-0 rounded-lg object-cover" />
			{:else}
				<div
					class="grid size-24 shrink-0 place-items-center rounded-lg bg-night text-xs text-stone-400"
				>
					{t('product.noPhoto')}
				</div>
			{/if}
			<div class="min-w-0">
				<p class="font-bold">{live.name || t('product.namePlaceholder')}</p>
				<p class="line-clamp-2 text-sm text-muted">{live.description}</p>
				<Money cents={parseBRL(live.price) ?? 0} class="mt-1 block font-black" />
			</div>
		</div>
	</section>

	<GuardedForm
		oninput={track}
		action="?/save"
		enctype="multipart/form-data"
		before={() => {
			busy = true;
		}}
		after={() => (busy = false)}
		class="space-y-4 card p-4"
	>
		<TextField label={t('product.name')} name="name" value={p.name} required maxlength={120} />
		<TextArea
			label={t('product.description')}
			name="description"
			maxlength={600}
			value={p.description}
			class="min-h-20"
		/>
		<div class="grid gap-3 sm:grid-cols-2">
			<TextField
				label={t('product.price')}
				name="price"
				inputmode="decimal"
				value={p.priceCents ? formatBRL(p.priceCents).replace(/[R$\s]/g, '') : ''}
				placeholder="29,90"
				required
			/>
			<SelectField label={t('product.category')} name="categoryId" value={p.categoryId}>
				{#each data.categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
			</SelectField>
			<SelectField label={t('product.station')} name="prepStation" value={p.prepStation}>
				{#each data.stations as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
			</SelectField>
			<TextField label={t('product.position')} name="position" type="number" value={p.position} />
		</div>

		<fieldset>
			<legend class="label">{t('product.photo')}</legend>
			<div class="flex items-center gap-3">
				{#if preview || p.imageUrl}
					<img src={preview ?? p.imageUrl} alt="" class="size-20 rounded-lg object-cover" />
				{/if}
				<FileField label={t('product.photo')} hideLabel id="photo" onchange={pick} />
			</div>
			{#if p.imageUrl}
				<Checkbox
					label={t('product.removePhoto')}
					name="removePhoto"
					value="1"
					class="mt-2 text-sm"
				/>
			{/if}
			<p class="mt-1 text-xs text-muted">
				{t('product.photoHint')}
			</p>
		</fieldset>

		<fieldset>
			<legend class="label">{t('product.channels')}</legend>
			<div class="flex flex-wrap gap-4">
				{#each channels as c (c.id)}
					<Checkbox
						label={c.label}
						name="channels"
						value={c.id}
						checked={p.channels.includes(c.id)}
					/>
				{/each}
			</div>
		</fieldset>

		{#if data.groups.length}
			<fieldset>
				<legend class="label">{t('product.groups')}</legend>
				<div class="flex flex-wrap gap-4">
					{#each data.groups as g (g.id)}
						<Checkbox
							label={g.name}
							name="groupIds"
							value={g.id}
							checked={p.groupIds.includes(g.id)}
						/>
					{/each}
				</div>
			</fieldset>
		{/if}

		<fieldset>
			<legend class="label">{t('product.ingredients')}</legend>
			{#if data.ingredients.length}
				<p class="mb-2 text-xs text-muted">
					{t('product.ingredientsHint')}
				</p>
				<ul class="divide-y divide-line rounded-lg border border-line">
					{#each data.ingredients as ing (ing.id)}
						{@const current = p.ingredients.find((i) => i.id === ing.id)}
						<li class="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
							<Checkbox
								label={ing.name}
								hint={ing.allergens.length ? ing.allergens.join(', ') : undefined}
								class="flex-1"
								name="ingredientIds"
								value={ing.id}
								checked={Boolean(current)}
							/>
							<Checkbox
								label={t('product.removable')}
								name="removable"
								value={ing.id}
								checked={current?.removable ?? true}
								class="text-sm"
							/>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-muted">
					{t('product.noIngredients')}
					<a class="underline" href="/staff/menu/ingredients">{t('product.ingredientsLink')}</a>.
				</p>
			{/if}
		</fieldset>

		<TextField
			label={t('product.allergens')}
			name="allergens"
			value={p.allergens.join(', ')}
			placeholder={t('product.allergensPlaceholder')}
		/>

		{#if data.isNew}
			<TextField
				label={t('product.sku')}
				name="sku"
				maxlength={40}
				pattern="[A-Za-z0-9-]+"
				placeholder={t('product.skuPlaceholder')}
				class="uppercase"
				hint={t('product.skuHint')}
			/>
		{:else}
			<p class="text-sm text-muted">
				{t('product.skuShow', { sku: p.sku })}
			</p>
		{/if}

		<Checkbox label={t('product.active')} name="active" checked={p.active} />
		<button class="btn-primary w-full" disabled={busy}
			>{busy ? t('product.saving') : t('product.save')}</button
		>
	</GuardedForm>

	{#if !data.isNew}
		<section class="card p-4">
			{#if confirmDelete}
				<form method="POST" action="?/delete" use:enhance class="space-y-2">
					<p class="text-sm">
						{t('product.deleteText', { name: p.name })}
					</p>
					<div class="flex gap-2">
						<button class="btn-danger">{t('product.delete')}</button>
						<button type="button" class="btn-ghost" onclick={() => (confirmDelete = false)}
							>{t('product.cancel')}</button
						>
					</div>
				</form>
			{:else}
				<button class="btn-ghost text-bad" onclick={() => (confirmDelete = true)}
					>{t('product.deleteAsk')}</button
				>
			{/if}
		</section>
	{/if}
</main>
