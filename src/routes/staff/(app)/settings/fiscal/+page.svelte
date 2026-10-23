<script lang="ts">
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';

	let { data, form } = $props();
	const s = $derived(data.settings);
	let enabled = $derived(data.settings.enabled);
	const t = useTexts();
</script>

<svelte:head><title>{t('fiscal.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('fiscal.title')}</h1>
	<p class="alert-warn">
		{t('fiscal.warning')}
	</p>
	{#if !data.canStoreSecrets}
		<p class="alert-error">
			{t('fiscal.noSecret')}
		</p>
	{/if}

	<SettingsSection
		title={t('fiscal.section')}
		hint={t('fiscal.sectionHint')}
		action="?/save"
		saveLabel={t('settings.save')}
		saved={form?.ok ? t('fiscal.saved') : undefined}
	>
		<Checkbox label={t('fiscal.enabled')} name="enabled" bind:checked={enabled} />
		<SelectField label={t('fiscal.environment')} name="environment" value={s.environment}>
			<option value="homologacao">{t('fiscal.homologacao')}</option>
			<option value="producao">{t('fiscal.producao')}</option>
		</SelectField>
		<div class="grid gap-3 sm:grid-cols-2">
			<TextField
				label={t('fiscal.cnpj')}
				name="cnpj"
				value={s.cnpj ?? ''}
				inputmode="numeric"
				placeholder="00.000.000/0001-00"
			/>
			<TextField
				label={t('fiscal.token')}
				name="token"
				type="password"
				autocomplete="off"
				placeholder={s.hasToken ? t('fiscal.tokenSaved') : t('fiscal.tokenPaste')}
			/>
		</div>
		<div class="grid gap-3 sm:grid-cols-3">
			<TextField
				label={t('fiscal.ncm')}
				name="defaultNcm"
				value={s.defaultNcm ?? ''}
				inputmode="numeric"
				placeholder={t('fiscal.ncmPlaceholder')}
			/>
			<TextField label={t('fiscal.cfop')} name="defaultCfop" value={s.defaultCfop} />
			<TextField label={t('fiscal.csosn')} name="defaultCsosn" value={s.defaultCsosn} />
		</div>
		<p class="text-xs text-muted">
			{t('fiscal.ncmHint')}
		</p>
	</SettingsSection>
	<FormError message={form?.error} />
</div>
