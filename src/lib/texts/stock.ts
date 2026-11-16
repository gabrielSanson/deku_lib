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
	}
} as const satisfies Record<string, TextDef>;
