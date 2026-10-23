// Deku Burger: black and yellow on cream, the burger photos and the shop's own wording.
import type { Preset } from './index';

const dir = '/presets/deku';

export const deku: Preset = {
	shopName: 'Deku Burger',
	colors: { primary: '#ffbc00', dark: '#0b0b0b', background: '#faf7f0' },
	images: {
		logo: `${dir}/brand/deku-mark.png`,
		wordmark: `${dir}/brand/deku-wordmark.png`,
		heroImage: `${dir}/hero/banner-1920.webp`,
		heroLogo: `${dir}/hero/burger-1200.webp`,
		icon: `${dir}/icon-512.png`,
		loginImage: `${dir}/hero/banner-1920.webp`,
		staffBackground: `${dir}/hero/background-1920.webp`
	},
	srcsets: {
		heroImage: `${dir}/hero/banner-960.webp 960w, ${dir}/hero/banner-1920.webp 1920w`,
		loginImage: `${dir}/hero/banner-960.webp 960w, ${dir}/hero/banner-1920.webp 1920w`,
		staffBackground: `${dir}/hero/background-960.webp 960w, ${dir}/hero/background-1920.webp 1920w`
	},
	icons: {
		favicon: `${dir}/favicon.png`,
		appleTouch: `${dir}/apple-touch-icon.png`,
		icon192: `${dir}/icon-192.png`,
		icon512: `${dir}/icon-512.png`,
		maskable: `${dir}/icon-maskable-512.png`
	},
	lockup: `${dir}/brand/deku-logo.png`,
	texts: {
		'account.tagline': 'Mais que burgers.\nÉ a nossa essência.',
		'footer.tagline': 'Burger de verdade é aqui',
		'home.metaDescription': 'Peça seus burgers online para retirada ou entrega.',
		'home.hero.eyebrow': 'Peça no seu ritmo',
		'home.hero.phoneTitle': 'Sua fome merece esse clássico.',
		'home.hero.title': 'Feito na chapa.\nFeito pra você.',
		'home.hero.text': 'Burgers suculentos, ingredientes frescos e muito sabor.',
		'home.featured.title': 'Burgers que todo mundo ama.',
		'cart.emptyHint': 'Escolha um burger e ele aparece aqui.',
		'product.notePlaceholder': 'Ex.: sem sal na batata',
		'menu.subtitle': 'Sabor brasileiro em cada mordida.'
	},
	pages: {
		sobre: ['Hambúrgueres artesanais feitos na hora.'],
		alergenicos: [
			'Nossos pães contêm glúten e a maioria dos queijos contém lactose. Avise a equipe sobre alergias: marcamos o pedido para a cozinha.'
		]
	}
};
