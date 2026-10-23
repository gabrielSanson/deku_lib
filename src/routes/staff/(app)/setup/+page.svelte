<script lang="ts">
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SetupProgressRail from '#lib/components/organisms/SetupProgressRail.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const labels = $derived<Record<string, string>>({
		loja: t('setup.step.loja'),
		cardapio: t('setup.step.cardapio'),
		entrega: t('setup.step.entrega'),
		equipe: t('setup.step.equipe'),
		pagamentos: t('setup.step.pagamentos'),
		ifood: t('setup.step.ifood'),
		concluir: t('setup.step.concluir')
	});
	const index = $derived(data.steps.indexOf(data.step));
	const nextStep = $derived(data.steps[index + 1]);
	const prevStep = $derived(data.steps[index - 1]);
	const p = $derived(data.profile);
	const ifood = $derived(data.ifood);
	const keep =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
	let pixEnabled = $derived(data.profile.pix.enabled);
	const problem = $derived(
		form && 'ifoodProblem' in form
			? (form.ifoodProblem as { stage: string; title: string; action: string; detail: string })
			: null
	);
</script>

<svelte:head><title>{t('setup.pageTitle', { step: labels[data.step] })}</title></svelte:head>

<main class="mx-auto max-w-3xl space-y-4 p-4">
	<h1 class="page-title">{t('setup.title')}</h1>
	<SetupProgressRail steps={data.steps} {labels} current={data.step} {index} />

	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'ok' in form && typeof form.ok === 'string'}<p class="alert-ok">{form.ok}</p>{/if}
	{#if form && 'warning' in form}<p class="alert-warn">{form.warning}</p>{/if}

	{#if data.step === 'loja'}
		<form
			method="POST"
			action="?passo={data.step}&/store"
			use:enhance={keep}
			class="space-y-4 card p-4"
		>
			<h2 class="text-lg font-bold">{t('setup.loja.title')}</h2>
			<p class="text-sm text-muted">{t('setup.loja.hint')}</p>
			<TextField
				label={t('setup.loja.name')}
				name="displayName"
				value={p.displayName}
				required
				maxlength={80}
			/>
			<div class="grid gap-3 sm:grid-cols-2">
				<TextField
					label={t('setup.loja.phone')}
					name="phone"
					value={p.phone ?? ''}
					inputmode="tel"
					placeholder={t('setup.loja.phonePh')}
				/>
				<TextField
					label={t('setup.loja.city')}
					name="city"
					value={p.city ?? ''}
					placeholder={t('setup.loja.cityPh')}
				/>
			</div>
			<TextField
				label={t('setup.loja.address')}
				name="addressLine"
				value={p.addressLine ?? ''}
				placeholder={t('setup.loja.addressPh')}
			/>
			<button class="btn-primary w-full">{t('setup.next')}</button>
		</form>
	{:else if data.step === 'cardapio'}
		<section class="space-y-3 card p-4">
			<h2 class="text-lg font-bold">{t('setup.menu.title')}</h2>
			{#if data.counts.products > 0}
				<p class="alert-ok">
					{t('setup.menu.count', {
						products: data.counts.products,
						categories: data.counts.categories
					})}
				</p>
			{:else}
				<p class="text-sm">{t('setup.menu.empty')}</p>
				<form method="POST" action="?passo={data.step}&/sampleMenu" use:enhance>
					<button class="btn-secondary w-full">{t('setup.menu.sample')}</button>
				</form>
			{/if}
			<a class="btn-primary w-full" href="/staff/menu/edit">{t('setup.menu.editor')}</a>
			<p class="text-xs text-muted">{t('setup.menu.tip')}</p>
		</section>
	{:else if data.step === 'entrega'}
		<form
			method="POST"
			action="?passo={data.step}&/fulfillment"
			use:enhance={keep}
			class="space-y-3 card p-4"
		>
			<h2 class="text-lg font-bold">{t('setup.delivery.title')}</h2>
			<label class="flex min-h-11 items-center gap-3"
				><input
					type="checkbox"
					class="size-5"
					name="pickupEnabled"
					checked={data.settings.pickupEnabled}
				/>
				{t('setup.delivery.pickup')}</label
			>
			<label class="flex min-h-11 items-center gap-3"
				><input
					type="checkbox"
					class="size-5"
					name="deliveryEnabled"
					checked={data.settings.deliveryEnabled}
				/>
				{t('setup.delivery.own')}</label
			>
			<p class="text-sm {data.counts.zones ? 'text-muted' : 'text-warn'}">
				{data.counts.zones
					? t('setup.delivery.zones', { count: data.counts.zones })
					: t('setup.delivery.noZones')}
				<a class="underline" href="/staff/settings/delivery">{t('setup.delivery.manage')}</a>
			</p>
			<button class="btn-primary w-full">{t('setup.next')}</button>
		</form>
	{:else if data.step === 'equipe'}
		<section class="space-y-3 card p-4">
			<h2 class="text-lg font-bold">{t('setup.team.title')}</h2>
			<p class="text-sm">{t('setup.team.text', { count: data.counts.staff })}</p>
			<a class="btn-secondary w-full" href="/staff/settings/staff">{t('setup.team.manage')}</a>
			<a class="btn-primary w-full" href="?passo={nextStep}">{t('setup.team.continue')}</a>
		</section>
	{:else if data.step === 'pagamentos'}
		<form
			method="POST"
			action="?passo={data.step}&/payments"
			use:enhance={keep}
			class="space-y-4 card p-4"
		>
			<h2 class="text-lg font-bold">{t('setup.pay.title')}</h2>
			<p class="text-sm text-muted">{t('setup.pay.intro')}</p>
			<label class="flex min-h-11 items-start gap-3"
				><input type="checkbox" class="mt-1 size-5" name="pixEnabled" bind:checked={pixEnabled} />
				<span
					>{t('setup.pay.pix')}
					<span class="block text-sm text-muted">{t('setup.pay.pixHint')}</span></span
				></label
			>
			{#if pixEnabled}
				<div class="space-y-3 rounded-lg border border-line p-3">
					<TextField
						label={t('setup.pay.key')}
						name="pixKey"
						value={p.pix.key ?? ''}
						placeholder={t('setup.pay.keyPh')}
						required
					/>
					<div class="grid gap-3 sm:grid-cols-2">
						<TextField
							label={t('setup.pay.recipient')}
							name="pixMerchantName"
							value={p.pix.merchantName ?? p.displayName}
							maxlength={25}
							required
						/>
						<TextField
							label={t('setup.pay.recipientCity')}
							name="pixMerchantCity"
							value={p.pix.merchantCity ?? p.city ?? ''}
							maxlength={15}
							required
						/>
					</div>
					<p class="text-xs text-muted">{t('setup.pay.test')}</p>
				</div>
			{:else}
				<input type="hidden" name="pixKey" value={p.pix.key ?? ''} />
				<input type="hidden" name="pixMerchantName" value={p.pix.merchantName ?? ''} />
				<input type="hidden" name="pixMerchantCity" value={p.pix.merchantCity ?? ''} />
			{/if}
			<p class="text-sm text-muted">
				{t('setup.pay.psp')}
				{data.onlineProvider
					? t('setup.pay.providerOn', { provider: data.onlineProvider })
					: t('setup.pay.providerOff')}
			</p>
			<button class="btn-primary w-full">{t('setup.next')}</button>
		</form>
	{:else if data.step === 'ifood'}
		<section class="space-y-4 card p-4">
			<div class="flex items-center justify-between gap-2">
				<h2 class="text-lg font-bold">{t('setup.ifood.title')}</h2>
				<span
					class="rounded-full px-3 py-1 text-xs font-semibold {ifood.enabled
						? 'bg-ok/15 text-ok'
						: 'bg-line text-muted'}"
					>{ifood.enabled ? t('setup.ifood.on') : t('setup.ifood.off')}</span
				>
			</div>
			<p class="text-sm">{t('setup.ifood.intro')}</p>
			<p class="alert-warn text-sm">{t('setup.ifood.warn')}</p>

			<ol class="list-decimal space-y-2 pl-5 text-sm">
				<li>{t('setup.ifood.step1')}</li>
				<li>{t('setup.ifood.step2')}</li>
				<li>{t('setup.ifood.step3')}</li>
				<li>{t('setup.ifood.step4')}</li>
			</ol>

			{#if ifood.source === 'env'}
				<p class="text-sm text-muted">{t('setup.ifood.envNote')}</p>
			{/if}
			{#if !data.canStoreSecrets}
				<p class="alert-error text-sm">{t('setup.ifood.noSecret')}</p>
			{/if}
			{#if ifood.problem}<p class="alert-error text-sm">{ifood.problem}</p>{/if}

			<form
				method="POST"
				action="?passo={data.step}&/ifoodSave"
				use:enhance={keep}
				class="space-y-3"
			>
				<TextField
					label={t('setup.ifood.clientId')}
					name="clientId"
					value={ifood.clientId ?? ''}
					autocomplete="off"
					required
					class="font-mono"
				/>
				<TextField
					label={t('setup.ifood.clientSecret')}
					name="clientSecret"
					type="password"
					autocomplete="new-password"
					placeholder={ifood.hasSecret ? t('setup.ifood.secretSaved') : ''}
					required={!ifood.hasSecret}
					class="font-mono"
				/>
				<TextField
					label={t('setup.ifood.merchantId')}
					name="merchantId"
					value={ifood.merchantId ?? ''}
					autocomplete="off"
					required
					class="font-mono"
				/>
				<div class="flex flex-wrap gap-2">
					<button class="btn-primary" disabled={!data.canStoreSecrets}
						>{t('setup.ifood.save')}</button
					>
				</div>
			</form>
			{#if ifood.clientId}
				<form method="POST" action="?passo={data.step}&/ifoodTest" use:enhance>
					<button class="btn-secondary">{t('setup.ifood.retest')}</button>
				</form>
			{/if}

			{#if problem}
				<div class="space-y-1 alert-error" role="alert">
					<p class="font-semibold">{problem.title}</p>
					<p>{problem.action}</p>
					<details class="text-xs">
						<summary>{t('setup.ifood.technical')}</summary>
						<code class="break-all">{problem.detail}</code>
					</details>
				</div>
			{:else if ifood.lastCheckAt}
				<p class="text-sm {ifood.lastCheckOk ? 'text-ok' : 'text-bad'}">
					{t('setup.ifood.lastTest', {
						when: formatDateTime(ifood.lastCheckAt),
						result: ifood.lastCheckOk ? t('setup.ifood.ok') : (ifood.lastCheckError ?? '')
					})}
				</p>
			{/if}

			{#if ifood.enabled}
				<form method="POST" action="?passo={data.step}&/ifoodEnable" use:enhance>
					<input type="hidden" name="enabled" value="0" />
					<button class="btn-danger">{t('setup.ifood.disable')}</button>
				</form>
			{:else if ifood.lastCheckOk && ifood.source === 'app'}
				<form
					method="POST"
					action="?passo={data.step}&/ifoodEnable"
					use:enhance
					class="space-y-2 border-t border-line pt-3"
				>
					<input type="hidden" name="enabled" value="1" />
					<label class="flex items-start gap-3 text-sm"
						><input type="checkbox" class="mt-1 size-5" name="understood" required />
						{t('setup.ifood.ack')}</label
					>
					<button class="btn-primary">{t('setup.ifood.enable')}</button>
				</form>
			{/if}
			<p class="text-xs text-muted">
				{t('setup.ifood.webhook', { url: data.webhookUrl })}
			</p>
			<a class="btn-ghost w-full" href="?passo={nextStep}"
				>{ifood.enabled ? t('setup.ifood.continue') : t('setup.ifood.skip')}</a
			>
		</section>
	{:else if data.step === 'concluir'}
		<form method="POST" action="?passo={data.step}&/finish" class="space-y-3 card p-4">
			<h2 class="text-lg font-bold">{t('setup.done.title')}</h2>
			<ul class="space-y-1 text-sm">
				<li>
					{data.counts.products ? '✓' : '•'}
					{t('setup.done.menu', { count: data.counts.products })}
				</li>
				<li>
					{data.settings.pickupEnabled || data.counts.zones ? '✓' : '•'}
					{t('setup.done.pickup')}{data.settings.deliveryEnabled
						? t('setup.done.delivery', { count: data.counts.zones })
						: ''}
				</li>
				<li>
					{data.counts.staff > 1 ? '✓' : '•'}
					{t('setup.done.team', { count: data.counts.staff })}
				</li>
				<li>
					{p.pix.enabled ? '✓' : '•'}
					{t('setup.done.pay')}
					{p.pix.enabled ? t('setup.done.payOn') : t('setup.done.payOff')}
				</li>
				<li>
					{ifood.enabled ? `✓ ${t('setup.done.ifoodOn')}` : `• ${t('setup.done.ifoodOff')}`}
				</li>
			</ul>
			{#if data.counts.products === 0}
				<p class="alert-warn text-sm">{t('setup.done.noProducts')}</p>
			{/if}
			<label class="flex min-h-11 items-center gap-3"
				><input
					type="checkbox"
					class="size-5"
					name="open"
					checked={!data.settings.acceptingOrders && data.counts.products > 0}
				/>
				{t('setup.done.open')}</label
			>
			<button class="btn-primary w-full">{t('setup.done.submit')}</button>
			<p class="text-xs text-muted">{t('setup.done.hint')}</p>
		</form>
	{/if}

	<div class="flex justify-between">
		{#if prevStep}<a class="btn-ghost" href="?passo={prevStep}"
				>{t('setup.prev', { step: labels[prevStep] })}</a
			>{:else}<span></span>{/if}
		{#if nextStep && data.step !== 'concluir'}<a class="btn-ghost" href="?passo={nextStep}"
				>{t('setup.nextLink', { step: labels[nextStep] })}</a
			>{/if}
	</div>
</main>
