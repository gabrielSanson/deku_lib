// Texts of the hosted platform: the shop picker, a suspended or late shop, sign-up, the
// platform console and the shop's plan and billing page.
import type { TextDef } from './catalog';

const g = 'platform' as const;

export const PLATFORM_TEXTS = {
	'shops.tabTitle': { group: g, label: 'Lojas: título da aba', default: 'Suas lojas' },
	'shops.title': { group: g, label: 'Lojas: título', default: 'Suas lojas' },
	'shops.notHere': {
		group: g,
		label: 'Lojas: não é da equipe',
		default: 'Sua conta não faz parte da equipe desta loja. Abra uma das suas lojas abaixo.'
	},
	'shops.none': {
		group: g,
		label: 'Lojas: nenhuma',
		default:
			'Sua conta ainda não faz parte de nenhuma loja. Peça ao dono da loja para adicionar você.'
	},
	'shops.open': { group: g, label: 'Lojas: abrir', default: 'Abrir' },
	'shops.suspended': { group: g, label: 'Lojas: suspensa', default: 'Suspensa' },
	'shops.signOut': { group: g, label: 'Lojas: sair', default: 'Sair' },
	'shop.suspended': {
		group: g,
		label: 'Site: loja suspensa',
		default: 'Esta loja não está recebendo pedidos pelo site no momento.'
	},
	'shop.pastDue': {
		group: g,
		label: 'Equipe: mensalidade atrasada',
		default:
			'A mensalidade está em atraso. Pague em Configurações → Plano e cobrança para a loja não ser suspensa.'
	},
	'shop.suspendedStaff': {
		group: g,
		label: 'Equipe: loja suspensa',
		default:
			'Loja suspensa: o site não recebe pedidos e nada pode ser alterado até o pagamento do plano.'
	},
	'plan.tabTitle': {
		group: g,
		label: 'Plano: título da aba',
		default: 'Plano e cobrança · Configurações'
	},
	'plan.selfHosted': {
		group: g,
		label: 'Plano: instalação própria',
		default: 'Esta loja roda em um servidor próprio: não há mensalidade da plataforma.'
	},
	'plan.price': { group: g, label: 'Plano: preço', default: '{price} por mês' },
	'plan.trialUntil': { group: g, label: 'Plano: teste até', default: 'Teste grátis até {date}.' },
	'plan.status.trial': { group: g, label: 'Plano: em teste', default: 'Em teste' },
	'plan.status.active': { group: g, label: 'Plano: em dia', default: 'Em dia' },
	'plan.status.past_due': { group: g, label: 'Plano: atrasado', default: 'Em atraso' },
	'plan.status.suspended': { group: g, label: 'Plano: suspenso', default: 'Suspensa' },
	'plan.status.closed': { group: g, label: 'Plano: encerrado', default: 'Encerrada' },
	'plan.openInvoice': { group: g, label: 'Plano: fatura aberta', default: 'Mensalidade a pagar' },
	'plan.invoiceLine': {
		group: g,
		label: 'Plano: valor e vencimento',
		default: '{amount}, vence em {due}.'
	},
	'plan.copy': { group: g, label: 'Plano: copiar Pix', default: 'Copiar código Pix' },
	'plan.copied': { group: g, label: 'Plano: copiado', default: 'Copiado' },
	'plan.afterPaying': {
		group: g,
		label: 'Plano: depois de pagar',
		default: 'Depois de pagar, a confirmação aparece aqui em até um dia útil.'
	},
	'plan.noPixYet': {
		group: g,
		label: 'Plano: sem Pix ainda',
		default: 'O código Pix desta fatura ainda não está disponível. Fale com o suporte.'
	},
	'plan.history': { group: g, label: 'Plano: histórico', default: 'Faturas' },
	'plan.noInvoices': { group: g, label: 'Plano: sem faturas', default: 'Nenhuma fatura ainda.' },
	'plan.invoice.open': { group: g, label: 'Plano: fatura aberta (situação)', default: 'Aberta' },
	'plan.invoice.paid': { group: g, label: 'Plano: fatura paga', default: 'Paga' },
	'plan.invoice.void': { group: g, label: 'Plano: fatura cancelada', default: 'Cancelada' }
} as const satisfies Record<string, TextDef>;
