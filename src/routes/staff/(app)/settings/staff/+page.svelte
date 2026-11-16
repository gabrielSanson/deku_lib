<script lang="ts">
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const roleLabel: Record<string, string> = {
		admin: t('team.role.admin'),
		attendant: t('team.role.attendant'),
		kitchen: t('team.role.kitchen')
	};
	const assignable = ['admin', 'attendant', 'kitchen'];
</script>

<svelte:head><title>{t('team.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('team.title')}</h1>
	<FormError message={form?.error} />
	{#if form?.added}<p class="alert-ok">{t('team.added', { name: form.added })}</p>{/if}

	<div class="divide-y divide-line card">
		{#each data.people as p (p.id)}
			<div class="flex flex-wrap items-center gap-3 p-3 {p.active ? '' : 'opacity-60'}">
				<div class="flex-1">
					<p class="font-semibold">{p.displayName} {p.id === data.staff.id ? t('team.you') : ''}</p>
					<p class="text-sm text-muted">{p.email}</p>
				</div>
				<form method="POST" action="?/assign" use:enhance class="flex items-center gap-2">
					<input type="hidden" name="id" value={p.id} />
					<SelectField
						label={t('team.roleOf', { name: p.displayName })}
						hideLabel
						id="role-{p.id}"
						class="w-40"
						name="roleId"
						value={p.roleId ?? ''}
						disabled={p.id === data.staff.id}
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					>
						{#each data.roles as r (r.id)}
							<option value={r.id}>{r.name}</option>
						{/each}
					</SelectField>
				</form>
				<form method="POST" action="?/pin" use:enhance class="flex items-center gap-1">
					<input type="hidden" name="id" value={p.id} />
					<TextField
						label={t('team.pinOf', { name: p.displayName })}
						hideLabel
						id="pin-{p.id}"
						name="pin"
						inputmode="numeric"
						autocomplete="off"
						maxlength={6}
						class="w-24"
						placeholder={p.hasPin ? '••••' : t('team.pin')}
					/>
					<button class="btn-ghost min-h-9 text-sm">{t('team.pinSave')}</button>
				</form>
				{#if p.id !== data.staff.id && assignable.includes(p.role)}
					<form method="POST" action="?/update" use:enhance>
						<input type="hidden" name="id" value={p.id} />
						<input type="hidden" name="active" value={p.active ? '0' : '1'} />
						<button class="btn-secondary min-h-9 text-sm {p.active ? 'text-bad' : ''}"
							>{p.active ? t('team.deactivate') : t('team.reactivate')}</button
						>
					</form>
				{/if}
			</div>
		{/each}
	</div>
	<p class="text-sm text-muted">
		{t('team.deactivateHint')}
	</p>
	<p class="text-sm text-muted">{t('team.pinHint')}</p>
	{#if form && 'pinSaved' in form}<p class="alert-ok" role="status">{t('team.pinSaved')}</p>{/if}

	<GuardedForm action="?/add" class="grid gap-3 card p-4 sm:grid-cols-2" reset>
		<h2 class="font-semibold sm:col-span-2">{t('team.add')}</h2>
		<TextField label={t('team.name')} id="dn" name="displayName" required />
		<TextField label={t('team.email')} id="em" name="email" type="email" required />
		<SelectField label={t('team.role')} id="ro" name="role">
			{#each assignable as r (r)}<option value={r}>{roleLabel[r]}</option>{/each}
		</SelectField>
		{#if data.canCreate}
			<TextField
				label={t('team.password')}
				id="pw"
				name="password"
				type="password"
				minlength={10}
				autocomplete="new-password"
			/>
		{/if}
		<p class="text-sm text-muted sm:col-span-2">
			{data.canCreate ? t('team.linkHint') : t('team.createHint')}
		</p>
		<button class="btn-primary sm:col-span-2">{t('team.submit')}</button>
	</GuardedForm>
</div>
