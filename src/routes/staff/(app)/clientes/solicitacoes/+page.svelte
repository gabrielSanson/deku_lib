<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
</script>

<svelte:head><title>{t('privacy.staffTitle')} · {t('customers.tabTitle')}</title></svelte:head>

<main class="mx-auto max-w-4xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="page-title">{t('privacy.staffTitle')}</h1>
		<a class="btn-ghost" href="/staff/clientes">{t('customers.back')}</a>
	</div>
	<p class="text-sm text-muted">{t('privacy.staffIntro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if data.requests.length === 0}
		<p class="text-muted">{t('privacy.none')}</p>
	{/if}
	{#each data.requests as r (r.id)}
		<section class="space-y-2 card p-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="font-semibold">
					{t(`privacy.kind.${r.kind}` as TextKey)} · {r.name ?? r.email ?? '—'}
				</h2>
				<span class="text-sm {r.status === 'pending' ? 'text-warn' : 'text-muted'}"
					>{t(`privacy.status.${r.status}` as TextKey)}</span
				>
			</div>
			<p class="text-sm text-muted">
				{formatDateTime(r.requested_at)}
				{#if r.due_at && r.status === 'pending'}· {t('privacy.due', {
						date: formatDateTime(r.due_at)
					})}{/if}
				{#if r.note}· {r.note}{/if}
			</p>
			{#if !r.customer_id}<p class="text-sm">{t('privacy.noCustomer')}</p>{/if}
			{#if r.status === 'pending'}
				<div class="flex flex-wrap items-end gap-2">
					{#if r.kind === 'access' && r.customer_id}
						<a class="btn-secondary" href="/staff/clientes/solicitacoes/{r.id}/exportar" download
							>{t('privacy.export')}</a
						>
					{/if}
					<form method="POST" action="?/answer" use:enhance class="flex flex-wrap items-end gap-2">
						<input type="hidden" name="id" value={r.id} />
						<TextField label={t('privacy.note')} name="note" wrapClass="min-w-48" />
						<button
							class={r.kind === 'delete' ? 'btn-danger' : 'btn-primary'}
							name="outcome"
							value="done"
							>{r.kind === 'delete' && r.customer_id
								? t('privacy.doDelete')
								: t('privacy.markDone')}</button
						>
						<button class="btn-ghost" name="outcome" value="refused">{t('privacy.refuse')}</button>
					</form>
				</div>
			{/if}
		</section>
	{/each}
</main>
