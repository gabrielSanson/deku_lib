// Texts of loyalty, referral and birthday coupons: the customer's /conta and the staff page.
import type { TextDef } from './catalog';

const a = 'account' as const;
const c = 'staffCampaigns' as const;

export const LOYALTY_TEXTS = {
	'loyalty.mail.subject': {
		group: a,
		label: 'Cupom: assunto do e-mail',
		default: 'Você ganhou um cupom: {benefit}'
	},
	'loyalty.mail.body': {
		group: a,
		label: 'Cupom: texto do e-mail',
		default:
			'Olá, {name}! Você ganhou {benefit}. Use o cupom {code} no seu próximo pedido até {until}.'
	},
	'loyalty.card': { group: a, label: 'Conta: cartão fidelidade', default: 'Cartão fidelidade' },
	'loyalty.cardLine': {
		group: a,
		label: 'Conta: carimbos',
		default: '{stamps} de {every} pedidos. Ao completar, você ganha {benefit}.'
	},
	'loyalty.refer': { group: a, label: 'Conta: indique um amigo', default: 'Indique um amigo' },
	'loyalty.referLine': {
		group: a,
		label: 'Conta: como indicar',
		default:
			'Mande este link para um amigo. No primeiro pedido dele, ele ganha um desconto e você ganha um cupom.'
	},
	'loyalty.copy': { group: a, label: 'Conta: copiar link', default: 'Copiar link' },
	'loyalty.copied': { group: a, label: 'Conta: link copiado', default: 'Copiado' },
	'loyalty.coupons': { group: a, label: 'Conta: seus cupons', default: 'Seus cupons' },
	'loyalty.until': { group: a, label: 'Conta: cupom válido até', default: 'até {date}' },
	'loyalty.birthday': {
		group: a,
		label: 'Conta: aniversário',
		default: 'Seu aniversário (para ganhar um presente)'
	},
	'loyalty.tabTitle': {
		group: c,
		label: 'Fidelidade: título da aba',
		default: 'Fidelidade e indicação · Campanhas'
	},
	'loyalty.title': { group: c, label: 'Fidelidade: título', default: 'Fidelidade e indicação' },
	'loyalty.intro': {
		group: c,
		label: 'Fidelidade: introdução',
		default:
			'Cupons dados a cada cliente: um a cada tantos pedidos pagos, um para quem indica um amigo e um na semana do aniversário. O cliente vê os cupons em Minha conta; quem aceita ofertas também recebe por e-mail.'
	},
	'loyalty.on': { group: c, label: 'Fidelidade: ligado', default: 'Ligado' },
	'loyalty.every': {
		group: c,
		label: 'Fidelidade: a cada quantos pedidos',
		default: 'A cada quantos pedidos pagos'
	},
	'loyalty.days': { group: c, label: 'Fidelidade: validade', default: 'Validade do cupom (dias)' },
	'loyalty.benefit': { group: c, label: 'Fidelidade: benefício', default: 'O cliente ganha' },
	'loyalty.welcome': {
		group: c,
		label: 'Fidelidade: o amigo ganha',
		default: 'O amigo ganha no primeiro pedido'
	},
	'loyalty.reward': {
		group: c,
		label: 'Fidelidade: quem indicou ganha',
		default: 'Quem indicou ganha'
	},
	'loyalty.percent': { group: c, label: 'Fidelidade: porcentagem', default: '% de desconto' },
	'loyalty.fixed': { group: c, label: 'Fidelidade: valor fixo', default: 'R$ de desconto' },
	'loyalty.freeDelivery': {
		group: c,
		label: 'Fidelidade: entrega grátis',
		default: 'Entrega grátis'
	},
	'loyalty.value': { group: c, label: 'Fidelidade: valor', default: 'Valor' },
	'loyalty.save': { group: c, label: 'Fidelidade: salvar', default: 'Salvar' },
	'loyalty.saved': { group: c, label: 'Fidelidade: salvo', default: 'Salvo.' },
	'loyalty.link': {
		group: c,
		label: 'Fidelidade: link na lista',
		default: 'Fidelidade, indicação e aniversário'
	},
	'err.birthday': {
		group: 'errors',
		label: 'Conta: data de aniversário inválida',
		default: 'Data de aniversário inválida.'
	}
} as const satisfies Record<string, TextDef>;
