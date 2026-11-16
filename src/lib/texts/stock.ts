// Texts of the back office money screens: stock and fichas técnicas.
import type { TextDef } from './catalog';

const s = 'staffMoney' as const;

export const STOCK_TEXTS = {
	'nav.estoque': { group: 'staffLabels', label: 'Menu da equipe: estoque', default: 'Estoque' },
	'stock.title': { group: s, label: 'Estoque: título', default: 'Estoque' },
	'stock.tab.items': { group: s, label: 'Estoque: aba itens', default: 'Itens' },
	'stock.tab.purchases': { group: s, label: 'Estoque: aba compras', default: 'Compras' },
	'stock.tab.count': { group: s, label: 'Estoque: aba contagem', default: 'Contagem' },
	'stock.tab.waste': { group: s, label: 'Estoque: aba perdas', default: 'Perdas' },
	'stock.tab.recipes': { group: s, label: 'Estoque: aba fichas', default: 'Fichas técnicas' },
	'stock.intro': {
		group: s,
		label: 'Estoque: texto',
		default:
			'Cadastre os insumos em g, ml ou unidade. Cada venda paga baixa a ficha técnica; compras atualizam o custo médio.'
	},
	'stock.none': { group: s, label: 'Estoque: vazio', default: 'Nenhum item cadastrado.' },
	'stock.name': { group: s, label: 'Estoque: nome', default: 'Nome' },
	'stock.unit': { group: s, label: 'Estoque: unidade', default: 'Unidade' },
	'stock.unit.g': { group: s, label: 'Estoque: gramas', default: 'g' },
	'stock.unit.ml': { group: s, label: 'Estoque: ml', default: 'ml' },
	'stock.unit.un': { group: s, label: 'Estoque: unidade', default: 'un' },
	'stock.onHand': { group: s, label: 'Estoque: em estoque', default: 'Em estoque' },
	'stock.min': { group: s, label: 'Estoque: mínimo', default: 'Mínimo' },
	'stock.cost': { group: s, label: 'Estoque: custo médio', default: 'Custo médio' },
	'stock.costPer': { group: s, label: 'Estoque: custo por', default: '{value} por {qty} {unit}' },
	'stock.value': { group: s, label: 'Estoque: valor', default: 'Valor' },
	'stock.blocksSale': {
		group: s,
		label: 'Estoque: bloqueia venda',
		default: 'Quando acabar, marcar o ingrediente como esgotado'
	},
	'stock.ingredient': {
		group: s,
		label: 'Estoque: ingrediente',
		default: 'Ingrediente do cardápio'
	},
	'stock.noIngredient': { group: s, label: 'Estoque: sem ingrediente', default: '— nenhum —' },
	'stock.active': { group: s, label: 'Estoque: ativo', default: 'Ativo' },
	'stock.add': { group: s, label: 'Estoque: novo item', default: 'Novo item' },
	'stock.edit': { group: s, label: 'Estoque: editar', default: 'Editar' },
	'stock.save': { group: s, label: 'Estoque: salvar', default: 'Salvar' },
	'stock.saved': { group: s, label: 'Estoque: salvo', default: 'Salvo.' },
	'stock.low': { group: s, label: 'Estoque: abaixo do mínimo', default: 'Estoque baixo' },
	'stock.lowLine': {
		group: s,
		label: 'Estoque: linha de estoque baixo',
		default: '{name}: {qty} (mínimo {min})'
	},
	'stock.purchase.new': { group: s, label: 'Compras: nova', default: 'Registrar compra' },
	'stock.purchase.supplier': { group: s, label: 'Compras: fornecedor', default: 'Fornecedor' },
	'stock.purchase.date': { group: s, label: 'Compras: data', default: 'Data' },
	'stock.purchase.item': { group: s, label: 'Compras: item', default: 'Item' },
	'stock.purchase.qty': { group: s, label: 'Compras: quantidade', default: 'Quantidade' },
	'stock.purchase.total': { group: s, label: 'Compras: total', default: 'Total (R$)' },
	'stock.purchase.addLine': { group: s, label: 'Compras: mais um item', default: 'Mais um item' },
	'stock.purchase.lines': { group: s, label: 'Compras: itens', default: '{n} itens' },
	'stock.purchase.none': {
		group: s,
		label: 'Compras: vazio',
		default: 'Nenhuma compra registrada.'
	},
	'stock.count.intro': {
		group: s,
		label: 'Contagem: texto',
		default: 'Conte o que tem e digite. Só os itens que mudaram são ajustados.'
	},
	'stock.count.save': { group: s, label: 'Contagem: salvar', default: 'Salvar contagem' },
	'stock.count.done': {
		group: s,
		label: 'Contagem: salva',
		default: 'Contagem salva: {n} itens ajustados.'
	},
	'stock.waste.reason': { group: s, label: 'Perdas: motivo', default: 'Motivo' },
	'stock.waste.save': { group: s, label: 'Perdas: registrar', default: 'Registrar perda' },
	'stock.waste.none': { group: s, label: 'Perdas: vazio', default: 'Nenhuma perda registrada.' },
	'stock.recipes.intro': {
		group: s,
		label: 'Fichas: texto',
		default:
			'O custo de cada produto sai da ficha técnica e do custo médio dos insumos. Produtos sem ficha ficam fora do lucro.'
	},
	'stock.recipes.product': { group: s, label: 'Fichas: produto', default: 'Produto' },
	'stock.recipes.options': { group: s, label: 'Fichas: adicionais', default: 'Adicionais' },
	'stock.recipes.cost': { group: s, label: 'Fichas: custo', default: 'Custo' },
	'stock.recipes.margin': {
		group: s,
		label: 'Fichas: margem',
		default: 'Margem {channel}'
	},
	'stock.recipes.missing': { group: s, label: 'Fichas: sem ficha', default: 'sem ficha técnica' },
	'stock.recipes.edit': { group: s, label: 'Fichas: editar', default: 'Ficha técnica' },
	'stock.recipes.line': { group: s, label: 'Fichas: insumo', default: 'Insumo' },
	'stock.recipes.qty': { group: s, label: 'Fichas: quantidade', default: 'Quantidade por unidade' },
	'stock.recipes.skipIf': {
		group: s,
		label: 'Fichas: pular se retirado',
		default: 'Não usar se o cliente retirar'
	},
	'stock.recipes.addLine': { group: s, label: 'Fichas: mais um insumo', default: 'Mais um insumo' },
	'stock.recipes.remove': { group: s, label: 'Fichas: remover', default: 'Remover' },
	'stock.recipes.costLine': {
		group: s,
		label: 'Fichas: custo da ficha',
		default: 'Custo da ficha: {value}'
	},
	'fees.title': { group: s, label: 'Taxas: título', default: 'Taxas' },
	'fees.hint': {
		group: s,
		label: 'Taxas: ajuda',
		default:
			'Quanto cada forma de pagamento custa. Entra no lucro de cada pedido. Confira com o seu contrato (maquininha, Mercado Pago, Efí, iFood).'
	},
	'fees.method': { group: s, label: 'Taxas: forma', default: 'Forma de pagamento' },
	'fees.percent': { group: s, label: 'Taxas: percentual', default: 'Taxa (%)' },
	'fees.fixed': { group: s, label: 'Taxas: fixa', default: 'Fixa (R$)' },
	'fees.days': { group: s, label: 'Taxas: prazo', default: 'Recebe em (dias)' },
	'fees.m.cash': { group: s, label: 'Taxas: dinheiro', default: 'Dinheiro' },
	'fees.m.external_pix': {
		group: s,
		label: 'Taxas: Pix na chave',
		default: 'Pix na chave da loja'
	},
	'fees.m.terminal_card': { group: s, label: 'Taxas: maquininha', default: 'Cartão na maquininha' },
	'fees.m.softpos_nfc': {
		group: s,
		label: 'Taxas: celular',
		default: 'Cartão por aproximação no celular'
	},
	'fees.m.pix': { group: s, label: 'Taxas: Pix online', default: 'Pix online' },
	'fees.m.online_card': { group: s, label: 'Taxas: cartão online', default: 'Cartão online' },
	'fees.m.ifood_collected': {
		group: s,
		label: 'Taxas: pago no iFood',
		default: 'Pago no app do iFood'
	},
	'profit.title': { group: s, label: 'Lucro: título', default: 'Lucro' },
	'profit.intro': {
		group: s,
		label: 'Lucro: texto',
		default:
			'Quanto sobra de cada canal depois das comissões, taxas de pagamento, entrega e custo da comida. Despesas fixas ficam no Resultado do mês.'
	},
	'profit.ifoodExtra': {
		group: s,
		label: 'Lucro: iFood no site',
		default: 'Estes {n} pedidos do iFood teriam rendido {value} a mais no seu site.'
	},
	'profit.withoutRecipe': {
		group: s,
		label: 'Lucro: sem ficha',
		default: '{n} pedidos têm produto sem ficha técnica: o custo da comida deles não entrou.'
	},
	'profit.asterisk': {
		group: s,
		label: 'Lucro: asterisco',
		default: '* Sem o custo da comida dos pedidos com produto sem ficha técnica.'
	},
	'profit.channel': { group: s, label: 'Lucro: canal', default: 'Canal' },
	'profit.total': { group: s, label: 'Lucro: total', default: 'Total' },
	'profit.orders': { group: s, label: 'Lucro: pedidos', default: 'Pedidos' },
	'profit.gross': { group: s, label: 'Lucro: bruto', default: 'Bruto' },
	'profit.discounts': { group: s, label: 'Lucro: descontos', default: 'Descontos' },
	'profit.commissions': { group: s, label: 'Lucro: comissões', default: 'Comissões' },
	'profit.fees': { group: s, label: 'Lucro: taxas', default: 'Taxas de pagamento' },
	'profit.delivery': { group: s, label: 'Lucro: entrega', default: 'Entrega' },
	'profit.food': { group: s, label: 'Lucro: comida', default: 'Comida' },
	'profit.net': { group: s, label: 'Lucro: líquido', default: 'Sobra' },
	'profit.perOrder': { group: s, label: 'Lucro: por pedido', default: 'Por pedido' },
	'profit.beforeFood': { group: s, label: 'Lucro: antes da comida', default: 'Antes da comida' },
	'profit.fromStatement': {
		group: s,
		label: 'Lucro: do extrato',
		default: 'Comissão e taxa do extrato do app.'
	},
	'profit.settings': {
		group: s,
		label: 'Lucro: configurações',
		default: 'Comissões e custo da entrega'
	},
	'profit.ifoodCommission': {
		group: s,
		label: 'Lucro: comissão iFood loja entrega',
		default: 'Comissão iFood, loja entrega (%)'
	},
	'profit.ifoodDeliveryCommission': {
		group: s,
		label: 'Lucro: comissão iFood entrega iFood',
		default: 'Comissão iFood, iFood entrega (%)'
	},
	'profit.odCommission': {
		group: s,
		label: 'Lucro: comissão Open Delivery',
		default: 'Comissão 99Food / Keeta (%)'
	},
	'profit.deliveryCost': {
		group: s,
		label: 'Lucro: custo por entrega',
		default: 'Custo por entrega própria (R$)'
	},
	'nav.despesas': { group: 'staffLabels', label: 'Menu da equipe: despesas', default: 'Despesas' },
	'expenses.title': { group: s, label: 'Despesas: título', default: 'Despesas' },
	'expenses.intro': {
		group: s,
		label: 'Despesas: texto',
		default:
			'Lance as contas do mês (aluguel, salários, energia…). As fixas entram sozinhas todo mês no dia escolhido.'
	},
	'expenses.month': { group: s, label: 'Despesas: mês', default: 'Mês' },
	'expenses.add': { group: s, label: 'Despesas: lançar', default: 'Lançar despesa' },
	'expenses.category': { group: s, label: 'Despesas: categoria', default: 'Categoria' },
	'expenses.description': { group: s, label: 'Despesas: descrição', default: 'Descrição' },
	'expenses.amount': { group: s, label: 'Despesas: valor', default: 'Valor (R$)' },
	'expenses.paidAt': { group: s, label: 'Despesas: pago em', default: 'Pago em' },
	'expenses.none': { group: s, label: 'Despesas: vazio', default: 'Nenhuma despesa neste mês.' },
	'expenses.total': { group: s, label: 'Despesas: total', default: 'Total do mês: {value}' },
	'expenses.delete': { group: s, label: 'Despesas: excluir', default: 'Excluir' },
	'expenses.recurringTag': { group: s, label: 'Despesas: fixa', default: 'fixa' },
	'expenses.recurring': { group: s, label: 'Despesas: fixas', default: 'Despesas fixas' },
	'expenses.day': { group: s, label: 'Despesas: dia', default: 'Dia do mês' },
	'expenses.addRecurring': {
		group: s,
		label: 'Despesas: nova fixa',
		default: 'Adicionar despesa fixa'
	},
	'expenses.dayLine': { group: s, label: 'Despesas: todo dia', default: 'todo dia {day}' },
	'expenses.pause': { group: s, label: 'Despesas: pausar', default: 'Pausar' },
	'expenses.resume': { group: s, label: 'Despesas: retomar', default: 'Retomar' },
	'dre.title': { group: s, label: 'Resultado: título', default: 'Resultado do mês' },
	'dre.intro': {
		group: s,
		label: 'Resultado: texto',
		default:
			'Uma DRE simplificada: vendas, impostos estimados, custo da comida, comissões, taxas e despesas. Não substitui o contador.'
	},
	'dre.csv': { group: s, label: 'Resultado: CSV', default: 'Baixar CSV' },
	'dre.foodReal': {
		group: s,
		label: 'Resultado: CMV real',
		default: 'Custo da comida real (pelas contagens de estoque do mês).'
	},
	'dre.foodTheoretical': {
		group: s,
		label: 'Resultado: CMV teórico',
		default: 'Custo da comida teórico (pelas fichas técnicas). Faça uma contagem para ter o real.'
	},
	'dre.simples': {
		group: s,
		label: 'Resultado: alíquota',
		default: 'Alíquota do Simples Nacional (%)'
	},
	'dre.simplesMissing': {
		group: s,
		label: 'Resultado: alíquota não informada',
		default: 'Informe a alíquota do Simples (pergunte ao contador) para estimar os impostos.'
	},
	'dre.line.gross': { group: s, label: 'Resultado: vendas brutas', default: 'Vendas brutas' },
	'dre.line.discounts': { group: s, label: 'Resultado: descontos', default: '(−) Descontos' },
	'dre.line.taxes': { group: s, label: 'Resultado: impostos', default: '(−) Impostos estimados' },
	'dre.line.netRevenue': {
		group: s,
		label: 'Resultado: receita líquida',
		default: 'Receita líquida'
	},
	'dre.line.food': { group: s, label: 'Resultado: CMV', default: '(−) Custo da comida (CMV)' },
	'dre.line.grossProfit': { group: s, label: 'Resultado: lucro bruto', default: 'Lucro bruto' },
	'dre.line.commissions': {
		group: s,
		label: 'Resultado: comissões',
		default: '(−) Comissões dos apps'
	},
	'dre.line.fees': { group: s, label: 'Resultado: taxas', default: '(−) Taxas de pagamento' },
	'dre.line.delivery': { group: s, label: 'Resultado: entregas', default: '(−) Entregas próprias' },
	'dre.line.exp.cmv': {
		group: s,
		label: 'Resultado: insumos fora do estoque',
		default: '(−) Insumos e embalagens'
	},
	'dre.line.exp.pessoal': { group: s, label: 'Resultado: pessoal', default: '(−) Pessoal' },
	'dre.line.exp.ocupacao': { group: s, label: 'Resultado: ocupação', default: '(−) Ocupação' },
	'dre.line.exp.marketing': { group: s, label: 'Resultado: marketing', default: '(−) Marketing' },
	'dre.line.exp.taxas': {
		group: s,
		label: 'Resultado: tarifas',
		default: '(−) Tarifas e sistemas'
	},
	'dre.line.exp.impostos': {
		group: s,
		label: 'Resultado: outros impostos',
		default: '(−) Impostos e contador'
	},
	'dre.line.exp.outros': { group: s, label: 'Resultado: outros', default: '(−) Outros' },
	'dre.line.result': { group: s, label: 'Resultado: resultado', default: 'Resultado do mês' },
	'err.expense.description': {
		group: 'staffErrors',
		label: 'Despesas: descrição',
		default: 'Escreva uma descrição (até 120 letras).'
	},
	'err.expense.amount': {
		group: 'staffErrors',
		label: 'Despesas: valor',
		default: 'Informe um valor maior que zero.'
	},
	'err.expense.month': { group: 'staffErrors', label: 'Despesas: mês', default: 'Mês inválido.' },
	'err.expense.day': {
		group: 'staffErrors',
		label: 'Despesas: dia',
		default: 'Escolha um dia entre 1 e 28.'
	},
	'summary.subject': {
		group: s,
		label: 'Resumo do dia: assunto',
		default: 'Resumo do dia {data} · {loja}'
	},
	'summary.line.sales': {
		group: s,
		label: 'Resumo do dia: vendas',
		default: 'Vendas: {value} em {n} pedidos (ticket médio {avg})'
	},
	'summary.line.top': {
		group: s,
		label: 'Resumo do dia: mais vendidos',
		default: 'Mais vendidos: {list}'
	},
	'summary.line.cash': {
		group: s,
		label: 'Resumo do dia: diferença de caixa',
		default: 'Diferença no fechamento do caixa: {value}'
	},
	'summary.line.problems': {
		group: s,
		label: 'Resumo do dia: pendências',
		default: 'Sem pagamento: {unpaid} · Cancelados: {cancelled} · Alertas abertos: {alerts}'
	},
	'summary.enabled': {
		group: s,
		label: 'Resumo do dia: ligar',
		default: 'Enviar o resumo do dia 30 min depois de fechar'
	},
	'summary.whatsapp': {
		group: s,
		label: 'Resumo do dia: WhatsApp do dono',
		default: 'WhatsApp do dono para o resumo (opcional)'
	},
	'err.profit.settings': {
		group: 'staffErrors',
		label: 'Lucro: configuração inválida',
		default: 'Confira os percentuais (até 50%) e o custo da entrega.'
	},
	'err.fees.invalid': {
		group: 'staffErrors',
		label: 'Taxas: valor inválido',
		default: 'Confira as taxas: percentual até 50%, valores e prazos não negativos.'
	},
	'err.stock.name': {
		group: 'staffErrors',
		label: 'Estoque: nome',
		default: 'Dê um nome ao item.'
	},
	'err.stock.unit': {
		group: 'staffErrors',
		label: 'Estoque: unidade',
		default: 'Escolha g, ml ou unidade.'
	},
	'err.stock.qty': {
		group: 'staffErrors',
		label: 'Estoque: quantidade',
		default: 'Use números inteiros (g, ml ou unidades) e valores não negativos.'
	},
	'err.stock.duplicate': {
		group: 'staffErrors',
		label: 'Estoque: nome repetido',
		default: 'Já existe um item com esse nome.'
	},
	'err.stock.notFound': {
		group: 'staffErrors',
		label: 'Estoque: item não encontrado',
		default: 'Item de estoque não encontrado.'
	},
	'err.stock.noLines': {
		group: 'staffErrors',
		label: 'Estoque: compra vazia',
		default: 'Adicione pelo menos um item com quantidade.'
	},
	'err.print.roles': {
		group: 'staffErrors',
		label: 'Impressão: nenhuma função escolhida',
		default: 'Escolha o que esta tela imprime.'
	}
} as const satisfies Record<string, TextDef>;
