// Short labels shown on many staff screens: menu items, order types, payment methods,
// order and payment states and weekdays. The domain modules keep the same words as
// defaults for server-side use (exports, notifications); screens read these.
import type { TextDef } from './catalog';

const g = 'staffLabels' as const;

export const STAFF_LABEL_TEXTS = {
	'nav.operacao': { group: g, label: 'Menu da equipe: operação', default: 'Operação' },
	'nav.inicio': { group: g, label: 'Menu da equipe: início', default: 'Início' },
	'nav.caixa': { group: g, label: 'Menu da equipe: caixa', default: 'Caixa' },
	'nav.gaveta': { group: g, label: 'Menu da equipe: gaveta', default: 'Gaveta' },
	'nav.pedidos': { group: g, label: 'Menu da equipe: pedidos', default: 'Pedidos' },
	'nav.cozinha': { group: g, label: 'Menu da equipe: cozinha', default: 'Cozinha' },
	'nav.caixaDoDia': { group: g, label: 'Menu da equipe: caixa do dia', default: 'Caixa do dia' },
	'nav.cardapio': { group: g, label: 'Menu da equipe: cardápio', default: 'Cardápio' },
	'nav.disponibilidade': {
		group: g,
		label: 'Menu da equipe: disponibilidade',
		default: 'Disponibilidade'
	},
	'nav.produtosEAdicionais': {
		group: g,
		label: 'Menu da equipe: produtos e adicionais',
		default: 'Produtos e adicionais'
	},
	'nav.ingredientes': { group: g, label: 'Menu da equipe: ingredientes', default: 'Ingredientes' },
	'nav.paginasDoSite': {
		group: g,
		label: 'Menu da equipe: páginas do site',
		default: 'Páginas do site'
	},
	'nav.gestao': { group: g, label: 'Menu da equipe: gestão', default: 'Gestão' },
	'nav.relatorios': { group: g, label: 'Menu da equipe: relatórios', default: 'Relatórios' },
	'nav.campanhas': { group: g, label: 'Menu da equipe: campanhas', default: 'Campanhas' },
	'nav.equipe': { group: g, label: 'Menu da equipe: equipe', default: 'Equipe' },
	'nav.configuracoes': {
		group: g,
		label: 'Menu da equipe: configurações',
		default: 'Configurações'
	},
	'nav.funcionamento': {
		group: g,
		label: 'Menu da equipe: funcionamento',
		default: 'Funcionamento'
	},
	'nav.horarios': { group: g, label: 'Menu da equipe: horários', default: 'Horários' },
	'nav.dadosEPix': { group: g, label: 'Menu da equipe: dados e pix', default: 'Dados e Pix' },
	'nav.notaFiscal': { group: g, label: 'Menu da equipe: nota fiscal', default: 'Nota fiscal' },
	'nav.aparencia': { group: g, label: 'Menu da equipe: aparência', default: 'Aparência' },
	'nav.paginaInicial': {
		group: g,
		label: 'Menu da equipe: página inicial',
		default: 'Página inicial'
	},
	'nav.textosDoSite': {
		group: g,
		label: 'Menu da equipe: textos do site',
		default: 'Textos do site'
	},
	'nav.entrega': { group: g, label: 'Menu da equipe: entrega', default: 'Entrega' },
	'nav.integracoes': { group: g, label: 'Menu da equipe: integrações', default: 'Integrações' },
	'nav.configuracaoInicial': {
		group: g,
		label: 'Menu da equipe: configuração inicial',
		default: 'Configuração inicial'
	},
	'fulfillment.counter': { group: g, label: 'Tipo de pedido: balcão', default: 'Balcão' },
	'fulfillment.pickup': { group: g, label: 'Tipo de pedido: para viagem', default: 'Para viagem' },
	'fulfillment.delivery': { group: g, label: 'Tipo de pedido: entrega', default: 'Entrega' },
	'fulfillment.dine_in': { group: g, label: 'Tipo de pedido: comer aqui', default: 'Comer aqui' },
	'fulfillment.table': {
		group: g,
		label: 'Tipo de pedido: comer aqui com mesa',
		default: '{label} · mesa {table}'
	},
	'method.cash': { group: g, label: 'Forma de pagamento: Dinheiro', default: 'Dinheiro' },
	'method.external_pix': {
		group: g,
		label: 'Forma de pagamento: Pix (conferido)',
		default: 'Pix (conferido)'
	},
	'method.terminal_card': {
		group: g,
		label: 'Forma de pagamento: Cartão (maquininha)',
		default: 'Cartão (maquininha)'
	},
	'method.softpos_nfc': {
		group: g,
		label: 'Forma de pagamento: Cartão por aproximação (celular)',
		default: 'Cartão por aproximação (celular)'
	},
	'method.pix': { group: g, label: 'Forma de pagamento: Pix online', default: 'Pix online' },
	'method.online_card': {
		group: g,
		label: 'Forma de pagamento: Cartão online',
		default: 'Cartão online'
	},
	'method.ifood_collected': {
		group: g,
		label: 'Forma de pagamento: Pago no iFood',
		default: 'Pago no iFood'
	},
	'status.new': { group: g, label: 'Situação do pedido: novo', default: 'Novo' },
	'status.confirmed': { group: g, label: 'Situação do pedido: confirmado', default: 'Confirmado' },
	'status.preparing': { group: g, label: 'Situação do pedido: em preparo', default: 'Em preparo' },
	'status.ready': { group: g, label: 'Situação do pedido: pronto', default: 'Pronto' },
	'status.completed': { group: g, label: 'Situação do pedido: concluído', default: 'Concluído' },
	'status.cancelled': { group: g, label: 'Situação do pedido: cancelado', default: 'Cancelado' },
	'status.rejected': { group: g, label: 'Situação do pedido: recusado', default: 'Recusado' },
	'payment.status.pending': {
		group: g,
		label: 'Situação do pagamento: pendente',
		default: 'Pendente'
	},
	'payment.status.paid': { group: g, label: 'Situação do pagamento: pago', default: 'Pago' },
	'payment.status.failed': { group: g, label: 'Situação do pagamento: falhou', default: 'Falhou' },
	'payment.status.cancelled': {
		group: g,
		label: 'Situação do pagamento: cancelado',
		default: 'Cancelado'
	},
	'payment.status.refunded': {
		group: g,
		label: 'Situação do pagamento: estornado',
		default: 'Estornado'
	},
	'payment.status.unknown': {
		group: g,
		label: 'Situação do pagamento: desconhecido',
		default: 'Desconhecido'
	},
	'weekday.0': { group: g, label: 'Dia da semana: domingo', default: 'Domingo' },
	'weekday.1': { group: g, label: 'Dia da semana: segunda', default: 'Segunda' },
	'weekday.2': { group: g, label: 'Dia da semana: terça', default: 'Terça' },
	'weekday.3': { group: g, label: 'Dia da semana: quarta', default: 'Quarta' },
	'weekday.4': { group: g, label: 'Dia da semana: quinta', default: 'Quinta' },
	'weekday.5': { group: g, label: 'Dia da semana: sexta', default: 'Sexta' },
	'weekday.6': { group: g, label: 'Dia da semana: sábado', default: 'Sábado' }
} as const satisfies Record<string, TextDef>;
