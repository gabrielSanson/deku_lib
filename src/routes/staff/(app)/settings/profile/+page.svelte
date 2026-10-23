<script lang="ts">
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
		<div>
			<label class="label" for="displayName">{t('profile.name')}</label>
			<input
				class="field"
				id="displayName"
				name="displayName"
				value={p.displayName}
				required
				maxlength="80"
			/>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="phone">{t('profile.phone')}</label>
				<input
					class="field"
					id="phone"
					name="phone"
					value={p.phone ?? ''}
					inputmode="tel"
					placeholder={t('profile.phonePlaceholder')}
				/>
			</div>
			<div>
				<label class="label" for="city">{t('profile.city')}</label>
				<input
					class="field"
					id="city"
					name="city"
					value={p.city ?? ''}
					placeholder={t('profile.cityPlaceholder')}
				/>
			</div>
		</div>
		<div>
			<label class="label" for="addressLine">{t('profile.address')}</label>
			<input
				class="field"
				id="addressLine"
				name="addressLine"
				value={p.addressLine ?? ''}
				placeholder={t('profile.addressPlaceholder')}
			/>
		</div>
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
			<label class="flex min-h-11 items-start gap-3"
				><input type="checkbox" class="mt-1 size-5" name="pixEnabled" bind:checked={pixEnabled} />
				<span
					>{t('profile.pix')}
					<span class="block text-sm text-muted">{t('profile.pixHint')}</span></span
				></label
			>
			{#if pixEnabled}
				<div class="space-y-3 rounded-lg border border-line p-3">
					<div>
						<label class="label" for="pixKey">{t('profile.pixKey')}</label>
						<input
							class="field"
							id="pixKey"
							name="pixKey"
							value={p.pix.key ?? ''}
							placeholder={t('profile.pixKeyPlaceholder')}
							required
						/>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<label class="label" for="pixMerchantName">{t('profile.pixName')}</label>
							<input
								class="field"
								id="pixMerchantName"
								name="pixMerchantName"
								value={p.pix.merchantName ?? p.displayName}
								maxlength="25"
								required
							/>
						</div>
						<div>
							<label class="label" for="pixMerchantCity">{t('profile.pixCity')}</label>
							<input
								class="field"
								id="pixMerchantCity"
								name="pixMerchantCity"
								value={p.pix.merchantCity ?? p.city ?? ''}
								maxlength="15"
								required
							/>
						</div>
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
