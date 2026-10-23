<script lang="ts">
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';

	let { data, form } = $props();
	const p = $derived(data.profile);
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

	<FormError message={form?.error} />
</div>
