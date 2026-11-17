<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
</script>

<svelte:head><title>{t('mfa.verifyTitle')}</title></svelte:head>

<form method="POST" use:enhance class="mx-auto max-w-sm space-y-3 card p-4">
	<h1 class="page-title">{t('mfa.verifyTitle')}</h1>
	<p class="text-sm text-muted">{t('mfa.verifyIntro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	<input type="hidden" name="next" value={data.next} />
	<TextField
		label={t('mfa.code')}
		name="code"
		inputmode="numeric"
		autocomplete="one-time-code"
		maxlength={8}
		required
	/>
	<button class="btn-primary w-full">{t('mfa.verify')}</button>
</form>
