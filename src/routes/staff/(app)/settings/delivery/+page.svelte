<script lang="ts">
	import { enhance } from '$app/forms';
	import ConfirmDialog from '#lib/components/molecules/ConfirmDialog.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import Money from '#lib/components/atoms/Money.svelte';
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';
	import { formatBRL } from '#lib/domain/money.ts';
	import type { DeliveryRule } from '#lib/domain/pricing.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	let editing = $state<Partial<DeliveryRule> | null>(null);
	const t = useTexts();
	let removing = $state<DeliveryRule | null>(null);
	let removeOpen = $state(false);
	let removeForm = $state<HTMLFormElement>();
	const brl = (c: number) => formatBRL(c).replace(/[R$\s]/g, '');
</script>

<svelte:head><title>{t('delivery.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="page-title">{t('delivery.title')}</h1>
		<button
			class="btn-primary"
			onclick={() => (editing = { matchKind: 'neighborhood', enabled: true, priority: 100 })}
			>{t('delivery.new')}</button
		>
	</div>
	<p class="text-sm text-muted">
		{t('delivery.intro')}
	</p>
	<FormError message={form?.error} />

	{#if editing}
		<GuardedForm
			action="?/save"
			reset
			after={(result) => {
				if (result.type === 'success') editing = null;
			}}
			class="grid gap-3 card p-4 sm:grid-cols-2"
		>
			<input type="hidden" name="id" value={editing.id ?? ''} />
			<div>
				<label class="label" for="name">{t('delivery.name')}</label><input
					class="field"
					id="name"
					name="name"
					value={editing.name ?? ''}
					required
				/>
			</div>
			<div>
				<label class="label" for="kind">{t('delivery.kind')}</label>
				<select class="field" id="kind" name="matchKind" value={editing.matchKind}>
					<option value="neighborhood">{t('delivery.neighborhood')}</option>
					<option value="cep_prefix">{t('delivery.cepPrefix')}</option>
				</select>
			</div>
			<div>
				<label class="label" for="value">{t('delivery.value')}</label><input
					class="field"
					id="value"
					name="matchValue"
					value={editing.matchValue ?? ''}
					required
				/>
			</div>
			<div>
				<label class="label" for="fee">{t('delivery.fee')}</label><input
					class="field"
					id="fee"
					name="fee"
					inputmode="decimal"
					value={editing.feeCents !== undefined ? brl(editing.feeCents) : ''}
					required
				/>
			</div>
			<div>
				<label class="label" for="min">{t('delivery.min')}</label><input
					class="field"
					id="min"
					name="minOrder"
					inputmode="decimal"
					value={editing.minOrderCents !== undefined ? brl(editing.minOrderCents) : ''}
				/>
			</div>
			<div>
				<label class="label" for="prio">{t('delivery.priority')}</label><input
					class="field"
					id="prio"
					name="priority"
					type="number"
					value={editing.priority ?? 100}
				/>
			</div>
			<label class="flex min-h-11 items-center gap-2"
				><input class="size-5" type="checkbox" name="enabled" checked={editing.enabled} />
				{t('delivery.active')}</label
			>
			<div class="flex gap-2 sm:col-span-2">
				<button type="button" class="btn-secondary" onclick={() => (editing = null)}
					>{t('delivery.cancel')}</button
				>
				<button class="btn-primary">{t('settings.save')}</button>
			</div>
		</GuardedForm>
	{/if}

	<div class="overflow-x-auto card">
		<table class="w-full text-sm">
			<thead class="bg-quiet text-left text-xs text-muted uppercase">
				<tr
					><th class="p-3">{t('delivery.name')}</th><th class="p-3">{t('delivery.col.area')}</th><th
						class="p-3">{t('delivery.col.fee')}</th
					><th class="p-3">{t('delivery.col.min')}</th><th class="p-3">{t('delivery.priority')}</th
					><th class="p-3">{t('delivery.col.status')}</th><th></th></tr
				>
			</thead>
			<tbody class="divide-y divide-line">
				{#each data.rules as r (r.id)}
					<tr>
						<td class="p-3 font-medium">{r.name}</td>
						<td class="p-3"
							>{r.matchKind === 'cep_prefix'
								? t('delivery.cep', { value: r.matchValue })
								: r.matchValue}</td
						>
						<td class="p-3"><Money cents={r.feeCents} /></td>
						<td class="p-3"><Money cents={r.minOrderCents} /></td>
						<td class="p-3">{r.priority}</td>
						<td class="p-3">{r.enabled ? t('delivery.active') : t('delivery.inactive')}</td>
						<td class="flex gap-1 p-2">
							<button class="btn-ghost min-h-9 text-sm" onclick={() => (editing = { ...r })}
								>{t('delivery.edit')}</button
							>
							<button
								class="btn-ghost min-h-9 text-sm text-bad"
								onclick={() => {
									removing = r;
									removeOpen = true;
								}}>{t('delivery.delete')}</button
							>
						</td>
					</tr>
				{:else}
					<tr><td colspan="7" class="p-8 text-center text-muted">{t('delivery.empty')}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<form class="flex flex-wrap items-end gap-2 card p-4" method="GET">
		<div>
			<label class="label" for="pcep">{t('delivery.testCep')}</label><input
				class="field"
				id="pcep"
				name="cep"
				value={data.preview?.cep ?? ''}
			/>
		</div>
		<div>
			<label class="label" for="phood">{t('delivery.testHood')}</label><input
				class="field"
				id="phood"
				name="bairro"
				value={data.preview?.hood ?? ''}
			/>
		</div>
		<button class="btn-secondary">{t('delivery.test')}</button>
		{#if data.preview}
			<p class="w-full text-sm" role="status">
				{#if data.preview.rule}
					{t('delivery.rule', {
						name: data.preview.rule.name,
						fee: formatBRL(data.preview.rule.feeCents),
						min: formatBRL(data.preview.rule.minOrderCents)
					})}
				{:else}
					{t('delivery.outside')}
				{/if}
			</p>
		{/if}
	</form>

	<form method="POST" action="?/delete" use:enhance bind:this={removeForm} hidden>
		<input type="hidden" name="id" value={removing?.id ?? ''} />
	</form>
	<ConfirmDialog
		bind:open={removeOpen}
		title={t('delivery.deleteConfirm', { name: removing?.name ?? '' })}
		text={t('delivery.deleteText')}
		confirmLabel={t('delivery.delete')}
		cancelLabel={t('delivery.cancel')}
		danger
		onconfirm={() => removeForm?.requestSubmit()}
	/>
</div>
