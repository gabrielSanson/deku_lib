// Texts of the staff customer list (Clientes) and privacy requests.
import type { TextDef } from './catalog';

const g = 'staff' as const;

export const STAFF_CUSTOMER_TEXTS = {
	'customers.tabTitle': { group: g, label: 'Clientes: título da aba', default: 'Clientes' },
	'customers.title': { group: g, label: 'Clientes: título', default: 'Clientes' },
	'customers.intro': {
		group: g,
		label: 'Clientes: introdução',
		default:
			'Quem já pediu na loja. Contatos do iFood e de outros apps aparecem para consulta, mas nunca recebem mensagens de marketing.'
	},
	'customers.search': {
		group: g,
		label: 'Clientes: buscar',
		default: 'Nome, telefone ou e-mail'
	},
	'customers.filter': { group: g, label: 'Clientes: filtro', default: 'Filtro' },
	'customers.filter.all': { group: g, label: 'Clientes: todos', default: 'Todos' },
	'customers.filter.inactive': {
		group: g,
		label: 'Clientes: sem pedir há 30 dias',
		default: 'Sem pedir há 30 dias'
	},
	'customers.filter.frequent': { group: g, label: 'Clientes: frequentes', default: 'Frequentes' },
	'customers.filter.new': { group: g, label: 'Clientes: novos', default: 'Novos (30 dias)' },
	'customers.source': { group: g, label: 'Clientes: origem', default: 'Origem' },
	'customers.source.any': { group: g, label: 'Clientes: qualquer origem', default: 'Todas' },
	'customers.source.own': { group: g, label: 'Clientes: origem site', default: 'Site' },
	'customers.source.pos': { group: g, label: 'Clientes: origem balcão', default: 'Balcão' },
	'customers.source.whatsapp': {
		group: g,
		label: 'Clientes: origem WhatsApp',
		default: 'WhatsApp'
	},
	'customers.source.ifood': { group: g, label: 'Clientes: origem iFood', default: 'iFood' },
	'customers.source.opendelivery': {
		group: g,
		label: 'Clientes: origem outros apps',
		default: 'Outros apps'
	},
	'customers.name': { group: g, label: 'Clientes: nome', default: 'Nome' },
	'customers.orders': { group: g, label: 'Clientes: pedidos', default: 'Pedidos' },
	'customers.total': { group: g, label: 'Clientes: total', default: 'Total gasto' },
	'customers.lastOrder': { group: g, label: 'Clientes: último pedido', default: 'Último pedido' },
	'customers.consent': {
		group: g,
		label: 'Clientes: aceita marketing',
		default: 'Aceita ofertas'
	},
	'customers.noConsent': {
		group: g,
		label: 'Clientes: sem marketing',
		default: 'Sem ofertas'
	},
	'customers.none': { group: g, label: 'Clientes: nenhum', default: 'Nenhum cliente encontrado.' },
	'customers.exportMarketing': {
		group: g,
		label: 'Clientes: exportar para ofertas',
		default: 'Exportar quem aceita ofertas (CSV)'
	},
	'customers.exportDelivery': {
		group: g,
		label: 'Clientes: exportar sem contato',
		default: 'Exportar lista sem telefone (CSV)'
	},
	'customers.back': { group: g, label: 'Clientes: voltar', default: 'Voltar para clientes' },
	'customers.phone': { group: g, label: 'Clientes: telefone', default: 'Telefone' },
	'customers.email': { group: g, label: 'Clientes: e-mail', default: 'E-mail' },
	'customers.firstOrder': {
		group: g,
		label: 'Clientes: primeiro pedido',
		default: 'Primeiro pedido'
	},
	'customers.ordersTitle': { group: g, label: 'Clientes: pedidos do cliente', default: 'Pedidos' },
	'nav.clientes': { group: 'staffLabels', label: 'Menu da equipe: Clientes', default: 'Clientes' }
} as const satisfies Record<string, TextDef>;
