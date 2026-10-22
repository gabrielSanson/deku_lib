// Every customer-facing text, with its default. The owner can replace any of
// them in Configurações > Textos; only the changed ones are stored. Words in
// {braces} are filled in by the app and must stay in the edited text.

export interface TextDef {
	group: TextGroup;
	label: string;
	default: string;
}

export const TEXT_GROUPS = {
	errors: 'Avisos e erros',
	header: 'Topo e rodapé',
	home: 'Página inicial',
	menu: 'Cardápio',
	cart: 'Carrinho',
	product: 'Produto',
	checkout: 'Finalizar pedido',
	payment: 'Pagamento',
	order: 'Acompanhar pedido',
	account: 'Conta do cliente',
	staff: 'Telas da equipe'
} as const;
export type TextGroup = keyof typeof TEXT_GROUPS;

export const TEXTS = {
	// Customer account
	'account.tab': { group: 'account', label: 'Aba Conta (celular)', default: 'Conta' },
	'account.title': { group: 'account', label: 'Entrar: título', default: 'Sua conta, seu pedido.' },
	'account.subtitle': {
		group: 'account',
		label: 'Entrar: subtítulo',
		default: 'Entre para acompanhar pedidos e guardar seus benefícios.'
	},
	'account.tabLogin': { group: 'account', label: 'Aba Entrar', default: 'Entrar' },
	'account.tabSignup': { group: 'account', label: 'Aba Criar conta', default: 'Criar conta' },
	'account.name': { group: 'account', label: 'Campo nome', default: 'Nome' },
	'account.phone': { group: 'account', label: 'Campo celular', default: 'Celular' },
	'account.email': { group: 'account', label: 'Campo e-mail', default: 'E-mail' },
	'account.password': { group: 'account', label: 'Campo senha', default: 'Senha' },
	'account.passwordHint': {
		group: 'account',
		label: 'Dica da senha',
		default: 'Mínimo de 8 caracteres.'
	},
	'account.recover.forgot': {
		group: 'account',
		label: 'Recuperar: link esqueci',
		default: 'Esqueci a senha'
	},
	'account.recover.title': {
		group: 'account',
		label: 'Recuperar: título',
		default: 'Recuperar senha'
	},
	'account.recover.text': {
		group: 'account',
		label: 'Recuperar: texto',
		default: 'Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.'
	},
	'account.recover.submit': {
		group: 'account',
		label: 'Recuperar: botão enviar',
		default: 'Enviar link'
	},
	'account.recover.sent': {
		group: 'account',
		label: 'Recuperar: confirmação',
		default:
			'Se existir uma conta com esse e-mail, você receberá um link para criar uma nova senha.'
	},
	'account.recover.back': {
		group: 'account',
		label: 'Recuperar: voltar',
		default: 'Voltar para entrar'
	},
	'account.recover.newTitle': {
		group: 'account',
		label: 'Nova senha: título',
		default: 'Nova senha'
	},
	'account.recover.newPassword': {
		group: 'account',
		label: 'Nova senha: campo',
		default: 'Nova senha'
	},
	'account.recover.confirmPassword': {
		group: 'account',
		label: 'Nova senha: confirmar',
		default: 'Confirme a nova senha'
	},
	'account.recover.save': {
		group: 'account',
		label: 'Nova senha: botão salvar',
		default: 'Salvar nova senha'
	},
	'account.recover.mismatch': {
		group: 'account',
		label: 'Nova senha: senhas diferentes',
		default: 'As senhas não são iguais.'
	},
	'account.submitLogin': { group: 'account', label: 'Botão entrar', default: 'Continuar' },
	'account.submitSignup': { group: 'account', label: 'Botão criar conta', default: 'Criar conta' },
	'account.or': { group: 'account', label: 'Divisor "ou"', default: 'ou' },
	'account.google': {
		group: 'account',
		label: 'Botão Google',
		default: 'Continuar com Google'
	},
	'account.protected': {
		group: 'account',
		label: 'Aviso de dados',
		default: 'Seus dados ficam protegidos'
	},
	'account.error.invalid': {
		group: 'account',
		label: 'Erro: dados inválidos',
		default: 'Confira os dados informados.'
	},
	'account.error.login': {
		group: 'account',
		label: 'Erro: e-mail ou senha',
		default: 'E-mail ou senha incorretos.'
	},
	'account.error.exists': {
		group: 'account',
		label: 'Erro: e-mail já cadastrado',
		default: 'Já existe uma conta com este e-mail. Entre com sua senha.'
	},
	'account.error.phoneTaken': {
		group: 'account',
		label: 'Erro: celular em outra conta',
		default: 'Este celular já está em outra conta.'
	},
	'account.error.unavailable': {
		group: 'account',
		label: 'Erro: login indisponível',
		default: 'Login indisponível no momento.'
	},
	'account.confirmEmail': {
		group: 'account',
		label: 'Aviso: confirme seu e-mail',
		default: 'Enviamos um link para o seu e-mail. Confirme para entrar.'
	},
	'account.mine.title': { group: 'account', label: 'Minha conta: título', default: 'Minha conta' },
	'account.mine.save': { group: 'account', label: 'Botão salvar dados', default: 'Salvar' },
	'account.mine.saved': { group: 'account', label: 'Dados salvos', default: 'Dados salvos.' },
	'account.mine.orders': {
		group: 'account',
		label: 'Título meus pedidos',
		default: 'Meus pedidos'
	},
	'account.mine.noOrders': {
		group: 'account',
		label: 'Sem pedidos',
		default: 'Você ainda não fez pedidos.'
	},
	'account.mine.track': {
		group: 'account',
		label: 'Link acompanhar pedido',
		default: 'Acompanhar'
	},
	'account.mine.logout': { group: 'account', label: 'Botão sair', default: 'Sair' },

	// Notices and errors
	'errors.offline.title': { group: 'errors', label: 'Sem conexão: título', default: 'Sem conexão' },
	'errors.offline': {
		group: 'errors',
		label: 'Sem conexão: mensagem',
		default: 'Você está sem conexão.'
	},
	'errors.retry': { group: 'errors', label: 'Botão de tentar de novo', default: 'Tentar de novo' },
	'errors.generic.title': { group: 'errors', label: 'Erro: título', default: 'Algo deu errado' },
	'errors.generic': {
		group: 'errors',
		label: 'Erro: mensagem',
		default: 'Houve um erro. Por favor, atualize a página.'
	},
	'errors.reload': { group: 'errors', label: 'Botão de atualizar', default: 'Atualizar a página' },
	'errors.notFound.title': {
		group: 'errors',
		label: 'Página não encontrada: título',
		default: 'Página não encontrada'
	},
	'errors.notFound': {
		group: 'errors',
		label: 'Página não encontrada: mensagem',
		default: 'Este endereço não existe ou foi removido.'
	},
	'errors.backToMenu': {
		group: 'errors',
		label: 'Voltar ao cardápio',
		default: 'Voltar ao cardápio'
	},
	'errors.loading': { group: 'errors', label: 'Carregando', default: 'Carregando…' },

	// Header and footer
	'header.home': { group: 'header', label: 'Logo (leitor de tela)', default: '{name}, início' },
	'header.nav.home': { group: 'header', label: 'Menu: Início', default: 'Início' },
	'header.nav.tabs': {
		group: 'header',
		label: 'Abas do celular (leitor de tela)',
		default: 'Navegação'
	},
	'header.nav.menu': { group: 'header', label: 'Menu: Cardápio', default: 'Cardápio' },
	'header.nav.howTo': { group: 'header', label: 'Menu: Como pedir', default: 'Como pedir' },
	'header.nav.howToFull': {
		group: 'header',
		label: 'Menu: Como funciona (desktop)',
		default: 'Como funciona'
	},
	'header.nav.mine': { group: 'header', label: 'Menu: Meus pedidos', default: 'Meus pedidos' },
	'header.order': { group: 'header', label: 'Botão Fazer pedido', default: 'Fazer pedido' },
	'header.nav.track': {
		group: 'header',
		label: 'Menu: Acompanhar pedido',
		default: 'Acompanhar pedido'
	},
	'header.cart': {
		group: 'header',
		label: 'Botão do carrinho (leitor de tela)',
		default: 'Carrinho, {count} {items}'
	},
	'header.closedUntil': {
		group: 'header',
		label: 'Aviso fora do horário',
		default: 'Estamos fechados agora. Abrimos {when}.'
	},
	'header.closed': {
		group: 'header',
		label: 'Aviso de loja fechada',
		default: 'Não estamos aceitando pedidos online agora.'
	},
	'footer.tagline': {
		group: 'header',
		label: 'Frase do rodapé',
		default: 'Burger de verdade é aqui'
	},
	'footer.about': { group: 'header', label: 'Rodapé: Sobre', default: 'Sobre' },
	'footer.allergens': { group: 'header', label: 'Rodapé: Alergênicos', default: 'Alergênicos' },
	'footer.privacy': { group: 'header', label: 'Rodapé: Privacidade', default: 'Privacidade' },
	'footer.delivery': {
		group: 'header',
		label: 'Rodapé: Entrega e trocas',
		default: 'Entrega e trocas'
	},

	// Home
	'home.pageTitle': { group: 'home', label: 'Título da aba', default: '{name} · Cardápio' },
	'home.metaDescription': {
		group: 'home',
		label: 'Descrição para buscadores',
		default: 'Peça seus burgers online para retirada ou entrega.'
	},
	'home.hero.eyebrow': { group: 'home', label: 'Destaque: eyebrow', default: 'Peça no seu ritmo' },
	'home.hero.phoneTitle': {
		group: 'home',
		label: 'Destaque: título no celular',
		default: 'Sua fome merece esse clássico.'
	},
	'home.hero.title': {
		group: 'home',
		label: 'Destaque: título (Enter quebra a linha; a última linha fica amarela)',
		default: 'Feito na chapa.\nFeito pra você.'
	},
	'home.hero.text': {
		group: 'home',
		label: 'Destaque: texto',
		default: 'Burgers suculentos, ingredientes frescos e muito sabor.'
	},
	'home.hero.open': {
		group: 'home',
		label: 'Destaque: selo loja aberta',
		default: '{name} · aberto'
	},
	'home.hero.closed': {
		group: 'home',
		label: 'Destaque: selo loja fechada',
		default: '{name} · fechado'
	},
	'home.hero.secondary': {
		group: 'home',
		label: 'Destaque: segundo botão',
		default: 'Como funciona'
	},
	'home.mode.pickup': { group: 'home', label: 'Modo: retirada', default: 'Retirada' },
	'home.mode.delivery': { group: 'home', label: 'Modo: entrega', default: 'Entrega' },
	'home.mode.dineIn': { group: 'home', label: 'Modo: comer no local', default: 'Comer no local' },
	'home.categoriesTitle': {
		group: 'home',
		label: 'Categorias: título',
		default: 'Categorias'
	},
	'home.seeAll': { group: 'home', label: 'Categorias: ver todas', default: 'Ver todas' },
	'home.featured.eyebrow': {
		group: 'home',
		label: 'Destaques: chamada',
		default: 'Nossos destaques'
	},
	'home.mostOrdered.title': {
		group: 'home',
		label: 'Seção: mais pedidos',
		default: 'Mais pedidos'
	},
	'home.featured.title': {
		group: 'home',
		label: 'Destaques: título',
		default: 'Burgers que todo mundo ama.'
	},
	'home.featured.seeAll': {
		group: 'home',
		label: 'Destaques: ver cardápio',
		default: 'Ver todo o cardápio'
	},
	'home.hero.cta': { group: 'home', label: 'Destaque: botão', default: 'Ver cardápio' },
	'home.menuButton': {
		group: 'home',
		label: 'Destaques: botão Ver cardápio',
		default: 'Ver cardápio'
	},
	'home.hero.prepTime': {
		group: 'home',
		label: 'Destaque: tempo de preparo',
		default: 'Pronto em cerca de {minutes} min'
	},
	'home.badge.both.title': {
		group: 'home',
		label: 'Selo entrega e retirada: título',
		default: 'Delivery e Retirada'
	},
	'home.badge.both.text': {
		group: 'home',
		label: 'Selo entrega e retirada: texto',
		default: 'No conforto da sua casa ou na loja'
	},
	'home.badge.delivery.title': {
		group: 'home',
		label: 'Selo só entrega: título',
		default: 'Delivery'
	},
	'home.badge.delivery.text': {
		group: 'home',
		label: 'Selo só entrega: texto',
		default: 'No conforto da sua casa'
	},
	'home.badge.pickup.title': {
		group: 'home',
		label: 'Selo só retirada: título',
		default: 'Retirada na loja'
	},
	'home.badge.pickup.text': {
		group: 'home',
		label: 'Selo só retirada: texto',
		default: 'Peça agora e retire quentinho'
	},
	'home.badge.pix.title': { group: 'home', label: 'Selo Pix: título', default: 'Pague com Pix' },
	'home.badge.pix.text': {
		group: 'home',
		label: 'Selo Pix: texto',
		default: 'Rápido, seguro e sem complicação'
	},
	'home.categories': {
		group: 'home',
		label: 'Categorias (leitor de tela)',
		default: 'Categorias'
	},
	'home.all': { group: 'home', label: 'Filtro: todos', default: 'Todos' },
	'home.emptyMenu': {
		group: 'home',
		label: 'Cardápio vazio',
		default: 'O cardápio ainda está sendo montado. Volte logo!'
	},
	'home.soldOut': { group: 'home', label: 'Esgotado', default: 'Esgotado' },
	'home.from': { group: 'home', label: 'Preço com opções', default: 'a partir de' },
	'home.closed': { group: 'home', label: 'Botão com loja fechada', default: 'Loja fechada' },
	'home.add': { group: 'home', label: 'Botão de adicionar', default: 'Adicionar ao carrinho' },
	'home.added': { group: 'home', label: 'Botão depois de adicionar', default: 'Adicionado!' },
	'home.howTo.title': { group: 'home', label: 'Como pedir: título', default: 'Como pedir' },
	'home.howTo.1.title': { group: 'home', label: 'Como pedir 1: título', default: 'Escolha' },
	'home.howTo.1.text': {
		group: 'home',
		label: 'Como pedir 1: texto',
		default: 'Monte seu pedido no cardápio e ajuste os adicionais.'
	},
	'home.howTo.2.delivery.title': {
		group: 'home',
		label: 'Como pedir 2 (com entrega): título',
		default: 'Entrega ou retirada'
	},
	'home.howTo.2.delivery.text': {
		group: 'home',
		label: 'Como pedir 2 (com entrega): texto',
		default: 'Informe o CEP para ver a taxa, ou retire na loja.'
	},
	'home.howTo.2.pickup.title': {
		group: 'home',
		label: 'Como pedir 2 (só retirada): título',
		default: 'Retirada'
	},
	'home.howTo.2.pickup.text': {
		group: 'home',
		label: 'Como pedir 2 (só retirada): texto',
		default: 'Passe na loja quando estiver pronto.'
	},
	'home.howTo.3.title': { group: 'home', label: 'Como pedir 3: título', default: 'Acompanhe' },
	'home.howTo.3.text': {
		group: 'home',
		label: 'Como pedir 3: texto',
		default: 'Você recebe um link para seguir o pedido em tempo real.'
	},

	// Menu page
	'menu.pageTitle': { group: 'menu', label: 'Título da aba', default: 'Cardápio · {name}' },
	'menu.title': { group: 'menu', label: 'Título', default: 'Cardápio' },
	'menu.subtitle': {
		group: 'menu',
		label: 'Subtítulo',
		default: 'Sabor brasileiro em cada mordida.'
	},
	'menu.addShort': { group: 'menu', label: 'Botão curto adicionar', default: '+ Adicionar' },
	'menu.search': { group: 'menu', label: 'Busca', default: 'Buscar no cardápio' },
	'menu.noResults': { group: 'menu', label: 'Busca sem resultado', default: 'Nada encontrado.' },

	// Cart
	'cart.title': { group: 'cart', label: 'Título', default: 'Seu pedido' },
	'cart.pageTitle': { group: 'cart', label: 'Título da aba', default: 'Carrinho · {name}' },
	'cart.item': { group: 'cart', label: 'Item (singular)', default: 'item' },
	'cart.items': { group: 'cart', label: 'Itens (plural)', default: 'itens' },
	'cart.view': {
		group: 'cart',
		label: 'Barra do carrinho',
		default: 'Ver carrinho · {count} {items}'
	},
	'cart.close': { group: 'cart', label: 'Fechar carrinho', default: 'Fechar carrinho' },
	'cart.empty': { group: 'cart', label: 'Carrinho vazio', default: 'Seu carrinho está vazio.' },
	'cart.emptyHint': {
		group: 'cart',
		label: 'Carrinho vazio: dica',
		default: 'Escolha um burger e ele aparece aqui.'
	},
	'cart.seeMenu': { group: 'cart', label: 'Botão ver cardápio', default: 'Ver cardápio' },
	'cart.removeOne': {
		group: 'cart',
		label: 'Remover um (leitor de tela)',
		default: 'Remover um {item}'
	},
	'cart.addOne': {
		group: 'cart',
		label: 'Adicionar um (leitor de tela)',
		default: 'Adicionar um {item}'
	},
	'cart.remove': {
		group: 'cart',
		label: 'Tirar do carrinho (leitor de tela)',
		default: 'Tirar {item} do carrinho'
	},
	'cart.subtotal': { group: 'cart', label: 'Subtotal', default: 'Subtotal' },
	'cart.deliveryFee': { group: 'cart', label: 'Taxa de entrega', default: 'Taxa de entrega' },
	'cart.deliveryFeeLater': {
		group: 'cart',
		label: 'Taxa calculada depois',
		default: 'calculada no checkout'
	},
	'cart.total': { group: 'cart', label: 'Total', default: 'Total' },
	'cart.plusDelivery': {
		group: 'cart',
		label: 'Aviso de entrega',
		default: '+ entrega, se houver'
	},
	'cart.nextStepNote': {
		group: 'cart',
		label: 'Aviso na página do carrinho',
		default: 'Taxa de entrega e total final são calculados na próxima etapa.'
	},
	'cart.checkout': { group: 'cart', label: 'Botão de finalizar', default: 'Finalizar pedido' },
	'cart.continue': { group: 'cart', label: 'Botão continuar', default: 'Continuar' },
	'cart.addMore': { group: 'cart', label: 'Adicionar mais itens', default: 'Adicionar mais itens' },
	'cart.closedNow': { group: 'cart', label: 'Loja fechada', default: 'Loja fechada agora' },
	'cart.securePayment': { group: 'cart', label: 'Pagamento seguro', default: 'Pagamento seguro' },
	'cart.pay.pix': { group: 'cart', label: 'Forma de pagamento: Pix', default: 'Pix' },

	// Product
	'product.back': { group: 'product', label: 'Voltar', default: '← Cardápio' },
	'product.contains': { group: 'product', label: 'Alergênicos', default: 'Contém: {list}' },
	'product.required': { group: 'product', label: 'Escolha obrigatória', default: 'Obrigatório' },
	'product.upTo': { group: 'product', label: 'Limite de escolhas', default: 'Até {max}' },
	'product.optionSoldOut': { group: 'product', label: 'Opção esgotada', default: '(esgotado)' },
	'product.removeTitle': {
		group: 'product',
		label: 'Retirar ingredientes: título',
		default: 'Retirar algum ingrediente?'
	},
	'product.optional': { group: 'product', label: 'Escolha opcional', default: 'Opcional' },
	'product.ingredientOut': {
		group: 'product',
		label: 'Ingrediente em falta',
		default: 'acabou hoje, vai sem'
	},
	'product.note': { group: 'product', label: 'Observação', default: 'Alguma observação?' },
	'product.notePlaceholder': {
		group: 'product',
		label: 'Observação: exemplo',
		default: 'Ex.: sem sal na batata'
	},
	'product.missing': { group: 'product', label: 'Falta escolher', default: 'Escolha: {list}.' },
	'product.less': { group: 'product', label: 'Diminuir (leitor de tela)', default: 'Diminuir' },
	'product.more': { group: 'product', label: 'Aumentar (leitor de tela)', default: 'Aumentar' },
	'product.add': { group: 'product', label: 'Botão de adicionar', default: 'Adicionar' },
	'product.soldOut': { group: 'product', label: 'Esgotado', default: 'Esgotado' },
	'product.closed': { group: 'product', label: 'Loja fechada', default: 'Loja fechada' },

	// Checkout
	'checkout.title': { group: 'checkout', label: 'Título', default: 'Finalizar pedido' },
	'checkout.how': {
		group: 'checkout',
		label: 'Como receber',
		default: 'Como você quer receber?'
	},
	'checkout.dineIn': { group: 'checkout', label: 'Comer no local', default: 'Comer aqui' },
	'checkout.table': {
		group: 'checkout',
		label: 'Mesa (comer no local)',
		default: 'Número da mesa (opcional)'
	},
	'checkout.pickup': { group: 'checkout', label: 'Retirada / para viagem', default: 'Para viagem' },
	'checkout.delivery': { group: 'checkout', label: 'Entrega', default: 'Entrega' },
	'checkout.eta': {
		group: 'checkout',
		label: 'Previsão (retirada)',
		default: 'Previsão: cerca de {minutes} min.'
	},
	'checkout.etaDelivery': {
		group: 'checkout',
		label: 'Previsão (entrega)',
		default: 'Previsão: cerca de {minutes} min + deslocamento.'
	},
	'checkout.address': { group: 'checkout', label: 'Endereço', default: 'Endereço' },
	'checkout.cep': { group: 'checkout', label: 'CEP', default: 'CEP' },
	'checkout.neighborhood': { group: 'checkout', label: 'Bairro', default: 'Bairro' },
	'checkout.street': { group: 'checkout', label: 'Rua', default: 'Rua' },
	'checkout.number': { group: 'checkout', label: 'Número', default: 'Número' },
	'checkout.complement': { group: 'checkout', label: 'Complemento', default: 'Complemento' },
	'checkout.city': { group: 'checkout', label: 'Cidade', default: 'Cidade' },
	'checkout.state': { group: 'checkout', label: 'UF', default: 'UF' },
	'checkout.reference': {
		group: 'checkout',
		label: 'Ponto de referência',
		default: 'Ponto de referência'
	},
	'checkout.you': { group: 'checkout', label: 'Seus dados', default: 'Seus dados' },
	'checkout.name': { group: 'checkout', label: 'Nome', default: 'Nome' },
	'checkout.phone': { group: 'checkout', label: 'Celular', default: 'Celular (WhatsApp)' },
	'checkout.phoneOptional': {
		group: 'checkout',
		label: 'Celular no pedido para comer aqui',
		default: 'Celular (opcional)'
	},
	'checkout.phoneOptional.hint': {
		group: 'checkout',
		label: 'Celular opcional: explicação',
		default: 'Para usar cupons e juntar selos.'
	},
	'checkout.email': { group: 'checkout', label: 'E-mail', default: 'E-mail (opcional)' },
	'checkout.marketing': {
		group: 'checkout',
		label: 'Aceite de promoções',
		default:
			'Quero receber promoções por WhatsApp ou e-mail. (Opcional; você pode cancelar quando quiser.)'
	},
	'checkout.privacy': {
		group: 'checkout',
		label: 'Aviso de privacidade',
		default: 'Usamos seus dados apenas para preparar e entregar o pedido. Veja a'
	},
	'checkout.privacyLink': {
		group: 'checkout',
		label: 'Link de privacidade',
		default: 'política de privacidade'
	},
	'checkout.payment': { group: 'checkout', label: 'Pagamento', default: 'Pagamento' },
	'checkout.noPayment': {
		group: 'checkout',
		label: 'Sem forma de pagamento',
		default: 'Nenhuma forma de pagamento disponível no momento.'
	},
	'checkout.method.pix': { group: 'checkout', label: 'Pix', default: 'Pix' },
	'checkout.method.pix.hint': {
		group: 'checkout',
		label: 'Pix automático: explicação',
		default: 'Pague agora com QR Code. O pedido vai para a cozinha assim que o Pix for confirmado.'
	},
	'checkout.method.pixKey.hint': {
		group: 'checkout',
		label: 'Pix na chave da loja: explicação',
		default: 'Pague agora com QR Code. A loja confere o Pix recebido e confirma o pedido.'
	},
	'checkout.method.card': { group: 'checkout', label: 'Cartão online', default: 'Cartão online' },
	'checkout.method.card.hint': {
		group: 'checkout',
		label: 'Cartão online: explicação',
		default: 'Você será levado à página segura do provedor de pagamento.'
	},
	'checkout.summary': { group: 'checkout', label: 'Resumo', default: 'Resumo' },
	'checkout.deliveryLine': { group: 'checkout', label: 'Entrega no resumo', default: 'Entrega' },
	'checkout.calculating': { group: 'checkout', label: 'Calculando', default: 'Calculando…' },
	'checkout.coupon': { group: 'checkout', label: 'Campo de cupom', default: 'Cupom de desconto' },
	'checkout.coupon.apply': { group: 'checkout', label: 'Botão aplicar cupom', default: 'Aplicar' },
	'checkout.coupon.remove': { group: 'checkout', label: 'Botão remover cupom', default: 'Remover' },
	'checkout.discountLine': { group: 'checkout', label: 'Desconto no resumo', default: 'Desconto' },
	'coupon.not_found': {
		group: 'checkout',
		label: 'Cupom: não existe',
		default: 'Cupom não encontrado.'
	},
	'coupon.inactive': {
		group: 'checkout',
		label: 'Cupom: desligado',
		default: 'Este cupom não está valendo.'
	},
	'coupon.not_started': {
		group: 'checkout',
		label: 'Cupom: ainda não começou',
		default: 'Esta promoção ainda não começou.'
	},
	'coupon.expired': { group: 'checkout', label: 'Cupom: expirado', default: 'Este cupom expirou.' },
	'coupon.outside_hours': {
		group: 'checkout',
		label: 'Cupom: fora do horário',
		default: 'Esta promoção não vale neste horário.'
	},
	'coupon.min_order': {
		group: 'checkout',
		label: 'Cupom: pedido mínimo',
		default: 'Esta promoção vale para pedidos a partir de {amount}.'
	},
	'coupon.needs_customer': {
		group: 'checkout',
		label: 'Cupom: precisa do telefone',
		default: 'Este cupom precisa do telefone do cliente.'
	},
	'coupon.other_customer': {
		group: 'checkout',
		label: 'Cupom: de outra pessoa',
		default: 'Este cupom é de outra pessoa.'
	},
	'coupon.used_up': {
		group: 'checkout',
		label: 'Cupom: esgotado',
		default: 'Este cupom já foi usado o máximo de vezes.'
	},
	'coupon.already_used': {
		group: 'checkout',
		label: 'Cupom: já usado pelo cliente',
		default: 'Você já usou este cupom.'
	},
	'coupon.first_order_only': {
		group: 'checkout',
		label: 'Cupom: só primeiro pedido',
		default: 'Este cupom vale só no primeiro pedido.'
	},
	'coupon.delivery_only': {
		group: 'checkout',
		label: 'Cupom: frete grátis sem entrega',
		default: 'Frete grátis vale só para entrega.'
	},
	'coupon.needs_more_items': {
		group: 'checkout',
		label: 'Cupom: faltam itens',
		default: 'Adicione mais itens da promoção para ganhar o desconto.'
	},
	'coupon.no_reward_item': {
		group: 'checkout',
		label: 'Cupom: falta o brinde no carrinho',
		default: 'Adicione ao carrinho o item que vem de brinde.'
	},
	'coupon.better_offer': {
		group: 'checkout',
		label: 'Cupom: já há promoção melhor',
		default: 'Você já tem uma promoção melhor aplicada.'
	},
	'checkout.enterCep': {
		group: 'checkout',
		label: 'Pedir CEP',
		default: 'Informe o CEP para calcular a entrega.'
	},
	'checkout.sending': { group: 'checkout', label: 'Enviando', default: 'Enviando…' },
	'checkout.goPay': {
		group: 'checkout',
		label: 'Botão ir para o pagamento',
		default: 'Ir para o pagamento'
	},
	'checkout.noHiddenFees': {
		group: 'checkout',
		label: 'Aviso de total',
		default: 'Sem taxas escondidas: o total acima é o valor final.'
	},
	'checkout.error.review': {
		group: 'checkout',
		label: 'Erro: dados do pedido',
		default: 'Revise os dados do pedido.'
	},
	'checkout.error.tooMany': {
		group: 'checkout',
		label: 'Erro: muitas tentativas',
		default: 'Muitas tentativas. Aguarde alguns minutos.'
	},
	'checkout.error.phone': {
		group: 'checkout',
		label: 'Erro: telefone',
		default: 'Telefone inválido. Use DDD + número.'
	},
	'checkout.error.address': {
		group: 'checkout',
		label: 'Erro: endereço',
		default: 'Informe o endereço de entrega.'
	},
	'checkout.error.noDelivery': {
		group: 'checkout',
		label: 'Erro: fora da área de entrega',
		default: 'Ainda não entregamos neste endereço.'
	},
	'checkout.error.minOrder': {
		group: 'checkout',
		label: 'Erro: pedido mínimo',
		default: 'Pedido mínimo para este endereço: {amount}.'
	},
	'checkout.error.pix': {
		group: 'checkout',
		label: 'Erro: Pix indisponível',
		default: 'Pix indisponível no momento.'
	},
	'checkout.error.online': {
		group: 'checkout',
		label: 'Erro: pagamento online indisponível',
		default: 'Pagamento online indisponível no momento.'
	},

	// Payment
	'payment.pageTitle': {
		group: 'payment',
		label: 'Título da aba',
		default: 'Pagamento do pedido #{number}'
	},
	'payment.order': { group: 'payment', label: 'Número do pedido', default: 'Pedido #{number}' },
	'payment.total': { group: 'payment', label: 'Total', default: 'Total:' },
	'payment.failed': {
		group: 'payment',
		label: 'Pagamento não concluído',
		default: 'O pagamento não foi concluído. Faça o pedido novamente.'
	},
	'payment.instructions.shop': {
		group: 'payment',
		label: 'Instruções Pix (chave da loja)',
		default:
			'Abra o app do seu banco e pague com Pix. A loja confere o pagamento e confirma o pedido.'
	},
	'payment.instructions.auto': {
		group: 'payment',
		label: 'Instruções Pix (automático)',
		default: 'Abra o app do seu banco e pague com Pix. A confirmação é automática.'
	},
	'payment.copy': {
		group: 'payment',
		label: 'Botão copiar código',
		default: 'Copiar código Pix (copia e cola)'
	},
	'payment.copied': { group: 'payment', label: 'Código copiado', default: 'Código copiado!' },
	'payment.expires': { group: 'payment', label: 'Prazo', default: 'Expira em {time}' },
	'payment.waiting.shop': {
		group: 'payment',
		label: 'Aguardando (chave da loja)',
		default: 'Aguardando a loja confirmar o Pix…'
	},
	'payment.waiting.auto': {
		group: 'payment',
		label: 'Aguardando (automático)',
		default: 'Aguardando confirmação do pagamento…'
	},
	'payment.track': {
		group: 'payment',
		label: 'Acompanhar o pedido',
		default: 'Acompanhar o pedido'
	},
	'payment.card': {
		group: 'payment',
		label: 'Ir para o cartão',
		default: 'Ir para o pagamento com cartão'
	},

	// Order tracking
	'order.pageTitle': { group: 'order', label: 'Título da aba', default: 'Pedido #{number}' },
	'order.sent': {
		group: 'order',
		label: 'Pedido enviado',
		default: 'Pedido enviado! Guarde este link para acompanhar.'
	},
	'order.label': { group: 'order', label: 'Rótulo do número', default: 'Pedido' },
	'order.eta': { group: 'order', label: 'Previsão', default: 'Previsão: {time}' },
	'order.track.title': { group: 'order', label: 'Título', default: 'Acompanhe seu pedido' },
	'order.track.subtitle': {
		group: 'order',
		label: 'Subtítulo',
		default: 'Veja em tempo real o status do seu pedido.'
	},
	'order.track.orderNumber': {
		group: 'order',
		label: 'Número do pedido',
		default: 'Pedido #{number}'
	},
	'order.track.waitingPayment': {
		group: 'order',
		label: 'Aguardando pagamento',
		default: 'Aguardando pagamento. A loja começa o pedido assim que o pagamento for confirmado.'
	},
	'order.track.hintPreparing': {
		group: 'order',
		label: 'Dica: em preparo',
		default: 'Na cozinha agora'
	},
	'order.track.hintReady': {
		group: 'order',
		label: 'Dica: pronto',
		default: 'Avisamos quando ficar pronto'
	},
	'order.track.etaMinutes': {
		group: 'order',
		label: 'Previsão em minutos',
		default: 'Pronto em cerca de {min} min'
	},
	'order.track.etaSoon': {
		group: 'order',
		label: 'Previsão: quase pronto',
		default: 'Quase pronto'
	},
	'order.track.itemsTitle': {
		group: 'order',
		label: 'Título dos itens',
		default: 'Itens do pedido'
	},
	'order.track.menuCta': { group: 'order', label: 'Botão ver cardápio', default: 'Ver cardápio' },
	'order.cancelled': {
		group: 'order',
		label: 'Pedido cancelado',
		default: 'Este pedido foi cancelado. Se você já pagou, o estorno é feito pela loja.'
	},
	'order.progress': {
		group: 'order',
		label: 'Andamento (leitor de tela)',
		default: 'Andamento do pedido'
	},
	'order.step.new': { group: 'order', label: 'Etapa: recebido', default: 'Recebido' },
	'order.step.confirmed': { group: 'order', label: 'Etapa: confirmado', default: 'Confirmado' },
	'order.step.preparing': { group: 'order', label: 'Etapa: em preparo', default: 'Em preparo' },
	'order.step.out': {
		group: 'order',
		label: 'Etapa: saiu para entrega',
		default: 'Saiu para entrega'
	},
	'order.step.ready': {
		group: 'order',
		label: 'Etapa: pronto para retirar',
		default: 'Pronto para retirar'
	},
	'order.step.completed': { group: 'order', label: 'Etapa: concluído', default: 'Concluído' },
	'order.delivery': { group: 'order', label: 'Entrega', default: 'Entrega' },
	'order.discount': { group: 'order', label: 'Desconto', default: 'Desconto' },
	'order.total': { group: 'order', label: 'Total', default: 'Total' },
	'order.payment': { group: 'order', label: 'Pagamento', default: 'Pagamento' },
	'order.payPix': { group: 'order', label: 'Botão pagar com Pix', default: 'Pagar com Pix' },
	'order.codeLabel': { group: 'order', label: 'Rótulo da senha', default: 'Sua senha' },
	'order.readyPickup': {
		group: 'order',
		label: 'Pedido pronto (retirada no balcão)',
		default: 'Pronto! Retire no balcão com a senha #{number}.'
	},
	'order.readyTabTitle': {
		group: 'order',
		label: 'Título da aba quando pronto',
		default: '✅ Pronto! #{number}'
	},
	'order.notify.cta': {
		group: 'order',
		label: 'Aviso de pronto: botão',
		default: 'Avisar quando ficar pronto'
	},
	'order.notify.text': {
		group: 'order',
		label: 'Aviso de pronto: explicação',
		default: 'Mandamos uma notificação neste celular.'
	},
	'order.notify.on': {
		group: 'order',
		label: 'Aviso de pronto: ligado',
		default: 'Aviso ligado. Pode sentar, a gente avisa.'
	},
	'order.notify.ios': {
		group: 'order',
		label: 'Aviso de pronto: dica para iPhone',
		default:
			'No iPhone, toque em Compartilhar → Adicionar à Tela de Início para receber o aviso. Ou deixe esta página aberta.'
	},
	'order.notify.blocked': {
		group: 'order',
		label: 'Aviso de pronto: notificações bloqueadas',
		default:
			'Notificações bloqueadas neste celular. Deixe esta página aberta ou fique de olho na TV.'
	},
	'order.notify.unsupported': {
		group: 'order',
		label: 'Aviso de pronto: sem suporte',
		default: 'Deixe esta página aberta: ela apita quando ficar pronto.'
	},
	'push.ready.title': {
		group: 'order',
		label: 'Notificação de pronto: título',
		default: 'Seu pedido está pronto!'
	},
	'push.ready.body': {
		group: 'order',
		label: 'Notificação de pronto: texto',
		default: 'Retire no balcão com a senha #{number}.'
	},

	// Staff screens (kitchen and orders)
	'staff.offline': {
		group: 'staff',
		label: 'Sem conexão',
		default: 'Você está sem conexão.'
	},
	'staff.polling': {
		group: 'staff',
		label: 'Atualização ao vivo indisponível',
		default: 'Atualizando a cada 8 s (última {time}).'
	},
	'kitchen.lane.new': { group: 'staff', label: 'Quadro: coluna novos', default: 'Novos' },
	'kitchen.lane.preparing': {
		group: 'staff',
		label: 'Quadro: coluna em preparo',
		default: 'Preparando'
	},
	'kitchen.lane.ready': { group: 'staff', label: 'Quadro: coluna prontos', default: 'Pronto' },
	'kitchen.rule.confirmed': {
		group: 'staff',
		label: 'Quadro: regra coluna novos',
		default: 'Ainda não iniciados. Toque em Visto para marcar que viu.'
	},
	'kitchen.rule.preparing': {
		group: 'staff',
		label: 'Quadro: regra coluna em preparo',
		default: 'Em produção agora.'
	},
	'kitchen.rule.ready': {
		group: 'staff',
		label: 'Quadro: regra coluna prontos',
		default: 'Aguardando retirada. Chame o cliente pelo código.'
	},
	'kitchen.waiting': {
		group: 'staff',
		label: 'Quadro: pronto há mais de 10 min',
		default: 'Aguardando retirada'
	},
	'kitchen.empty': { group: 'staff', label: 'Quadro: coluna vazia', default: 'Vazio' },
	'staff.call': { group: 'staff', label: 'Botão chamar pedido pronto', default: 'Chamar' },
	'staff.called': {
		group: 'staff',
		label: 'Pedido já chamado',
		default: 'Chamado às {time}'
	}
} as const satisfies Record<string, TextDef>;

export type TextKey = keyof typeof TEXTS;
export type Texts = Record<TextKey, string>;

export function isTextKey(key: string): key is TextKey {
	return Object.hasOwn(TEXTS, key);
}

export function defaultTexts(): Texts {
	return Object.fromEntries(Object.entries(TEXTS).map(([k, d]) => [k, d.default])) as Texts;
}

const PLACEHOLDER = /\{(\w+)\}/g;

/** The {names} a text needs, e.g. ['name'] for "{name}, início". */
export function placeholders(text: string): string[] {
	return [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))].sort();
}

/** Fills {names} in a text; unknown names are left as they are. */
export function fill(text: string, vars: Record<string, string | number> = {}): string {
	return text.replace(PLACEHOLDER, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
