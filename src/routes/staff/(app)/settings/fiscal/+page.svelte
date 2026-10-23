<script lang="ts">
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
		<label class="flex items-start gap-3">
			<input type="checkbox" class="mt-1 size-5" name="enabled" bind:checked={enabled} />
			<span><strong>{t('fiscal.enabled')}</strong></span>
		</label>
		<div>
			<label class="label" for="environment">{t('fiscal.environment')}</label>
			<select class="field" id="environment" name="environment" value={s.environment}>
				<option value="homologacao">{t('fiscal.homologacao')}</option>
				<option value="producao">{t('fiscal.producao')}</option>
			</select>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="cnpj">{t('fiscal.cnpj')}</label>
				<input
					class="field"
					id="cnpj"
					name="cnpj"
					value={s.cnpj ?? ''}
					inputmode="numeric"
					placeholder="00.000.000/0001-00"
				/>
			</div>
			<div>
				<label class="label" for="token">{t('fiscal.token')}</label>
				<input
					class="field"
					id="token"
					name="token"
					type="password"
					autocomplete="off"
					placeholder={s.hasToken ? t('fiscal.tokenSaved') : t('fiscal.tokenPaste')}
				/>
			</div>
		</div>
		<div class="grid gap-3 sm:grid-cols-3">
			<div>
				<label class="label" for="defaultNcm">{t('fiscal.ncm')}</label>
				<input
					class="field"
					id="defaultNcm"
					name="defaultNcm"
					value={s.defaultNcm ?? ''}
					inputmode="numeric"
					placeholder={t('fiscal.ncmPlaceholder')}
				/>
			</div>
			<div>
				<label class="label" for="defaultCfop">{t('fiscal.cfop')}</label>
				<input class="field" id="defaultCfop" name="defaultCfop" value={s.defaultCfop} />
			</div>
			<div>
				<label class="label" for="defaultCsosn">{t('fiscal.csosn')}</label>
				<input class="field" id="defaultCsosn" name="defaultCsosn" value={s.defaultCsosn} />
			</div>
		</div>
		<p class="text-xs text-muted">
			{t('fiscal.ncmHint')}
		</p>
	</SettingsSection>
	<FormError message={form?.error} />
</div>
