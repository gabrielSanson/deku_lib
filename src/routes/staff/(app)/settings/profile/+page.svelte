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

<svelte:head><title>{t('profile.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('profile.title')}</h1>

	<SettingsSection
		title={t('profile.store')}
		hint={t('profile.storeHint')}
		action="?/store"
		saveLabel={t('profile.storeSave')}
		saved={form?.ok === 'store' ? t('profile.storeSaved') : undefined}
	>
		<TextField
			label={t('profile.name')}
			name="displayName"
			value={p.displayName}
			required
			maxlength={80}
		/>
		<div class="grid gap-3 sm:grid-cols-2">
			<TextField
				label={t('profile.phone')}
				name="phone"
				value={p.phone ?? ''}
				inputmode="tel"
				placeholder={t('profile.phonePlaceholder')}
			/>
			<TextField
				label={t('profile.city')}
				name="city"
				value={p.city ?? ''}
				placeholder={t('profile.cityPlaceholder')}
			/>
		</div>
		<TextField
			label={t('profile.address')}
			name="addressLine"
			value={p.addressLine ?? ''}
			placeholder={t('profile.addressPlaceholder')}
		/>
	</SettingsSection>

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
		<p class="text-sm text-muted">
			{t('profile.psp')}
			{data.onlineProvider
				? t('profile.pspActive', { name: data.onlineProvider })
				: t('profile.pspNone')}
		</p>
	</SettingsSection>
	<FormError message={form?.error} />
</div>
