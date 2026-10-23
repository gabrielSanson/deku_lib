<script lang="ts">
	import TextField from '#lib/components/molecules/TextField.svelte';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { form } = $props();
	const t = useTexts();
	const errors = {
		invalid: 'account.error.invalid',
		mismatch: 'account.recover.mismatch',
		failed: 'account.error.unavailable'
	} as const;
</script>

<svelte:head><title>Nova senha · Conta</title></svelte:head>

<section class="mx-auto max-w-md space-y-6 py-10">
	<h1 class="page-title">{t('account.recover.newTitle')}</h1>
	<form method="POST" class="space-y-4 card p-5">
		<TextField
			label={t('account.recover.newPassword')}
			name="password"
			type="password"
			autocomplete="new-password"
			required
			minlength={8}
			maxlength={72}
			hint={t('account.passwordHint')}
		/>
		<TextField
			label={t('account.recover.confirmPassword')}
			name="confirm"
			type="password"
			autocomplete="new-password"
			required
			minlength={8}
			maxlength={72}
		/>
		{#if form?.error}<p class="text-sm text-bad" role="alert">
				{t(errors[form.error as keyof typeof errors] ?? 'account.error.invalid')}
			</p>{/if}
		<button class="btn-primary w-full">
			{t('account.recover.save')}
			<Icon name="arrow" class="size-5" />
		</button>
	</form>
</section>
