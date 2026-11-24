// A cookie shop that only sells online: warm caramel and chocolate colours, cookie
// illustrations until the owner uploads photos, cookie wording, a menu with single cookies,
// boxes and drinks, and the simple staff area (orders, menu and site; no back office).
import { cookieCatalog } from '../catalog/cookies';
import type { Preset } from './index';

const dir = '/presets/cookie';

export const cookie: Preset = {
	shopName: 'Casa do Cookie',
	colors: { primary: '#e9a646', dark: '#3b2314', background: '#fbf3e6' },
	images: {
		logo: `${dir}/mark.svg`,
		// Drawn from the shop's name (src/routes/presets/wordmark.svg).
		wordmark: '/presets/wordmark.svg',
		heroImage: `${dir}/hero.svg`,
		heroLogo: `${dir}/hero-cookies.svg`,
		icon: `${dir}/icon-512.png`,
		loginImage: `${dir}/hero.svg`,
		staffBackground: `${dir}/hero.svg`
	},
	srcsets: {},
	icons: {
		favicon: `${dir}/favicon.png`,
		appleTouch: `${dir}/apple-touch-icon.png`,
		icon192: `${dir}/icon-192.png`,
		icon512: `${dir}/icon-512.png`,
		maskable: `${dir}/icon-maskable-512.png`
	},
	lockup: null,
	texts: {
		'menuEdit.emptyText':
			'Crie uma categoria (por exemplo "Cookies") e depois os produtos. Ou comece com o cardápio de exemplo e ajuste nomes, preços e fotos.',
		'menuEdit.groupsHint':
			'Sabores de uma caixa, tamanhos, "aquecer na hora". Um grupo pode ser usado em vários produtos.',
		'group.minHint': '0 = opcional. Numa caixa com 6, use mínimo 6 e máximo 6.',
		'group.optionNamePlaceholder': 'Duplo chocolate',
		'ingredients.newPlaceholder': 'Gotas de chocolate',
		'account.tagline': 'Cookies assados todo dia.\nDo forno pra você.',
		'footer.tagline': 'Cookies feitos à mão, assados todo dia',
		'home.metaDescription':
			'Peça cookies artesanais online, avulsos ou em caixas, para retirada ou entrega.',
		'home.hero.eyebrow': 'Assados hoje',
		'home.hero.phoneTitle': 'Cookie quentinho, do jeito que você gosta.',
		'home.hero.title': 'Crocante por fora.\nMacio por dentro.',
		'home.hero.text':
			'Cookies artesanais com manteiga de verdade e muito chocolate. Avulsos ou em caixas para presentear.',
		'home.hero.cta': 'Escolher cookies',
		'home.featured.title': 'Os favoritos da casa.',
		'cart.emptyHint': 'Escolha um cookie ou monte uma caixa e ele aparece aqui.',
		'product.notePlaceholder': 'Ex.: é para presente, não colocar preço',
		'menu.subtitle': 'Cookies avulsos, caixas para presente e algo para acompanhar.'
	},
	pages: {
		sobre: [
			'Cookies artesanais assados em pequenas fornadas todos os dias, com manteiga, chocolate de verdade e sem pressa.'
		],
		alergenicos: [
			'Todos os nossos cookies contêm glúten, leite e ovos, e são feitos na mesma cozinha que castanhas, amendoim e pistache. Cada produto mostra os alergênicos no cardápio. Em caso de alergia, avise no pedido.'
		]
	},
	catalog: cookieCatalog,
	productIcon: 'grid',
	css: '',
	adminMode: 'simple'
};
