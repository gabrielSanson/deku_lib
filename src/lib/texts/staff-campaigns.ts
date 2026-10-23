// Staff texts for the campaigns list and the campaign editor, including the
// sentence that explains the offer as a customer would read it.
import type { TextDef } from './catalog';

const g = 'staffCampaigns' as const;

export const STAFF_CAMPAIGN_TEXTS = {
	'campaigns.tabTitle': {
		group: g,
		label: 'Campanhas: título da aba',
		default: 'Campanhas · Equipe'
	},
	'campaigns.title': { group: g, label: 'Campanhas: título', default: 'Campanhas' },
	'campaigns.subtitle': {
		group: g,
		label: 'Campanhas: subtítulo',
		default: 'Crie e gerencie campanhas promocionais para atrair mais clientes.'
	},
	'campaigns.new': { group: g, label: 'Campanhas: nova', default: 'Nova campanha' },
	'campaigns.summary': { group: g, label: 'Campanhas: resumo', default: 'Resumo das campanhas' },
	'campaigns.status.draft': { group: g, label: 'Campanhas: rascunho', default: 'Rascunho' },
	'campaigns.status.active': { group: g, label: 'Campanhas: ativa', default: 'Ativa' },
	'campaigns.status.paused': { group: g, label: 'Campanhas: pausada', default: 'Pausada' },
	'campaigns.status.ended': { group: g, label: 'Campanhas: encerrada', default: 'Encerrada' },
	'campaigns.tab.all': { group: g, label: 'Campanhas: aba todas', default: 'Todas' },
	'campaigns.tab.active': { group: g, label: 'Campanhas: aba ativas', default: 'Ativas' },
	'campaigns.tab.drafts': { group: g, label: 'Campanhas: aba rascunhos', default: 'Rascunhos' },
	'campaigns.tab.ended': { group: g, label: 'Campanhas: aba encerradas', default: 'Encerradas' },
	'campaigns.lastYear': { group: g, label: 'Campanhas: no último ano', default: 'no último ano' },
	'campaigns.lastDays': {
		group: g,
		label: 'Campanhas: nos últimos dias',
		default: 'nos últimos {n} dias'
	},
	'campaigns.tile.active': { group: g, label: 'Campanhas: ativas (bloco)', default: 'Ativas' },
	'campaigns.tile.now': { group: g, label: 'Campanhas: agora', default: 'agora' },
	'campaigns.tile.uses': { group: g, label: 'Campanhas: usos', default: 'Usos' },
	'campaigns.tile.discount': {
		group: g,
		label: 'Campanhas: desconto concedido',
		default: 'Desconto concedido'
	},
	'campaigns.tile.newCustomers': {
		group: g,
		label: 'Campanhas: novos clientes',
		default: 'Novos clientes'
	},
	'campaigns.statusTabs': {
		group: g,
		label: 'Campanhas: status (abas)',
		default: 'Status das campanhas'
	},
	'campaigns.search': { group: g, label: 'Campanhas: buscar', default: 'Buscar campanha ou cupom' },
	'campaigns.period': { group: g, label: 'Campanhas: período', default: 'Período' },
	'campaigns.periodYear': { group: g, label: 'Campanhas: último ano', default: 'Último ano' },
	'campaigns.periodDays': {
		group: g,
		label: 'Campanhas: últimos dias',
		default: 'Últimos {n} dias'
	},
	'campaigns.col.campaign': { group: g, label: 'Campanhas: coluna campanha', default: 'Campanha' },
	'campaigns.col.benefit': { group: g, label: 'Campanhas: coluna benefício', default: 'Benefício' },
	'campaigns.col.apply': { group: g, label: 'Campanhas: coluna aplicação', default: 'Aplicação' },
	'campaigns.col.dates': { group: g, label: 'Campanhas: coluna vigência', default: 'Vigência' },
	'campaigns.col.uses': { group: g, label: 'Campanhas: coluna usos', default: 'Usos' },
	'campaigns.col.discount': { group: g, label: 'Campanhas: coluna desconto', default: 'Desconto' },
	'campaigns.col.revenue': { group: g, label: 'Campanhas: coluna receita', default: 'Receita' },
	'campaigns.col.return': { group: g, label: 'Campanhas: coluna retorno', default: 'Retorno' },
	'campaigns.col.new': { group: g, label: 'Campanhas: coluna novos', default: 'Novos' },
	'campaigns.col.status': { group: g, label: 'Campanhas: coluna status', default: 'Status' },
	'campaigns.col.actions': { group: g, label: 'Campanhas: coluna ações', default: 'Ações' },
	'campaigns.auto': { group: g, label: 'Campanhas: automática', default: 'Automática' },
	'campaigns.noCode': { group: g, label: 'Campanhas: sem código', default: 'Sem código' },
	'campaigns.noStart': { group: g, label: 'Campanhas: sem início', default: 'Sem início' },
	'campaigns.until': { group: g, label: 'Campanhas: até', default: 'até {time}' },
	'campaigns.more': { group: g, label: 'Campanhas: mais ações', default: 'Mais ações de {name}' },
	'campaigns.pause': { group: g, label: 'Campanhas: pausar', default: 'Pausar' },
	'campaigns.activate': { group: g, label: 'Campanhas: ativar', default: 'Ativar' },
	'campaigns.end': { group: g, label: 'Campanhas: encerrar', default: 'Encerrar' },
	'campaigns.none': {
		group: g,
		label: 'Campanhas: nenhuma',
		default: 'Nenhuma campanha ainda. Crie um cupom ou uma promoção automática.'
	},
	'campaigns.noneFilter': {
		group: g,
		label: 'Campanhas: nenhuma no filtro',
		default: 'Nenhuma campanha com este filtro.'
	},
	'campaigns.showing': {
		group: g,
		label: 'Campanhas: mostrando',
		default: 'Mostrando {shown} de {total} campanhas.'
	},
	'campaigns.endTitle': {
		group: g,
		label: 'Campanhas: encerrar (título)',
		default: 'Encerrar a campanha?'
	},
	'campaigns.endText': {
		group: g,
		label: 'Campanhas: encerrar (texto)',
		default: '{name} deixa de valer. Os pedidos já feitos não mudam.'
	},
	'campaigns.endThis': { group: g, label: 'Campanhas: a campanha', default: 'A campanha' },
	'campaigns.howTitle': {
		group: g,
		label: 'Campanhas: como funcionam',
		default: 'Como funcionam as campanhas'
	},
	'campaigns.howText': {
		group: g,
		label: 'Campanhas: como funcionam (texto)',
		default:
			'Cada pedido usa uma promoção só: a de maior desconto. Pedidos cancelados, recusados ou estornados não contam. "Retorno" é quanto os pedidos pagaram para cada R$ 1 de desconto; inclui quem compraria de qualquer jeito, então serve para comparar campanhas.'
	},
	'campaign.tabTitle': {
		group: g,
		label: 'Campanha: título da aba',
		default: '{name} · Campanhas'
	},
	'campaign.new': { group: g, label: 'Campanha: nova', default: 'Nova campanha' },
	'campaign.reviewRules': {
		group: g,
		label: 'Campanha: revisar regras',
		default: 'Revise as regras da promoção: falta escolher itens ou um valor.'
	},
	'campaign.back': { group: g, label: 'Campanha: voltar', default: 'Voltar' },
	'campaign.used': {
		group: g,
		label: 'Campanha: já usada',
		default:
			'Esta campanha já foi usada em {n} pedido(s). Mudanças valem só para os próximos pedidos.'
	},
	'campaign.name': {
		group: g,
		label: 'Campanha: nome',
		default: 'Nome (aparece no resumo do pedido)'
	},
	'campaign.tagline': {
		group: g,
		label: 'Campanha: frase curta',
		default: 'Frase curta (aparece na lista, opcional)'
	},
	'campaign.taglinePlaceholder': {
		group: g,
		label: 'Campanha: exemplo de frase',
		default: 'Ex.: Almoço com 10% de desconto'
	},
	'campaign.photo': { group: g, label: 'Campanha: foto', default: 'Foto da campanha (opcional)' },
	'campaign.removePhoto': { group: g, label: 'Campanha: tirar foto', default: 'Tirar foto' },
	'campaign.type': { group: g, label: 'Campanha: tipo', default: 'Tipo de promoção' },
	'campaign.type.code': {
		group: g,
		label: 'Campanha: desconto no pedido',
		default: 'Desconto no pedido'
	},
	'campaign.type.bxgy': { group: g, label: 'Campanha: leve X ganhe Y', default: 'Leve X, ganhe Y' },
	'campaign.benefit': {
		group: g,
		label: 'Campanha: o que o cliente ganha',
		default: 'O que o cliente ganha'
	},
	'campaign.discount': { group: g, label: 'Campanha: desconto', default: 'Desconto' },
	'campaign.percent': { group: g, label: 'Campanha: porcentagem', default: 'Porcentagem' },
	'campaign.fixed': { group: g, label: 'Campanha: valor fixo', default: 'Valor fixo (R$)' },
	'campaign.freeDelivery': { group: g, label: 'Campanha: frete grátis', default: 'Frete grátis' },
	'campaign.percentField': {
		group: g,
		label: 'Campanha: porcentagem (%)',
		default: 'Porcentagem (%)'
	},
	'campaign.maxDiscount': {
		group: g,
		label: 'Campanha: desconto máximo',
		default: 'Desconto máximo (R$, opcional)'
	},
	'campaign.amount': { group: g, label: 'Campanha: valor', default: 'Valor (R$)' },
	'campaign.percentHint': {
		group: g,
		label: 'Campanha: porcentagem (dica)',
		default: 'Porcentagem vale só sobre a comida, nunca sobre a taxa de entrega.'
	},
	'campaign.when': { group: g, label: 'Campanha: quando', default: 'Quando' },
	'campaign.trigger.quantity': {
		group: g,
		label: 'Campanha: levar quantidade',
		default: 'Levar uma quantidade de itens'
	},
	'campaign.trigger.minOrder': {
		group: g,
		label: 'Campanha: pedido acima do mínimo',
		default: 'Pedido acima do mínimo (brinde)'
	},
	'campaign.triggerQty': {
		group: g,
		label: 'Campanha: quantidade a levar',
		default: 'Quantidade a levar'
	},
	'campaign.triggerScope': {
		group: g,
		label: 'Campanha: de quais itens',
		default: 'De quais itens'
	},
	'campaign.scope.all': { group: g, label: 'Campanha: qualquer item', default: 'Qualquer item' },
	'campaign.scope.products': {
		group: g,
		label: 'Campanha: produtos escolhidos',
		default: 'Produtos escolhidos'
	},
	'campaign.scope.categories': {
		group: g,
		label: 'Campanha: categorias escolhidas',
		default: 'Categorias escolhidas'
	},
	'campaign.triggerItems': {
		group: g,
		label: 'Campanha: itens que contam',
		default: 'Itens que contam'
	},
	'campaign.minHint': {
		group: g,
		label: 'Campanha: mínimo em limites',
		default: 'Defina o valor mínimo em "Limites" abaixo.'
	},
	'campaign.rewardScope': {
		group: g,
		label: 'Campanha: item que ganha',
		default: 'Item que ganha'
	},
	'campaign.scope.same': {
		group: g,
		label: 'Campanha: um dos mesmos itens',
		default: 'Um dos mesmos itens'
	},
	'campaign.rewardQty': {
		group: g,
		label: 'Campanha: quantidade que ganha',
		default: 'Quantidade que ganha'
	},
	'campaign.rewardItems': {
		group: g,
		label: 'Campanha: itens de brinde',
		default: 'Itens de brinde'
	},
	'campaign.rewardPercent': {
		group: g,
		label: 'Campanha: desconto no item',
		default: 'Desconto no item (%)'
	},
	'campaign.target': {
		group: g,
		label: 'Campanha: qual item sai com desconto',
		default: 'Qual item sai com desconto'
	},
	'campaign.cheapest': { group: g, label: 'Campanha: o mais barato', default: 'O mais barato' },
	'campaign.mostExpensive': { group: g, label: 'Campanha: o mais caro', default: 'O mais caro' },
	'campaign.perOrder': {
		group: g,
		label: 'Campanha: vezes por pedido',
		default: 'Vezes por pedido'
	},
	'campaign.rewardHint': {
		group: g,
		label: 'Campanha: brinde (dica)',
		default:
			'O cliente coloca o item de brinde no carrinho; o desconto aparece no resumo. Adicionais pagos do item continuam cobrados.'
	},
	'campaign.howApply': { group: g, label: 'Campanha: como aplica', default: 'Como aplica' },
	'campaign.code': { group: g, label: 'Campanha: código do cupom', default: 'Código do cupom' },
	'campaign.codePlaceholder': {
		group: g,
		label: 'Campanha: exemplo de código',
		default: 'EX: SEXTA15'
	},
	'campaign.autoApply': {
		group: g,
		label: 'Campanha: aplicar sozinho',
		default: 'Aplicar sozinho, sem código'
	},
	'campaign.validity': { group: g, label: 'Campanha: quando vale', default: 'Quando vale' },
	'campaign.starts': { group: g, label: 'Campanha: começa', default: 'Começa (opcional)' },
	'campaign.ends': { group: g, label: 'Campanha: termina', default: 'Termina (opcional)' },
	'campaign.windows': {
		group: g,
		label: 'Campanha: dias e horários',
		default: 'Dias e horários (vazio = qualquer horário)'
	},
	'campaign.from': { group: g, label: 'Campanha: das', default: 'Das' },
	'campaign.to': { group: g, label: 'Campanha: às', default: 'às' },
	'campaign.toLabel': { group: g, label: 'Campanha: até', default: 'Até' },
	'campaign.removeWindow': { group: g, label: 'Campanha: remover horário', default: 'Remover' },
	'campaign.addWindow': {
		group: g,
		label: 'Campanha: adicionar horário',
		default: 'Adicionar horário'
	},
	'campaign.limits': { group: g, label: 'Campanha: limites', default: 'Limites' },
	'campaign.minOrder': {
		group: g,
		label: 'Campanha: pedido mínimo',
		default: 'Pedido mínimo (R$)'
	},
	'campaign.maxTotal': {
		group: g,
		label: 'Campanha: total de usos',
		default: 'Total de usos (vazio = sem limite)'
	},
	'campaign.maxCustomer': {
		group: g,
		label: 'Campanha: usos por cliente',
		default: 'Usos por cliente (vazio = sem limite)'
	},
	'campaign.firstOrder': {
		group: g,
		label: 'Campanha: só primeiro pedido',
		default: 'Só no primeiro pedido do cliente'
	},
	'campaign.perCustomerHint': {
		group: g,
		label: 'Campanha: limites por cliente (dica)',
		default:
			'Limites por cliente precisam saber quem é o cliente: no site vale pelo telefone; no caixa a promoção não se aplica a vendas sem cliente identificado.'
	},
	'campaign.previewTitle': {
		group: g,
		label: 'Campanha: como o cliente vai entender',
		default: 'Como o cliente vai entender'
	},
	'campaign.save': { group: g, label: 'Campanha: salvar', default: 'Salvar' },
	'campaign.saveDraft': {
		group: g,
		label: 'Campanha: salvar rascunho',
		default: 'Salvar rascunho'
	},
	'campaign.saveActivate': {
		group: g,
		label: 'Campanha: salvar e ativar',
		default: 'Salvar e ativar'
	},
	'campaign.p.free': { group: g, label: 'Prévia: grátis', default: 'grátis' },
	'campaign.p.off': {
		group: g,
		label: 'Prévia: com desconto',
		default: 'com {percent}% de desconto'
	},
	'campaign.p.percent': {
		group: g,
		label: 'Prévia: porcentagem',
		default: '{percent}% de desconto no pedido'
	},
	'campaign.p.upTo': { group: g, label: 'Prévia: até', default: '(até R$ {value})' },
	'campaign.p.fixed': {
		group: g,
		label: 'Prévia: valor fixo',
		default: 'R$ {value} de desconto no pedido'
	},
	'campaign.p.freeDelivery': {
		group: g,
		label: 'Prévia: frete grátis',
		default: 'Frete grátis na entrega'
	},
	'campaign.p.anyItem': { group: g, label: 'Prévia: qualquer item', default: 'qualquer item' },
	'campaign.p.more': { group: g, label: 'Prévia: mais', default: 'mais {n}' },
	'campaign.p.of': { group: g, label: 'Prévia: de', default: '{n} de {items}' },
	'campaign.p.buy': {
		group: g,
		label: 'Prévia: leve e ganhe',
		default: 'Leve {n} de {items} e ganhe {reward} {off}'
	},
	'campaign.p.gift': { group: g, label: 'Prévia: ganhe', default: 'Ganhe {n} de {items} {off}' },
	'campaign.p.min': {
		group: g,
		label: 'Prévia: pedido mínimo',
		default: 'em pedidos a partir de R$ {value}'
	},
	'campaign.p.auto': { group: g, label: 'Prévia: aplicado sozinho', default: 'aplicado sozinho' },
	'campaign.p.code': { group: g, label: 'Prévia: com o cupom', default: 'com o cupom {code}' }
} as const satisfies Record<string, TextDef>;
