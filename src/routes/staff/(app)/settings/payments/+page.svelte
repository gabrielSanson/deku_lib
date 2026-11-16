<script lang="ts">
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';

	let { data, form } = $props();
	const t = useTexts();
	const p = $derived(data.profile);
	let pixEnabled = $derived(data.profile.pix.enabled);
	let provider = $derived<string>(data.paymentProvider);
	const providerOptions = $derived([
		{ value: 'none', label: t('payments.providerNone') },
		{ value: 'mercadopago', label: 'Mercado Pago' },
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
					<Checkbox
						label={t('payments.methodCard')}
						name="methods"
						value="online_card"
						checked={data.methods.includes('online_card')}
					/>
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
	<FormError message={form?.error} />
</div>
