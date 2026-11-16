<script lang="ts">
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';

	let { data, form } = $props();
	const t = useTexts();
	const p = $derived(data.profile);
	let pixEnabled = $derived(data.profile.pix.enabled);
	let provider = $derived<string>(data.paymentProvider);
	const providerOptions = $derived([
		{ value: 'none', label: t('payments.providerNone') },
		{ value: 'mercadopago', label: 'Mercado Pago' },
		{ value: 'efi', label: t('payments.providerEfi') },
		...(data.allowStub ? [{ value: 'local_stub', label: t('payments.providerStub') }] : [])
	]);
</script>

<svelte:head><title>{t('payments.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('nav.pagamentos')}</h1>

	<SettingsSection
		title={t('profile.payments')}
		hint={t('profile.paymentsHint')}
		action="?/payments"
		saveLabel={t('profile.paymentsSave')}
		saved={form?.ok === 'payments' ? t('profile.paymentsSaved') : undefined}
		warning={form?.ok === 'payments' ? form.warning : undefined}
	>
		<fieldset class="space-y-4">
			<Checkbox
				label={t('profile.pix')}
				hint={t('profile.pixHint')}
				name="pixEnabled"
				bind:checked={pixEnabled}
			/>
			{#if pixEnabled}
				<div class="space-y-3 rounded-lg border border-line p-3">
					<TextField
						label={t('profile.pixKey')}
						name="pixKey"
						value={p.pix.key ?? ''}
						placeholder={t('profile.pixKeyPlaceholder')}
						required
					/>
					<div class="grid gap-3 sm:grid-cols-2">
						<TextField
							label={t('profile.pixName')}
							name="pixMerchantName"
							value={p.pix.merchantName ?? p.displayName}
							maxlength={25}
							required
						/>
						<TextField
							label={t('profile.pixCity')}
							name="pixMerchantCity"
							value={p.pix.merchantCity ?? p.city ?? ''}
							maxlength={15}
							required
						/>
					</div>
					<p class="text-xs text-muted">
						{t('profile.pixTest')}
					</p>
				</div>
			{:else}
				<input type="hidden" name="pixKey" value={p.pix.key ?? ''} />
				<input type="hidden" name="pixMerchantName" value={p.pix.merchantName ?? ''} />
				<input type="hidden" name="pixMerchantCity" value={p.pix.merchantCity ?? ''} />
			{/if}
		</fieldset>
	</SettingsSection>
	<SettingsSection
		title={t('payments.online')}
		hint={t('payments.onlineHint')}
		action="?/online"
		enctype="multipart/form-data"
		saveLabel={t('payments.onlineSave')}
		saved={form?.ok === 'online' ? t('payments.onlineSaved') : undefined}
	>
		<div class="space-y-4">
			{#if data.source === 'env'}
				<p class="alert-warn">{t('payments.fromEnv')}</p>
			{/if}
			<SelectField
				label={t('payments.provider')}
				name="provider"
				options={providerOptions}
				bind:value={provider}
			/>
			{#if provider !== 'none'}
				<fieldset class="space-y-2">
					<Checkbox
						label={t('payments.methodPix')}
						name="methods"
						value="pix"
						checked={data.methods.includes('pix')}
					/>
					{#if provider !== 'efi'}
						<Checkbox
							label={t('payments.methodCard')}
							name="methods"
							value="online_card"
							checked={data.methods.includes('online_card')}
						/>
					{/if}
				</fieldset>
			{/if}
			{#if provider === 'mercadopago'}
				{#if !data.canStoreSecrets}
					<p class="alert-error" role="alert">{t('err.settings.appSecret')}</p>
				{/if}
				<TextField
					label={t('payments.token')}
					hint={data.tokenSaved ? t('payments.keySaved') : t('payments.tokenHint')}
					name="accessToken"
					type="password"
					autocomplete="off"
					required={!data.tokenSaved}
				/>
				<TextField
					label={t('payments.secret')}
					hint={data.webhookSecretSet ? t('payments.keySaved') : undefined}
					name="webhookSecret"
					type="password"
					autocomplete="off"
				/>
				<div class="text-sm">
					<p>{t('payments.webhookUrl')}</p>
					<code class="mt-1 block rounded border border-line p-2 text-xs break-all"
						>{data.webhookUrl}</code
					>
				</div>
				{#if data.paymentProvider === 'mercadopago' && !data.webhookSecretSet}
					<p class="alert-error" role="alert">{t('integrations.noWebhookSecret')}</p>
				{/if}
			{:else if provider === 'efi'}
				{#if !data.canStoreSecrets}
					<p class="alert-error" role="alert">{t('err.settings.appSecret')}</p>
				{/if}
				<p class="text-sm text-muted">{t('payments.efiHint')}</p>
				<p class="alert-warn text-sm">{t('payments.efiUnverified')}</p>
				<div class="grid gap-3 sm:grid-cols-2">
					<TextField
						label={t('payments.efiClientId')}
						name="pspClientId"
						value={data.psp?.clientId ?? ''}
						autocomplete="off"
						required
					/>
					<TextField
						label={t('payments.efiClientSecret')}
						hint={data.psp?.hasSecret ? t('payments.keySaved') : undefined}
						name="pspClientSecret"
						type="password"
						autocomplete="off"
						required={!data.psp?.hasSecret}
					/>
					<TextField
						label={t('payments.efiPixKey')}
						name="pspPixKey"
						value={data.psp?.pixKey ?? ''}
						required
					/>
					<TextField
						label={t('payments.efiCertPass')}
						name="pspCertificatePassword"
						type="password"
						autocomplete="off"
					/>
				</div>
				<label class="block text-sm">
					<span class="font-semibold">{t('payments.efiCert')}</span>
					{#if data.psp?.hasCert}<span class="text-muted"> · {t('payments.keySaved')}</span>{/if}
					<input
						class="mt-1 block w-full text-sm"
						type="file"
						name="pspCertificate"
						accept=".p12,.pfx,application/x-pkcs12"
						required={!data.psp?.hasCert}
					/>
				</label>
				<Checkbox
					label={t('payments.efiSandbox')}
					name="pspSandbox"
					checked={data.psp?.sandbox ?? false}
				/>
				{#if data.paymentProvider === 'efi'}
					<button class="btn-ghost" formaction="?/pspWebhook" formnovalidate
						>{t('payments.efiWebhook')}</button
					>
					{#if data.psp?.webhookAt}
						<p class="text-sm text-ok">
							{t('payments.efiWebhookDone', { date: formatDateTime(data.psp.webhookAt) })}
						</p>
					{/if}
				{/if}
			{:else if provider === 'local_stub'}
				<p class="alert-warn">{t('integrations.stub')}</p>
			{:else if provider === 'none'}
				<p class="text-sm">
					{t('integrations.noPsp')}
					{p.pix.enabled ? t('integrations.shopPix') : t('integrations.noPix')}
				</p>
			{/if}
		</div>
	</SettingsSection>
	<SettingsSection
		title={t('fees.title')}
		hint={t('fees.hint')}
		action="?/fees"
		saveLabel={t('settings.save')}
		saved={form?.ok === 'fees' ? t('settings.saved') : undefined}
	>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="text-left text-muted">
					<tr>
						<th class="p-2">{t('fees.method')}</th>
						<th class="p-2">{t('fees.percent')}</th>
						<th class="p-2">{t('fees.fixed')}</th>
						<th class="p-2">{t('fees.days')}</th>
					</tr>
				</thead>
				<tbody>
					{#each data.terms as term (`${term.method}:${term.provider}`)}
						{@const k = `${term.method}:${term.provider}`}
						<tr class="border-t border-line">
							<td class="p-2"
								>{t(`fees.m.${term.method}` as TextKey)}{term.provider !== 'manual' &&
								term.provider !== 'ifood'
									? ` · ${term.provider === 'mercadopago' ? 'Mercado Pago' : 'Efí'}`
									: ''}</td
							>
							<td class="p-2"
								><input
									class="field w-20"
									name="bps:{k}"
									inputmode="decimal"
									aria-label="{t('fees.percent')} {k}"
									value={(term.feeBps / 100).toLocaleString('pt-BR')}
								/></td
							>
							<td class="p-2"
								><input
									class="field w-24"
									name="fixed:{k}"
									inputmode="decimal"
									aria-label="{t('fees.fixed')} {k}"
									value={(term.feeFixedCents / 100).toLocaleString('pt-BR', {
										minimumFractionDigits: 2
									})}
								/></td
							>
							<td class="p-2"
								><input
									class="field w-16"
									name="days:{k}"
									type="number"
									min="0"
									max="365"
									aria-label="{t('fees.days')} {k}"
									value={term.settleDays}
								/></td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</SettingsSection>
	<FormError message={form?.error} />
</div>
