<script lang="ts">
	import TextField from '#lib/components/molecules/TextField.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import ChoiceButtons from '#lib/components/molecules/ChoiceButtons.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';
	import {
		buyXGetYParams,
		codeDiscountParams,
		type BuyXGetYParams,
		type CodeDiscountParams,
		type TemplateKey,
		type TimeWindow
	} from '#lib/domain/campaigns.ts';
	import { formatBRL, parseBRL } from '#lib/domain/money.ts';
	import { toShopInput } from '#lib/domain/time.ts';
	import { useLabels, useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const label = useLabels(t);

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

	// Most of this editor lives in script state, so the guard compares that as well.
	const editorState = () => [
		name,
		tagline,
		templateKey,
		code,
		autoApply,
		startsAt,
		endsAt,
		windows,
		minOrder,
		maxUsesTotal,
		maxUsesPerCustomer,
		firstOrderOnly,
		params()
	];

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
		const off =
			rewardPercent === 100
				? t('campaign.p.free')
				: t('campaign.p.off', { percent: rewardPercent });
		let what: string;
		if (templateKey === 'code_discount') {
			what =
				benefitType === 'percent'
					? `${t('campaign.p.percent', { percent })}${parseBRL(maxDiscount) ? ` ${t('campaign.p.upTo', { value: maxDiscount })}` : ''}`
					: benefitType === 'fixed'
						? t('campaign.p.fixed', { value: amount || '0' })
						: t('campaign.p.freeDelivery');
		} else if (triggerKind === 'quantity') {
			const from =
				triggerScope === 'all' ? t('campaign.p.anyItem') : names(triggerScope, triggerIds);
			const reward =
				rewardScope === 'same'
					? t('campaign.p.more', { n: rewardQty })
					: t('campaign.p.of', { n: rewardQty, items: names(rewardScope, rewardIds) });
			what = t('campaign.p.buy', { n: triggerQty, items: from, reward, off });
		} else {
			what = t('campaign.p.gift', { n: rewardQty, items: names(rewardScope, rewardIds), off });
		}
		const min = parseBRL(minOrder) ? ` ${t('campaign.p.min', { value: minOrder })}` : '';
		const how = autoApply
			? t('campaign.p.auto')
			: code
				? t('campaign.p.code', { code: code.toUpperCase() })
				: '';
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

<svelte:head
	><title>{t('campaign.tabTitle', { name: c ? c.name : t('campaign.new') })}</title></svelte:head
>

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

<GuardedForm
	action="?/save"
	enctype="multipart/form-data"
	class="max-w-3xl space-y-5"
	state={editorState}
	before={(input) => {
		const body = payload(input.submitter?.getAttribute('value') === 'activate');
		if (!body) {
			error = t('campaign.reviewRules');
			input.cancel();
			return false;
		}
		error = null;
		input.formData.set('payload', body);
	}}
>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="page-title">{c ? c.name : t('campaign.new')}</h1>
		<a class="btn-ghost" href="/staff/campaigns">{t('campaign.back')}</a>
	</div>
	{#if c && c.uses > 0}
		<p class="alert-warn">
			{t('campaign.used', { n: c.uses })}
		</p>
	{/if}

	<section class="grid gap-3 card p-4 sm:grid-cols-2">
		<div class="sm:col-span-2">
			<TextField label={t('campaign.name')} id="name" maxlength={80} bind:value={name} required />
		</div>
		<div class="sm:col-span-2">
			<TextField
				label={t('campaign.tagline')}
				id="tagline"
				maxlength={80}
				bind:value={tagline}
				placeholder={t('campaign.taglinePlaceholder')}
			/>
		</div>
		<div class="flex flex-wrap items-center gap-3 sm:col-span-2">
			{#if c?.imageUrl}<img src={c.imageUrl} alt="" class="size-16 rounded-lg object-cover" />{/if}
			<div class="min-w-0 flex-1">
				<label class="label" for="campaign-photo">{t('campaign.photo')}</label>
				<input
					id="campaign-photo"
					class="field"
					type="file"
					name="photo"
					accept="image/jpeg,image/png,image/webp"
				/>
			</div>
			{#if c?.imageUrl}
				<Checkbox label={t('campaign.removePhoto')} name="removePhoto" value="1" class="text-sm" />
			{/if}
		</div>
		<fieldset class="sm:col-span-2">
			<legend class="label">{t('campaign.type')}</legend>
			<ChoiceButtons
				label={t('campaign.type')}
				choices={[
					{ value: 'code_discount', label: t('campaign.type.code') },
					{ value: 'buy_x_get_y', label: t('campaign.type.bxgy') }
				]}
				bind:value={templateKey}
			/>
		</fieldset>
	</section>

	<section class="grid gap-3 card p-4 sm:grid-cols-2">
		<h2 class="font-semibold sm:col-span-2">{t('campaign.benefit')}</h2>
		{#if templateKey === 'code_discount'}
			<SelectField label={t('campaign.discount')} id="btype" bind:value={benefitType}>
				<option value="percent">{t('campaign.percent')}</option>
				<option value="fixed">{t('campaign.fixed')}</option>
				<option value="free_delivery">{t('campaign.freeDelivery')}</option>
			</SelectField>
			{#if benefitType === 'percent'}
				<TextField
					label={t('campaign.percentField')}
					id="pct"
					type="number"
					min={1}
					max={100}
					bind:value={percent}
				/>
				<TextField
					label={t('campaign.maxDiscount')}
					id="maxd"
					inputmode="decimal"
					bind:value={maxDiscount}
				/>
			{:else if benefitType === 'fixed'}
				<TextField label={t('campaign.amount')} id="amt" inputmode="decimal" bind:value={amount} />
			{/if}
			<p class="text-xs text-muted sm:col-span-2">
				{t('campaign.percentHint')}
			</p>
		{:else}
			<SelectField label={t('campaign.when')} id="tkind" bind:value={triggerKind}>
				<option value="quantity">{t('campaign.trigger.quantity')}</option>
				<option value="min_order">{t('campaign.trigger.minOrder')}</option>
			</SelectField>
			{#if triggerKind === 'quantity'}
				<TextField
					label={t('campaign.triggerQty')}
					id="tqty"
					type="number"
					min={1}
					max={20}
					bind:value={triggerQty}
				/>
				<SelectField label={t('campaign.triggerScope')} id="tscope" bind:value={triggerScope}>
					<option value="all">{t('campaign.scope.all')}</option>
					<option value="products">{t('campaign.scope.products')}</option>
					<option value="categories">{t('campaign.scope.categories')}</option>
				</SelectField>
				<div class="sm:col-span-2">
					{@render picker(
						triggerScope,
						triggerIds,
						(ids) => (triggerIds = ids),
						t('campaign.triggerItems')
					)}
				</div>
			{:else}
				<p class="text-sm text-muted">{t('campaign.minHint')}</p>
			{/if}
			<SelectField label={t('campaign.rewardScope')} id="rscope" bind:value={rewardScope}>
				{#if triggerKind === 'quantity'}<option value="same">{t('campaign.scope.same')}</option
					>{/if}
				<option value="products">{t('campaign.scope.products')}</option>
				<option value="categories">{t('campaign.scope.categories')}</option>
			</SelectField>
			<TextField
				label={t('campaign.rewardQty')}
				id="rqty"
				type="number"
				min={1}
				max={10}
				bind:value={rewardQty}
			/>
			<div class="sm:col-span-2">
				{@render picker(
					rewardScope,
					rewardIds,
					(ids) => (rewardIds = ids),
					t('campaign.rewardItems')
				)}
			</div>
			<TextField
				label={t('campaign.rewardPercent')}
				id="rpct"
				type="number"
				min={1}
				max={100}
				bind:value={rewardPercent}
			/>
			<SelectField label={t('campaign.target')} id="target" bind:value={target}>
				<option value="cheapest">{t('campaign.cheapest')}</option>
				<option value="most_expensive">{t('campaign.mostExpensive')}</option>
			</SelectField>
			<TextField
				label={t('campaign.perOrder')}
				id="maxpo"
				type="number"
				min={1}
				max={20}
				bind:value={maxPerOrder}
			/>
			<p class="text-xs text-muted sm:col-span-2">
				{t('campaign.rewardHint')}
			</p>
		{/if}
	</section>

	<section class="grid gap-3 card p-4 sm:grid-cols-2">
		<h2 class="font-semibold sm:col-span-2">{t('campaign.howApply')}</h2>
		<TextField
			label={t('campaign.code')}
			id="code"
			maxlength={24}
			placeholder={t('campaign.codePlaceholder')}
			bind:value={code}
			class="uppercase"
		/>
		<Checkbox
			label={t('campaign.autoApply')}
			bind:checked={autoApply}
			class="self-end pb-2 text-sm"
		/>
	</section>

	<section class="grid gap-3 card p-4 sm:grid-cols-2">
		<h2 class="font-semibold sm:col-span-2">{t('campaign.validity')}</h2>
		<TextField
			label={t('campaign.starts')}
			id="starts"
			type="datetime-local"
			bind:value={startsAt}
		/>
		<TextField label={t('campaign.ends')} id="ends" type="datetime-local" bind:value={endsAt} />
		<div class="space-y-2 sm:col-span-2">
			<p class="label">{t('campaign.windows')}</p>
			{#each windows as w, i (i)}
				<div class="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
					{#each [0, 1, 2, 3, 4, 5, 6] as d (d)}
						{@const day = label.weekday(d)}
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
					<input
						class="field w-28"
						type="time"
						bind:value={w.start}
						aria-label={t('campaign.from')}
					/>
					<span class="text-sm">{t('campaign.to')}</span>
					<input
						class="field w-28"
						type="time"
						bind:value={w.end}
						aria-label={t('campaign.toLabel')}
					/>
					<button
						type="button"
						class="btn-ghost min-h-9 px-2"
						onclick={() => (windows = windows.filter((_, j) => j !== i))}
						>{t('campaign.removeWindow')}</button
					>
				</div>
			{/each}
			<button
				type="button"
				class="btn-secondary"
				onclick={() =>
					(windows = [...windows, { days: [1, 2, 3, 4, 5], start: '18:00', end: '20:00' }])}
				>{t('campaign.addWindow')}</button
			>
		</div>
	</section>

	<section class="grid gap-3 card p-4 sm:grid-cols-2">
		<h2 class="font-semibold sm:col-span-2">{t('campaign.limits')}</h2>
		<TextField label={t('campaign.minOrder')} id="min" inputmode="decimal" bind:value={minOrder} />
		<TextField
			label={t('campaign.maxTotal')}
			id="maxt"
			type="number"
			min={1}
			bind:value={maxUsesTotal}
		/>
		<TextField
			label={t('campaign.maxCustomer')}
			id="maxc"
			type="number"
			min={1}
			bind:value={maxUsesPerCustomer}
		/>
		<Checkbox
			label={t('campaign.firstOrder')}
			bind:checked={firstOrderOnly}
			class="self-end pb-2 text-sm"
		/>
		{#if maxUsesPerCustomer || firstOrderOnly}
			<p class="text-xs text-warn sm:col-span-2">
				{t('campaign.perCustomerHint')}
			</p>
		{/if}
	</section>

	<section class="card bg-brand-50 p-4" aria-live="polite">
		<h2 class="mb-1 text-sm font-semibold">{t('campaign.previewTitle')}</h2>
		<p>{preview}</p>
	</section>

	<FormError message={error ?? form?.error} />
	<div class="flex flex-wrap gap-2">
		<button class="btn-secondary" name="intent" value="save">
			{c?.status === 'active' ? t('campaign.save') : t('campaign.saveDraft')}
		</button>
		{#if c?.status !== 'active'}
			<button class="btn-primary" name="intent" value="activate"
				>{t('campaign.saveActivate')}</button
			>
		{/if}
	</div>
</GuardedForm>
