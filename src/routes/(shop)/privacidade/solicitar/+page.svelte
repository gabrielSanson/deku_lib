<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { form } = $props();
	const t = useTexts();
	const requestId = $derived(form && 'requestId' in form ? (form.requestId as string) : null);
</script>

<svelte:head><title>{t('privacy.title')}</title></svelte:head>

<div class="mx-auto max-w-md space-y-4 py-6">
	<h1 class="page-title">{t('privacy.title')}</h1>
	<p class="text-sm text-muted">{t('privacy.intro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'confirmed' in form}
		<p class="alert-ok" role="status">{t('privacy.requested', { days: 30 })}</p>
	{:else if requestId}
		<p class="alert-ok" role="status">{t('privacy.codeSent')}</p>
		<form method="POST" action="?/confirm" use:enhance class="space-y-3 card p-5">
			<input type="hidden" name="requestId" value={requestId} />
			<TextField
				label={t('privacy.code')}
				name="code"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength={6}
				required
			/>
			<button class="btn-primary">{t('privacy.confirm')}</button>
		</form>
	{:else}
		<form method="POST" action="?/start" use:enhance class="space-y-3 card p-5">
			<TextField
				label={t('privacy.email')}
				name="email"
				type="email"
				autocomplete="email"
				required
			/>
			<SelectField
				label={t('privacy.kind')}
				name="kind"
				options={[
					{ value: 'access', label: t('privacy.access') },
					{ value: 'delete', label: t('privacy.delete') }
				]}
			/>
			<button class="btn-primary">{t('privacy.sendCode')}</button>
		</form>
	{/if}
</div>
