<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { PERMISSIONS } from '#lib/domain/permissions.ts';
	import type { TextKey } from '#lib/texts/catalog.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const label = (p: string) => t(`perm.${p.replace('.', '_')}` as TextKey);
	const base: Record<string, TextKey> = {
		admin: 'team.role.admin',
		attendant: 'team.role.attendant',
		kitchen: 'team.role.kitchen'
	};
</script>

<svelte:head><title>{t('perm.title')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('perm.title')}</h1>
	<p class="text-sm text-muted">{t('perm.intro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'saved' in form}<p class="alert-ok" role="status">{t('perm.saved')}</p>{/if}

	{#each data.roles as r (r.id)}
		<form method="POST" action="?/save" use:enhance class="space-y-3 card p-4">
			<input type="hidden" name="roleId" value={r.id} />
			<header class="flex flex-wrap items-baseline gap-2">
				<h2 class="font-semibold">{r.name}</h2>
				<span class="text-sm text-muted"
					>{t('perm.base', { base: t(base[r.baseRole]) })} · {t('perm.members', {
						n: r.members
					})}</span
				>
			</header>
			<div class="grid gap-1 text-sm sm:grid-cols-2">
				{#each PERMISSIONS as p (p)}
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							name="permission"
							value={p}
							checked={r.permissions.includes(p)}
							disabled={r.systemKey === 'dono'}
						/>
						{label(p)}
					</label>
				{/each}
			</div>
			{#if r.systemKey !== 'dono'}
				<div class="flex gap-2">
					<button class="btn-secondary">{t('settings.save')}</button>
					{#if !r.systemKey}
						<button class="btn-ghost text-bad" formaction="?/delete">{t('perm.delete')}</button>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-muted">{t('perm.ownerFixed')}</p>
			{/if}
		</form>
	{/each}

	<form
		method="POST"
		action="?/create"
		use:enhance
		class="grid gap-3 card p-4 sm:grid-cols-3 sm:items-end"
	>
		<TextField label={t('perm.newName')} name="name" maxlength={40} required />
		<SelectField label={t('perm.newBase')} name="baseRole">
			<option value="attendant">{t('team.role.attendant')}</option>
			<option value="admin">{t('team.role.admin')}</option>
			<option value="kitchen">{t('team.role.kitchen')}</option>
		</SelectField>
		<button class="btn-primary">{t('perm.create')}</button>
	</form>
</div>
