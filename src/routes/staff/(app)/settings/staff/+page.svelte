<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';

	let { data, form } = $props();
	const roleLabel: Record<string, string> = {
		admin: 'Admin',
		attendant: 'Atendente',
		kitchen: 'Cozinha'
	};
	const assignable = ['admin', 'attendant', 'kitchen'];
</script>

<svelte:head><title>Equipe · Configurações</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">Equipe</h1>
	<FormError message={form?.error} />
	{#if form?.added}<p class="alert-ok">{form.added} adicionado(a).</p>{/if}

	<div class="divide-y divide-line card">
		{#each data.people as p (p.id)}
			<div class="flex flex-wrap items-center gap-3 p-3 {p.active ? '' : 'opacity-60'}">
				<div class="flex-1">
					<p class="font-semibold">{p.displayName} {p.id === data.staff.id ? '(você)' : ''}</p>
					<p class="text-sm text-muted">{p.email}</p>
				</div>
				<form method="POST" action="?/update" use:enhance class="flex items-center gap-2">
					<input type="hidden" name="id" value={p.id} />
					<select
						class="field w-36"
						name="role"
						value={p.role}
						aria-label="Perfil de {p.displayName}"
						disabled={!assignable.includes(p.role)}
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					>
						{#each Object.entries(roleLabel) as [value, label] (value)}
							<option {value} disabled={!assignable.includes(value)}>{label}</option>
						{/each}
					</select>
				</form>
				{#if p.id !== data.staff.id && assignable.includes(p.role)}
					<form method="POST" action="?/update" use:enhance>
						<input type="hidden" name="id" value={p.id} />
						<input type="hidden" name="active" value={p.active ? '0' : '1'} />
						<button class="btn-secondary min-h-9 text-sm {p.active ? 'text-bad' : ''}"
							>{p.active ? 'Desativar' : 'Reativar'}</button
						>
					</form>
				{/if}
			</div>
		{/each}
	</div>
	<p class="text-sm text-muted">
		Desativar uma pessoa encerra o acesso imediatamente, em todos os aparelhos.
	</p>

	<form method="POST" action="?/add" use:enhance class="grid gap-3 card p-4 sm:grid-cols-2">
		<h2 class="font-semibold sm:col-span-2">Adicionar pessoa</h2>
		<div>
			<label class="label" for="dn">Nome</label><input
				class="field"
				id="dn"
				name="displayName"
				required
			/>
		</div>
		<div>
			<label class="label" for="em">E-mail</label><input
				class="field"
				id="em"
				name="email"
				type="email"
				required
			/>
		</div>
		<div>
			<label class="label" for="ro">Perfil</label>
			<select class="field" id="ro" name="role">
				{#each assignable as r (r)}<option value={r}>{roleLabel[r]}</option>{/each}
			</select>
		</div>
		{#if data.canCreate}
			<div>
				<label class="label" for="pw">Senha inicial (mín. 10)</label><input
					class="field"
					id="pw"
					name="password"
					type="password"
					minlength="10"
					autocomplete="new-password"
				/>
			</div>
		{/if}
		<p class="text-sm text-muted sm:col-span-2">
			{data.canCreate
				? 'Deixe a senha vazia para vincular uma conta que já existe no Supabase.'
				: 'Crie a conta em Supabase → Authentication e depois vincule pelo e-mail aqui.'}
		</p>
		<button class="btn-primary sm:col-span-2">Adicionar</button>
	</form>
</div>
