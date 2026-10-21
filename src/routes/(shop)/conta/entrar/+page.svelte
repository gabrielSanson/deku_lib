<script lang="ts">
	import Icon from '#lib/components/atoms/Icon.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const mode = $derived(form?.mode ?? data.mode);
</script>

<svelte:head><title>Entrar · Conta</title></svelte:head>

<section class="grid gap-6 py-4 lg:grid-cols-2 lg:gap-0 lg:py-10">
	<div
		class="hidden flex-col justify-between rounded-l-(--radius-card) bg-night p-10 text-white lg:flex"
	>
		<img src={data.branding.images.wordmark} alt="" class="h-10 w-auto self-start" />
		<div>
			<p class="font-display text-5xl leading-none font-black text-brand-500">
				{t('account.title')}
			</p>
			<p class="mt-4 max-w-sm text-stone-300">{t('account.subtitle')}</p>
		</div>
		<p class="text-sm text-stone-400">{t('account.protected')}</p>
	</div>

	<div
		class="mx-auto w-full max-w-md lg:rounded-r-(--radius-card) lg:bg-surface lg:p-10 lg:shadow-(--shadow-card)"
	>
		<h1 class="page-title lg:hidden">{t('account.title')}</h1>
		<p class="mt-2 text-muted lg:hidden">{t('account.subtitle')}</p>

		<div
			class="mt-6 grid grid-cols-2 gap-1 rounded-(--radius-card) border border-line bg-surface p-1"
			role="tablist"
		>
			<a
				href="?modo=entrar{data.next !== '/conta' ? `&next=${encodeURIComponent(data.next)}` : ''}"
				role="tab"
				aria-selected={mode === 'entrar'}
				data-sveltekit-replacestate
				data-sveltekit-noscroll
				class="grid min-h-11 place-items-center rounded-(--radius-control) text-sm font-semibold {mode ===
				'entrar'
					? 'bg-night text-white'
					: 'text-ink hover:bg-quiet'}">{t('account.tabLogin')}</a
			>
			<a
				href="?modo=criar{data.next !== '/conta' ? `&next=${encodeURIComponent(data.next)}` : ''}"
				role="tab"
				aria-selected={mode === 'criar'}
				data-sveltekit-replacestate
				data-sveltekit-noscroll
				class="grid min-h-11 place-items-center rounded-(--radius-control) text-sm font-semibold {mode ===
				'criar'
					? 'bg-night text-white'
					: 'text-ink hover:bg-quiet'}">{t('account.tabSignup')}</a
			>
		</div>

		{#if form?.error}
			<p class="mt-4 alert-error" role="alert">{form.error}</p>
		{/if}

		{#if form?.confirm}
			<p class="mt-4 alert-ok" role="status">{t('account.confirmEmail')}</p>
		{:else}
			<form method="POST" action="?/{mode === 'criar' ? 'signup' : 'login'}" class="mt-6 space-y-4">
				<input type="hidden" name="next" value={data.next} />
				{#if mode === 'criar'}
					<div>
						<label class="label" for="name">{t('account.name')}</label>
						<input
							id="name"
							name="name"
							class="field"
							autocomplete="name"
							required
							minlength="2"
							maxlength="60"
							value={form?.name ?? ''}
						/>
					</div>
					<div>
						<label class="label" for="phone">{t('account.phone')}</label>
						<input
							id="phone"
							name="phone"
							class="field"
							type="tel"
							inputmode="tel"
							autocomplete="tel"
							maxlength="25"
							value={form?.phone ?? ''}
						/>
					</div>
				{/if}
				<div>
					<label class="label" for="email">{t('account.email')}</label>
					<div class="relative">
						<Icon
							name="mail"
							class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-400"
						/>
						<input
							id="email"
							name="email"
							type="email"
							class="field pl-10"
							autocomplete="email"
							required
							maxlength="120"
							value={form?.email ?? ''}
						/>
					</div>
				</div>
				<div>
					<label class="label" for="password">{t('account.password')}</label>
					<input
						id="password"
						name="password"
						type="password"
						class="field"
						autocomplete={mode === 'criar' ? 'new-password' : 'current-password'}
						required
						minlength={mode === 'criar' ? 8 : undefined}
						maxlength="72"
					/>
					{#if mode === 'criar'}<p class="mt-1 text-xs text-muted">
							{t('account.passwordHint')}
						</p>{/if}
				</div>
				<button class="btn-primary w-full" disabled={!data.configured}>
					{t(mode === 'criar' ? 'account.submitSignup' : 'account.submitLogin')}
					<Icon name="arrow" class="size-5" />
				</button>
			</form>
		{/if}

		{#if data.google}
			<div class="my-6 flex items-center gap-3 text-sm text-muted">
				<span class="h-px flex-1 bg-line"></span>{t('account.or')}<span class="h-px flex-1 bg-line"
				></span>
			</div>
			<form method="POST" action="?/google">
				<input type="hidden" name="next" value={data.next} />
				<button class="btn-secondary w-full">{t('account.google')}</button>
			</form>
		{/if}

		<p class="mt-6 flex items-center justify-center gap-2 text-xs text-muted lg:hidden">
			<Icon name="lock" class="size-4" />{t('account.protected')}
		</p>
	</div>
</section>
