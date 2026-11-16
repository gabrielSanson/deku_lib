<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextArea from '#lib/components/molecules/TextArea.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	let stars = $state(0);
	const rated = $derived(form && 'rated' in form ? (form.rated as number) : data.stars);
</script>

<svelte:head><title>{t('rating.title')}</title></svelte:head>

<div class="mx-auto max-w-md space-y-4 py-6">
	<h1 class="page-title">{t('rating.title')}</h1>
	{#if rated}
		<p class="alert-ok" role="status">{t('rating.thanks', { n: rated })}</p>
	{:else if !data.rateable}
		<p class="card p-5 text-muted">{t('rating.invalid')}</p>
	{:else}
		<p class="text-sm text-muted">{t('rating.intro', { numero: data.orderNumber })}</p>
		<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
		<form method="POST" use:enhance class="space-y-4 card p-5">
			<fieldset>
				<legend class="mb-2 text-sm font-medium">{t('rating.stars')}</legend>
				<div class="flex gap-1">
					{#each [1, 2, 3, 4, 5] as n (n)}
						<label class="cursor-pointer">
							<input
								class="sr-only"
								type="radio"
								name="stars"
								value={n}
								required
								bind:group={stars}
							/>
							<span
								class="block text-4xl leading-none {n <= stars
									? 'text-brand-500'
									: 'text-stone-300'}"
								aria-label={t('rating.star', { n })}>★</span
							>
						</label>
					{/each}
				</div>
			</fieldset>
			<TextArea label={t('rating.comment')} name="comment" rows={3} maxlength={1000} />
			<button class="btn-primary w-full" disabled={!stars}>{t('rating.send')}</button>
		</form>
	{/if}
</div>
