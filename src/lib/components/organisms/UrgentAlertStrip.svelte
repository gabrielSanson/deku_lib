<script lang="ts">
	// The warnings staff must see before anything else on the dashboard.
	let {
		setupPending,
		isAdmin,
		ifoodAlerts,
		ifoodLate,
		unpaid,
		dead
	}: {
		setupPending: boolean;
		isAdmin: boolean;
		ifoodAlerts: string[];
		ifoodLate: number;
		unpaid: number;
		dead: number;
	} = $props();
</script>

{#if setupPending}
	<div class="flex flex-wrap items-center justify-between gap-3 alert-warn">
		<span><strong>Falta terminar a configuração da loja.</strong> Leva poucos minutos.</span>
		<a class="btn-primary min-h-9" href="/staff/setup">Continuar configuração</a>
	</div>
{/if}
{#each ifoodAlerts as alert, i (i)}
	<div class="flex flex-wrap items-center justify-between gap-3 alert-error" role="alert">
		<span><strong>iFood:</strong> {alert}</span>
		{#if isAdmin}
			<a class="btn-secondary min-h-9" href="/staff/settings/integrations">Ver detalhes</a>
		{/if}
	</div>
{/each}
{#if ifoodLate > 0}
	<p class="alert-error" role="alert">
		<strong>{ifoodLate} pedido(s) do iFood aguardando há mais de 5 min.</strong> Confirme antes de 8 min
		para o iFood não cancelar.
	</p>
{/if}
{#if unpaid > 0}
	<a href="/staff/reconciliation" class="block alert-warn">
		{unpaid} pedido(s) das últimas 24 h com pagamento pendente ou desconhecido.
	</a>
{/if}
{#if dead > 0}
	<p class="alert-error">
		{dead} evento(s) de integração com falha. Veja a página de integrações.
	</p>
{/if}
