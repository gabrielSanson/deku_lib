<script lang="ts">
	import Icon from '#lib/components/atoms/Icon.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { form } = $props();
	const t = useTexts();
</script>

<svelte:head><title>Recuperar senha · Conta</title></svelte:head>

<section class="mx-auto max-w-md space-y-6 py-10">
	<h1 class="page-title">{t('account.recover.title')}</h1>
	{#if form?.sent}
		<p class="card p-5" role="status">{t('account.recover.sent')}</p>
	{:else}
		<p class="text-muted">{t('account.recover.text')}</p>
		<form method="POST" class="space-y-4 card p-5">
			<div>
				<label class="label" for="email">{t('account.email')}</label>
				<input
					id="email"
					name="email"
					type="email"
					class="field"
					autocomplete="email"
					required
					value={form?.email ?? ''}
				/>
			</div>
			{#if form?.error}<p class="text-sm text-bad" role="alert">
					{t('account.error.invalid')}
				</p>{/if}
			<button class="btn-primary w-full">
				{t('account.recover.submit')}
				<Icon name="arrow" class="size-5" />
			</button>
		</form>
	{/if}
	<a class="font-semibold underline" href="/conta/entrar">{t('account.recover.back')}</a>
</section>
