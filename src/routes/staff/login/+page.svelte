<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import PasswordField from '#lib/components/molecules/PasswordField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	let busy = $state(false);
	// The uploaded logo and background from Aparência; the built-in brand art otherwise.
	const images = $derived(data.branding.images);
	const custom = $derived(data.branding.custom);
</script>

<svelte:head><title>{t('staffLogin.tabTitle')}</title></svelte:head>

<main class="relative isolate flex min-h-dvh flex-col items-center justify-center bg-night p-4">
	<!-- The staff sign-in background (Aparência), dimmed so the form stays readable. -->
	<img
		src={images.staffBackground}
		srcset={custom.staffBackground
			? undefined
			: '/hero/background-960.webp 960w, /hero/background-1920.webp 1920w'}
		sizes="100vw"
		alt=""
		class="absolute inset-0 -z-10 size-full object-cover"
	/>
	<div class="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/80"></div>
	{#if custom.logo || custom.wordmark}
		<div class="mb-6 flex flex-col items-center gap-3" role="img" aria-label={data.shopName}>
			<img src={images.logo} alt="" class="h-24 w-auto" />
			<img src={images.wordmark} alt="" class="h-10 w-auto" />
		</div>
	{:else}
		<img src="/brand/deku-logo.png" alt={data.shopName} class="mb-6 h-36 w-auto" />
	{/if}
	<form
		method="POST"
		class="w-full max-w-sm space-y-4 card p-6"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
	>
		<div>
			<h1 class="page-title">{t('staffLogin.title')}</h1>
			<p class="mt-1 text-sm text-muted">{t('staffLogin.subtitle')}</p>
		</div>
		{#if !data.configured}
			<p class="alert-warn">{t('staffLogin.notConfigured')}</p>
		{/if}
		<FormError message={form?.error} />
		<TextField
			label={t('staffLogin.email')}
			name="email"
			type="email"
			icon="mail"
			autocomplete="username"
			placeholder={t('staffLogin.emailPlaceholder')}
			required
			value={form?.email ?? ''}
		/>
		<PasswordField
			label={t('staffLogin.password')}
			showLabel={t('staffLogin.show')}
			hideLabel={t('staffLogin.hide')}
			autocomplete="current-password"
			placeholder={t('staffLogin.passwordPlaceholder')}
			required
		/>
		<button class="relative btn-primary w-full" disabled={busy}>
			{busy ? t('staffLogin.busy') : t('staffLogin.submit')}
			<Icon name="arrow" class="absolute right-4 size-5" />
		</button>
		<p class="flex items-center justify-center gap-2 text-xs text-muted">
			<Icon name="lock" class="size-4" />{t('staffLogin.restricted')}
		</p>
	</form>
	<a
		href="/"
		class="mt-6 text-sm font-medium text-stone-300 underline underline-offset-4 hover:text-white"
		>{t('staffLogin.back')}</a
	>
</main>
