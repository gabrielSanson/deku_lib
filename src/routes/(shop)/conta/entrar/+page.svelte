<script lang="ts">
	import TextField from '#lib/components/molecules/TextField.svelte';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import PasswordField from '#lib/components/molecules/PasswordField.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const mode = $derived(form?.mode ?? data.mode);

	function modeHref(m: 'entrar' | 'criar') {
		return `?modo=${m}${data.next !== '/conta' ? `&next=${encodeURIComponent(data.next)}` : ''}`;
	}
</script>

<svelte:head><title>{t('account.tabTitle')}</title></svelte:head>

<!-- The shop column is max-w-3xl; on desktop this page breaks out to the mockup's split width. -->
<section
	class="grid gap-8 py-4 lg:relative lg:left-1/2 lg:w-[min(72rem,calc(100vw-3rem))] lg:-translate-x-1/2 lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:py-10"
>
	<div
		class="relative isolate hidden min-h-[40rem] flex-col justify-between overflow-hidden rounded-(--radius-card) bg-night p-10 text-white lg:flex"
	>
		<img
			src="/hero/banner-1920.webp"
			srcset="/hero/banner-960.webp 960w, /hero/banner-1920.webp 1920w"
			sizes="50vw"
			alt=""
			class="absolute inset-0 -z-10 size-full object-cover object-[28%_center]"
		/>
		<div
			class="absolute inset-0 -z-10 bg-linear-to-b from-night/85 via-night/10 to-night/90"
			aria-hidden="true"
		></div>
		<img src={data.branding.images.wordmark} alt="" class="h-16 w-auto self-start" />
		<div>
			<p
				class="text-xs font-semibold tracking-[0.4em] whitespace-pre-line text-stone-200 uppercase"
			>
				{t('account.tagline')}
			</p>
			<span class="mt-4 block h-1 w-12 rounded-full bg-brand-500" aria-hidden="true"></span>
		</div>
	</div>

	<div class="mx-auto flex w-full max-w-lg flex-col justify-center">
		<div class="lg:rounded-(--radius-card) lg:bg-surface lg:p-10 lg:shadow-(--shadow-card)">
			<h1 class="font-display text-4xl leading-tight font-black tracking-tight lg:text-5xl">
				{t('account.title')}
			</h1>
			<p class="mt-2 text-muted">{t('account.subtitle')}</p>

			<div
				class="mt-6 grid grid-cols-2 gap-1 rounded-(--radius-card) border border-line bg-surface p-1"
				role="tablist"
			>
				<a
					href={modeHref('entrar')}
					role="tab"
					aria-selected={mode === 'entrar'}
					data-sveltekit-replacestate
					data-sveltekit-reset="false"
					class="grid min-h-11 place-items-center rounded-(--radius-control) text-sm font-semibold {mode ===
					'entrar'
						? 'bg-brand-500 text-black'
						: 'text-ink hover:bg-quiet'}">{t('account.tabLogin')}</a
				>
				<a
					href={modeHref('criar')}
					role="tab"
					aria-selected={mode === 'criar'}
					data-sveltekit-replacestate
					data-sveltekit-reset="false"
					class="grid min-h-11 place-items-center rounded-(--radius-control) text-sm font-semibold {mode ===
					'criar'
						? 'bg-brand-500 text-black'
						: 'text-ink hover:bg-quiet'}">{t('account.tabSignup')}</a
				>
			</div>

			{#if form?.error}
				<p class="mt-4 alert-error" role="alert">{form.error}</p>
			{/if}

			{#if form?.confirm}
				<p class="mt-4 alert-ok" role="status">{t('account.confirmEmail')}</p>
			{:else}
				<form
					method="POST"
					action="?/{mode === 'criar' ? 'signup' : 'login'}"
					class="mt-6 space-y-4"
				>
					<input type="hidden" name="next" value={data.next} />
					{#if mode === 'criar'}
						<TextField
							label={t('account.name')}
							name="name"
							autocomplete="name"
							required
							minlength={2}
							maxlength={60}
							value={form?.name ?? ''}
						/>
						<TextField
							label={t('account.phone')}
							name="phone"
							type="tel"
							inputmode="tel"
							autocomplete="tel"
							maxlength={25}
							value={form?.phone ?? ''}
						/>
					{/if}
					<TextField
						label={t('account.email')}
						name="email"
						type="email"
						icon="mail"
						autocomplete="email"
						placeholder={t('account.emailPlaceholder')}
						required
						maxlength={120}
						value={form?.email ?? ''}
					/>
					<PasswordField
						label={t('account.password')}
						showLabel={t('account.showPassword')}
						hideLabel={t('account.hidePassword')}
						autocomplete={mode === 'criar' ? 'new-password' : 'current-password'}
						placeholder={t('account.passwordPlaceholder')}
						required
						minlength={mode === 'criar' ? 8 : undefined}
						maxlength={72}
					>
						{#if mode === 'criar'}<p class="mt-1 text-xs text-muted">
								{t('account.passwordHint')}
							</p>{:else}<a
								href="/conta/recuperar"
								class="mt-2 block text-right text-sm font-medium underline"
								>{t('account.recover.forgot')}</a
							>{/if}
					</PasswordField>
					<button class="relative btn-primary w-full" disabled={!data.configured}>
						{t(mode === 'criar' ? 'account.submitSignup' : 'account.submitLogin')}
						<Icon name="arrow" class="absolute right-4 size-5" />
					</button>
				</form>
			{/if}

			{#if data.google}
				<div class="my-6 flex items-center gap-3 text-sm text-muted">
					<span class="h-px flex-1 bg-line"></span>{t('account.or')}<span
						class="h-px flex-1 bg-line"
					></span>
				</div>
				<form method="POST" action="?/google">
					<input type="hidden" name="next" value={data.next} />
					<button class="btn-secondary w-full gap-3">
						<svg viewBox="0 0 48 48" class="size-5" aria-hidden="true">
							<path
								fill="#FFC107"
								d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
							/>
							<path
								fill="#FF3D00"
								d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
							/>
							<path
								fill="#4CAF50"
								d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
							/>
							<path
								fill="#1976D2"
								d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
							/>
						</svg>
						{t('account.google')}
					</button>
				</form>
			{/if}

			<p class="mt-6 text-center text-sm text-muted">
				{#if mode === 'criar'}
					{t('account.haveAccount')}
					<a
						href={modeHref('entrar')}
						data-sveltekit-replacestate
						data-sveltekit-reset="false"
						class="font-semibold text-ink underline">{t('account.tabLogin')}</a
					>
				{:else}
					{t('account.noAccount')}
					<a
						href={modeHref('criar')}
						data-sveltekit-replacestate
						data-sveltekit-reset="false"
						class="font-semibold text-ink underline">{t('account.tabSignup')}</a
					>
				{/if}
			</p>
		</div>

		<p class="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
			<Icon name="lock" class="size-4" />{t('account.protected')}
		</p>
	</div>
</section>
