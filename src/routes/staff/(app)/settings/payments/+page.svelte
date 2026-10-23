<script lang="ts">
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';

	let { data, form } = $props();
	const p = $derived(data.profile);
	let pixEnabled = $derived(data.profile.pix.enabled);
	const t = useTexts();
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
	<section class="space-y-2 card p-4">
		<h2 class="text-lg font-bold">{t('integrations.payments')}</h2>
		{#if data.paymentProvider === 'none'}
			<p class="text-sm">
				{t('integrations.noPsp')}
				{p.pix.enabled ? t('integrations.shopPix') : t('integrations.noPix')}
			</p>
		{:else if data.paymentProvider === 'mercadopago'}
			<p class="text-sm">{t('integrations.mercadopago')}</p>
			{#if !data.webhookSecretSet}
				<p class="alert-error" role="alert">{t('integrations.noWebhookSecret')}</p>
			{/if}
		{:else if data.paymentProvider === 'local_stub'}
			<p class="alert-warn">{t('integrations.stub')}</p>
		{/if}
	</section>
	<FormError message={form?.error} />
</div>
