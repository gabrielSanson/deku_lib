<script lang="ts">
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { suggestSlug } from '#lib/domain/signup.ts';

	const SLUG_PATTERN = '[a-z0-9][a-z0-9\\-]{1,39}';

	let { data, form } = $props();
	let shopName = $derived(form?.shopName ?? '');
	let slug = $derived(form?.slug ?? '');
	let slugEdited = $derived(Boolean(form?.slug));
	let availability = $state<'idle' | 'checking' | 'free' | 'taken' | 'invalid'>('idle');
	let busy = $state(false);

	$effect(() => {
		if (!slugEdited) slug = shopName ? suggestSlug(shopName) : '';
	});

	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const value = slug;
		clearTimeout(timer);
		if (!value) {
			availability = 'idle';
			return;
		}
		availability = 'checking';
		timer = setTimeout(async () => {
			try {
				const res = await fetch(`/criar-loja/disponivel?slug=${encodeURIComponent(value)}`);
				const body = (await res.json()) as { ok: boolean; problem: string | null };
				availability = body.ok ? 'free' : body.problem ? 'invalid' : 'taken';
			} catch {
				availability = 'idle';
			}
		}, 300);
	});

	const slugHint = $derived(
		{
			idle: `O endereço da sua loja: ${slug || 'sua-loja'}.${data.platformDomain}`,
			checking: 'Verificando…',
			free: `Disponível: ${slug}.${data.platformDomain}`,
			taken: 'Este endereço já está em uso. Tente outro.',
			invalid: 'Use de 2 a 40 letras minúsculas, números ou hífen.'
		}[availability]
	);
</script>

<svelte:head><title>Criar minha loja</title></svelte:head>

<section class="mx-auto max-w-lg space-y-4 py-8">
	<h1 class="text-2xl font-black">Criar minha loja</h1>
	<p class="text-sm text-muted">30 dias grátis, sem cartão. Você já sai com o site no ar.</p>
	<form method="post" class="space-y-4 card p-4" onsubmit={() => (busy = true)}>
		<TextField
			label="Seu nome"
			name="ownerName"
			value={form?.ownerName ?? ''}
			required
			autocomplete="name"
		/>
		<TextField
			label="E-mail"
			name="email"
			type="email"
			value={form?.email ?? ''}
			required
			autocomplete="email"
		/>
		<TextField
			label="Senha"
			name="password"
			type="password"
			hint="Pelo menos 10 caracteres."
			minlength={10}
			required
			autocomplete="new-password"
		/>
		<TextField label="Nome da loja" name="shopName" bind:value={shopName} maxlength={80} required />
		<TextField
			label="Endereço da loja"
			name="slug"
			bind:value={slug}
			oninput={() => (slugEdited = true)}
			hint={slugHint}
			pattern={SLUG_PATTERN}
			required
		/>
		<SelectField
			label="Tipo de loja"
			name="businessType"
			options={data.businessTypes}
			value={form?.businessType ?? 'lanchonete'}
		/>
		<TextField label="Cidade" name="city" value={form?.city ?? ''} autocomplete="address-level2" />
		<div class="hidden" aria-hidden="true">
			<label>Site <input name="website" tabindex="-1" autocomplete="off" /></label>
		</div>
		<div class="space-y-1">
			<Checkbox
				name="acceptTerms"
				label="Li e aceito os termos de uso, o aviso de privacidade e o acordo de tratamento de dados."
				required
			/>
			<p class="text-xs text-muted">
				<a class="underline" href="/termos" target="_blank">Termos</a> ·
				<a class="underline" href="/privacidade-plataforma" target="_blank">Privacidade</a> ·
				<a class="underline" href="/dpa" target="_blank">DPA</a>
			</p>
		</div>
		<FormError message={form?.error} />
		<button
			class="btn-primary w-full"
			disabled={busy || availability === 'taken' || availability === 'invalid'}
		>
			{busy ? 'Criando…' : 'Criar loja'}
		</button>
	</form>
</section>
