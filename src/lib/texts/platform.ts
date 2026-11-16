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
	}
} as const satisfies Record<string, TextDef>;
