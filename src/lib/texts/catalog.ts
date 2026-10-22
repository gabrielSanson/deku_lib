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
	'account.tagline': {
		group: 'account',
		label: 'Entrar: frase sobre a foto',
		default: 'Mais que burgers.\nÉ a nossa essência.'
	},
	'account.emailPlaceholder': {
		group: 'account',
		label: 'Exemplo no campo e-mail',
		default: 'seu@email.com'
	},
	'account.passwordPlaceholder': {
		group: 'account',
		label: 'Exemplo no campo senha',
		default: 'Sua senha'
	},
	'account.showPassword': {
		group: 'account',
		label: 'Botão mostrar senha',
		default: 'Mostrar senha'
	},
	'account.hidePassword': {
		group: 'account',
		label: 'Botão ocultar senha',
		default: 'Ocultar senha'
	},
	'account.noAccount': {
		group: 'account',
		label: 'Entrar: convite para criar conta',
		default: 'Ainda não tem conta?'
	},
	'account.haveAccount': {
		group: 'account',
		label: 'Criar conta: convite para entrar',
		default: 'Já tem conta?'
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
	'header.nav.mine': { group: 'header', label: 'Menu: Meus pedidos', default: 'Meus pedidos' },
	'header.order': { group: 'header', label: 'Botão Fazer pedido', default: 'Fazer pedido' },
	'header.nav.track': {
		group: 'header',
		label: 'Menu: Acompanhar pedido',
		default: 'Acompanhar pedido'
	},
	'header.tab.track': { group: 'header', label: 'Aba Pedidos (celular)', default: 'Pedidos' },
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

	// Menu page
	'menu.pageTitle': { group: 'menu', label: 'Título da aba', default: 'Cardápio · {name}' },
	'menu.title': { group: 'menu', label: 'Título', default: 'Nosso cardápio' },
	'menu.subtitle': {
		group: 'menu',
		label: 'Subtítulo',
		default: 'Sabor brasileiro em cada mordida.'
	},
	'menu.addShort': { group: 'menu', label: 'Botão curto adicionar', default: 'Adicionar' },
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
	'order.track.etaLabel': {
		group: 'order',
		label: 'Previsão: rótulo',
		default: 'Pronto em cerca de'
	},
	'order.track.etaMinutes': {
		group: 'order',
		label: 'Previsão em minutos',
		default: '{min} min'
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
	'kitchen.title': { group: 'staff', label: 'Cozinha: título', default: 'Cozinha' },
	'dash.greeting.morning': {
		group: 'staff',
		label: 'Início: saudação da manhã',
		default: 'Bom dia'
	},
	'dash.greeting.afternoon': {
		group: 'staff',
		label: 'Início: saudação da tarde',
		default: 'Boa tarde'
	},
	'dash.greeting.evening': {
		group: 'staff',
		label: 'Início: saudação da noite',
		default: 'Boa noite'
	},
	'dash.greetingTeam': {
		group: 'staff',
		label: 'Início: título com saudação',
		default: '{greeting}, equipe'
	},
	'dash.tile.orders': {
		group: 'staff',
		label: 'Início: cartão de pedidos',
		default: 'Pedidos hoje'
	},
	'dash.tile.ordersHint': {
		group: 'staff',
		label: 'Início: detalhe do cartão de pedidos',
		default: '{n} no total, com cancelados'
	},
	'dash.tile.gross': {
		group: 'staff',
		label: 'Início: cartão de vendas',
		default: 'Vendas brutas'
	},
	'dash.tile.net': {
		group: 'staff',
		label: 'Início: detalhe do cartão de vendas',
		default: 'Líquido {value}'
	},
	'dash.tile.preparing': {
		group: 'staff',
		label: 'Início: cartão em preparo',
		default: 'Em preparo'
	},
	'dash.tile.preparingHint': {
		group: 'staff',
		label: 'Início: detalhe do cartão em preparo',
		default: 'de {n} pedidos'
	},
	'dash.tile.time': {
		group: 'staff',
		label: 'Início: cartão de tempo médio',
		default: 'Tempo médio'
	},
	'dash.tile.timeHint': {
		group: 'staff',
		label: 'Início: detalhe do tempo médio',
		default: 'do confirmado ao pronto'
	},
	'dash.vsYesterday': {
		group: 'staff',
		label: 'Início: comparação com ontem',
		default: 'vs. ontem'
	},
	'dash.shortcut.new': {
		group: 'staff',
		label: 'Início: atalho novo pedido',
		default: 'Novo pedido'
	},
	'dash.shortcut.menu': {
		group: 'staff',
		label: 'Início: atalho cardápio',
		default: 'Ver cardápio'
	},
	'dash.shortcut.reports': {
		group: 'staff',
		label: 'Início: atalho relatórios',
		default: 'Relatórios'
	},
	'dash.shortcut.team': {
		group: 'staff',
		label: 'Início: atalho equipe',
		default: 'Equipe'
	},
	'dash.channel.site': {
		group: 'staff',
		label: 'Início: canal site',
		default: 'Site'
	},
	'dash.channel.pickup': {
		group: 'staff',
		label: 'Início: canal retirada',
		default: 'Retirada'
	},
	'dash.channel.delivery': {
		group: 'staff',
		label: 'Início: canal entrega',
		default: 'Entrega'
	},
	'dash.channel.table': {
		group: 'staff',
		label: 'Início: canal mesa',
		default: 'Mesa'
	},
	'dash.hourly': {
		group: 'staff',
		label: 'Início: título do gráfico',
		default: 'Hoje, hora a hora'
	},
	'dash.adminOnly': {
		group: 'staff',
		label: 'Início: gráfico sem permissão',
		default: 'Os números de vendas são vistos pelo admin.'
	},
	'dash.now': {
		group: 'staff',
		label: 'Início: título Agora',
		default: 'Agora'
	},
	'dash.viewOrders': {
		group: 'staff',
		label: 'Início: link ver pedidos',
		default: 'Ver pedidos'
	},
	'dash.inProduction': {
		group: 'staff',
		label: 'Início: seção em produção',
		default: 'Em produção'
	},
	'dash.late': {
		group: 'staff',
		label: 'Início: selo em atraso',
		default: 'Em atraso'
	},
	'dash.noneLate': {
		group: 'staff',
		label: 'Início: nada atrasado',
		default: 'Nenhum pedido atrasado.'
	},
	'dash.awaitPay': {
		group: 'staff',
		label: 'Início: seção aguardando pagamento',
		default: 'Aguardando pagamento'
	},
	'dash.payment': {
		group: 'staff',
		label: 'Início: selo pagamento',
		default: 'Pagamento'
	},
	'dash.awaitConfirm': {
		group: 'staff',
		label: 'Início: seção aguardando confirmação',
		default: 'Aguardando confirmação'
	},
	'dash.storeStatus': {
		group: 'staff',
		label: 'Início: título status da loja',
		default: 'Status da loja'
	},
	'dash.open': {
		group: 'staff',
		label: 'Início: loja aberta',
		default: 'Aberta'
	},
	'dash.closed': {
		group: 'staff',
		label: 'Início: loja fechada',
		default: 'Fechada'
	},
	'dash.inHours': {
		group: 'staff',
		label: 'Início: dentro do horário',
		default: 'Dentro do horário de funcionamento'
	},
	'dash.outHours': {
		group: 'staff',
		label: 'Início: fora do horário',
		default: 'Fora do horário de funcionamento'
	},
	'dash.closeStore': {
		group: 'staff',
		label: 'Início: botão fechar loja',
		default: 'Fechar loja'
	},
	'dash.closedByTeam': {
		group: 'staff',
		label: 'Início: motivo padrão ao fechar',
		default: 'Fechado pela equipe'
	},
	'dash.openStore': {
		group: 'staff',
		label: 'Início: botão abrir loja',
		default: 'Abrir loja'
	},
	'dash.tableLabel': {
		group: 'staff',
		label: 'Início: rótulo de mesa',
		default: 'Mesa {label}'
	},
	'dash.clock': {
		group: 'staff',
		label: 'Início: rótulo do relógio',
		default: 'Hora atual'
	},
	'dash.summary': {
		group: 'staff',
		label: 'Início: rótulo do resumo',
		default: 'Resumo do dia'
	},
	'dash.shortcuts': {
		group: 'staff',
		label: 'Início: rótulo dos atalhos',
		default: 'Atalhos'
	},
	'orders.tab.active': {
		group: 'staff',
		label: 'Pedidos: aba em andamento',
		default: 'Em andamento'
	},
	'orders.tab.new': {
		group: 'staff',
		label: 'Pedidos: aba novos',
		default: 'Novos'
	},
	'orders.tab.open': {
		group: 'staff',
		label: 'Pedidos: aba em produção',
		default: 'Em produção'
	},
	'orders.tab.ready': {
		group: 'staff',
		label: 'Pedidos: aba prontos',
		default: 'Prontos'
	},
	'orders.tab.done': {
		group: 'staff',
		label: 'Pedidos: aba concluídos',
		default: 'Concluídos'
	},
	'orders.tab.cancelled': {
		group: 'staff',
		label: 'Pedidos: aba cancelados',
		default: 'Cancelados'
	},
	'orders.tab.all': {
		group: 'staff',
		label: 'Pedidos: aba histórico',
		default: 'Histórico'
	},
	'orders.channel.all': {
		group: 'staff',
		label: 'Pedidos: filtro todos os canais',
		default: 'Todos os canais'
	},
	'orders.channel.counter': {
		group: 'staff',
		label: 'Pedidos: canal balcão',
		default: 'Balcão'
	},
	'orders.channel.web': {
		group: 'staff',
		label: 'Pedidos: canal site',
		default: 'Site'
	},
	'orders.channel.ifood': {
		group: 'staff',
		label: 'Pedidos: canal iFood',
		default: 'iFood'
	},
	'orders.lane.new': {
		group: 'staff',
		label: 'Pedidos: coluna novos',
		default: 'Novos'
	},
	'orders.lane.newHint': {
		group: 'staff',
		label: 'Pedidos: dica da coluna novos',
		default: 'Aguardando início de preparo'
	},
	'orders.lane.preparing': {
		group: 'staff',
		label: 'Pedidos: coluna em preparo',
		default: 'Em preparo'
	},
	'orders.lane.preparingHint': {
		group: 'staff',
		label: 'Pedidos: dica da coluna em preparo',
		default: 'Pedidos em produção na cozinha'
	},
	'orders.lane.ready': {
		group: 'staff',
		label: 'Pedidos: coluna prontos',
		default: 'Prontos'
	},
	'orders.lane.readyHint': {
		group: 'staff',
		label: 'Pedidos: dica da coluna prontos',
		default: 'Aguardando retirada ou entrega'
	},
	'orders.subtitle': {
		group: 'staff',
		label: 'Pedidos: subtítulo',
		default: 'Acompanhe cada pedido da entrada até a retirada.'
	},
	'orders.updated': {
		group: 'staff',
		label: 'Pedidos: atualizado',
		default: 'Atualizado agora'
	},
	'orders.filter': {
		group: 'staff',
		label: 'Pedidos: rótulo das abas',
		default: 'Filtrar pedidos'
	},
	'orders.searchLabel': {
		group: 'staff',
		label: 'Pedidos: rótulo da busca',
		default: 'Buscar pedido'
	},
	'orders.searchPlaceholder': {
		group: 'staff',
		label: 'Pedidos: busca',
		default: 'Nº do pedido, cliente ou mesa'
	},
	'orders.channelLabel': {
		group: 'staff',
		label: 'Pedidos: rótulo do canal',
		default: 'Canal'
	},
	'orders.startPrep': {
		group: 'staff',
		label: 'Pedidos: botão iniciar preparo',
		default: 'Iniciar preparo'
	},
	'orders.laneEmpty': {
		group: 'staff',
		label: 'Pedidos: coluna vazia',
		default: 'Nenhum pedido aqui.'
	},
	'orders.filterEmpty': {
		group: 'staff',
		label: 'Pedidos: tabela vazia',
		default: 'Nenhum pedido neste filtro.'
	},
	'orders.col.number': {
		group: 'staff',
		label: 'Pedidos: cabeçalho número',
		default: 'Nº'
	},
	'orders.col.status': {
		group: 'staff',
		label: 'Pedidos: cabeçalho status',
		default: 'Status'
	},
	'orders.col.channel': {
		group: 'staff',
		label: 'Pedidos: cabeçalho canal',
		default: 'Canal'
	},
	'orders.col.customer': {
		group: 'staff',
		label: 'Pedidos: cabeçalho cliente',
		default: 'Cliente'
	},
	'orders.col.items': {
		group: 'staff',
		label: 'Pedidos: cabeçalho itens',
		default: 'Itens'
	},
	'orders.col.payment': {
		group: 'staff',
		label: 'Pedidos: cabeçalho pagamento',
		default: 'Pagamento'
	},
	'orders.col.total': {
		group: 'staff',
		label: 'Pedidos: cabeçalho total',
		default: 'Total'
	},
	'orders.col.promised': {
		group: 'staff',
		label: 'Pedidos: cabeçalho prometido',
		default: 'Prometido'
	},
	'orders.col.age': {
		group: 'staff',
		label: 'Pedidos: cabeçalho idade',
		default: 'Idade'
	},
	'orders.itemsCount': {
		group: 'staff',
		label: 'Pedidos: contagem de itens',
		default: '{n} itens'
	},
	'orders.title': {
		group: 'staff',
		label: 'Pedidos: título',
		default: 'Pedidos'
	},
	'orders.tabTitle': {
		group: 'staff',
		label: 'Pedidos: título da aba do navegador',
		default: 'Pedidos · Equipe'
	},
	'orderDetail.back': {
		group: 'staff',
		label: 'Pedido: voltar',
		default: '← Pedidos'
	},
	'orderDetail.channelWeb': {
		group: 'staff',
		label: 'Pedido: canal site',
		default: 'Site'
	},
	'orderDetail.channelCounter': {
		group: 'staff',
		label: 'Pedido: canal balcão',
		default: 'Balcão'
	},
	'orderDetail.channelIfood': {
		group: 'staff',
		label: 'Pedido: canal iFood',
		default: 'iFood {id}'
	},
	'orderDetail.ifoodCourier': {
		group: 'staff',
		label: 'Pedido: entregador iFood',
		default: '(entregador iFood)'
	},
	'orderDetail.meta': {
		group: 'staff',
		label: 'Pedido: linha de informações',
		default: '{channel} · {fulfillment} {courier}· criado {created} · prometido {promised}'
	},
	'orderDetail.reason': {
		group: 'staff',
		label: 'Pedido: motivo do cancelamento',
		default: 'Motivo: {reason}'
	},
	'orderDetail.promo': {
		group: 'staff',
		label: 'Pedido: linha de promoção',
		default: 'Promoção'
	},
	'orderDetail.allergy': {
		group: 'staff',
		label: 'Pedido: alerta de alergia',
		default: '⚠ Alergia / atenção'
	},
	'orderDetail.subtotal': {
		group: 'staff',
		label: 'Pedido: subtotal',
		default: 'Subtotal'
	},
	'orderDetail.discount': {
		group: 'staff',
		label: 'Pedido: desconto',
		default: 'Desconto'
	},
	'orderDetail.delivery': {
		group: 'staff',
		label: 'Pedido: taxa de entrega',
		default: 'Entrega'
	},
	'orderDetail.total': {
		group: 'staff',
		label: 'Pedido: total',
		default: 'Total'
	},
	'orderDetail.address': {
		group: 'staff',
		label: 'Pedido: título endereço',
		default: 'Endereço'
	},
	'orderDetail.cep': {
		group: 'staff',
		label: 'Pedido: cidade e CEP',
		default: '{city}/{state} · CEP {cep}'
	},
	'orderDetail.history': {
		group: 'staff',
		label: 'Pedido: título histórico',
		default: 'Histórico'
	},
	'orderDetail.pushFailed': {
		group: 'staff',
		label: 'Pedido: aviso push falhou',
		default: 'Aviso não entregue: o celular do cliente não recebeu a notificação de pronto.'
	},
	'orderDetail.payments': {
		group: 'staff',
		label: 'Pedido: título pagamentos',
		default: 'Pagamentos'
	},
	'orderDetail.refundReason': {
		group: 'staff',
		label: 'Pedido: campo motivo do estorno',
		default: 'Motivo do estorno'
	},
	'orderDetail.refundConfirm': {
		group: 'staff',
		label: 'Pedido: botão confirmar estorno',
		default: 'Confirmar estorno'
	},
	'orderDetail.refund': {
		group: 'staff',
		label: 'Pedido: botão estornar',
		default: 'Estornar'
	},
	'orderDetail.noPayments': {
		group: 'staff',
		label: 'Pedido: sem pagamentos',
		default: 'Nenhum pagamento registrado.'
	},
	'orderDetail.receivePay': {
		group: 'staff',
		label: 'Pedido: botão receber pagamento',
		default: 'Receber pagamento'
	},
	'orderDetail.registerPix': {
		group: 'staff',
		label: 'Pedido: botão registrar Pix',
		default: 'Registrar Pix recebido'
	},
	'orderDetail.detailTitle': {
		group: 'staff',
		label: 'Pedido: título da aba',
		default: 'Pedido #{n}'
	},
	'theme.toLight': {
		group: 'header',
		label: 'Tema: botão para o modo claro',
		default: 'Mudar para o modo claro'
	},
	'theme.toDark': {
		group: 'header',
		label: 'Tema: botão para o modo escuro',
		default: 'Mudar para o modo escuro'
	},
	'unsaved.confirm': {
		group: 'staff',
		label: 'Editor: aviso ao sair sem salvar',
		default: 'Sair sem salvar? As alterações feitas aqui se perdem.'
	},
	'kitchen.back': { group: 'staff', label: 'Cozinha: voltar ao painel', default: '← Painel' },
	'kitchen.logout': { group: 'staff', label: 'Cozinha: sair', default: 'Sair' },
	'kitchen.station': { group: 'staff', label: 'Cozinha: estações', default: 'Estação' },
	'kitchen.station.all': { group: 'staff', label: 'Cozinha: estação todas', default: 'Todos' },
	'kitchen.station.grill': { group: 'staff', label: 'Cozinha: estação chapa', default: 'Chapa' },
	'kitchen.station.fryer': {
		group: 'staff',
		label: 'Cozinha: estação fritadeira',
		default: 'Fritadeira'
	},
	'kitchen.station.counter': {
		group: 'staff',
		label: 'Cozinha: estação balcão',
		default: 'Balcão'
	},
	'kitchen.updated': {
		group: 'staff',
		label: 'Cozinha: hora da última atualização',
		default: 'Atualizado {time}'
	},
	'kitchen.sound.on': { group: 'staff', label: 'Cozinha: som ligado', default: '🔔 Som ligado' },
	'kitchen.sound.off': {
		group: 'staff',
		label: 'Cozinha: som desligado',
		default: '🔇 Som desligado'
	},
	'kitchen.action.start': {
		group: 'staff',
		label: 'Cozinha: botão iniciar preparo',
		default: 'Iniciar preparo'
	},
	'kitchen.action.ready': {
		group: 'staff',
		label: 'Cozinha: botão marcar pronto',
		default: 'Marcar pronto'
	},
	'kitchen.action.delivered': {
		group: 'staff',
		label: 'Cozinha: botão entregue',
		default: 'Entregue'
	},
	'staff.call': { group: 'staff', label: 'Botão chamar pedido pronto', default: 'Chamar' },
	'staff.called': {
		group: 'staff',
		label: 'Pedido já chamado',
		default: 'Chamado às {time}'
	},
	// Staff setup wizard
	'setup.title': { group: 'staff', label: 'Configuração: título', default: 'Configurar a loja' },
	'setup.pageTitle': {
		group: 'staff',
		label: 'Configuração: título da aba',
		default: 'Configuração · {step}'
	},
	'setup.step.loja': { group: 'staff', label: 'Configuração: etapa Loja', default: 'Loja' },
	'setup.step.cardapio': {
		group: 'staff',
		label: 'Configuração: etapa Cardápio',
		default: 'Cardápio'
	},
	'setup.step.entrega': {
		group: 'staff',
		label: 'Configuração: etapa Entrega',
		default: 'Retirada e entrega'
	},
	'setup.step.equipe': { group: 'staff', label: 'Configuração: etapa Equipe', default: 'Equipe' },
	'setup.step.pagamentos': {
		group: 'staff',
		label: 'Configuração: etapa Pagamentos',
		default: 'Pagamentos'
	},
	'setup.step.ifood': { group: 'staff', label: 'Configuração: etapa iFood', default: 'iFood' },
	'setup.step.concluir': {
		group: 'staff',
		label: 'Configuração: etapa Concluir',
		default: 'Concluir'
	},
	'setup.next': {
		group: 'staff',
		label: 'Configuração: botão salvar e continuar',
		default: 'Salvar e continuar'
	},
	'setup.prev': { group: 'staff', label: 'Configuração: link voltar', default: '← {step}' },
	'setup.nextLink': { group: 'staff', label: 'Configuração: link avançar', default: '{step} →' },
	'setup.loja.title': { group: 'staff', label: 'Loja: título', default: 'Dados da loja' },
	'setup.loja.hint': {
		group: 'staff',
		label: 'Loja: texto de ajuda',
		default: 'Aparecem no site, no app instalado e nos comprovantes.'
	},
	'setup.loja.name': { group: 'staff', label: 'Loja: campo nome', default: 'Nome da loja' },
	'setup.loja.phone': {
		group: 'staff',
		label: 'Loja: campo telefone',
		default: 'Telefone ou WhatsApp'
	},
	'setup.loja.phonePh': {
		group: 'staff',
		label: 'Loja: exemplo telefone',
		default: '(11) 99999-9999'
	},
	'setup.loja.city': { group: 'staff', label: 'Loja: campo cidade', default: 'Cidade' },
	'setup.loja.cityPh': { group: 'staff', label: 'Loja: exemplo cidade', default: 'São Paulo' },
	'setup.loja.address': {
		group: 'staff',
		label: 'Loja: campo endereço',
		default: 'Endereço para retirada'
	},
	'setup.loja.addressPh': {
		group: 'staff',
		label: 'Loja: exemplo endereço',
		default: 'Rua Exemplo, 123 - Centro'
	},
	'setup.menu.title': { group: 'staff', label: 'Cardápio: título', default: 'Cardápio' },
	'setup.menu.count': {
		group: 'staff',
		label: 'Cardápio: contagem',
		default: '{products} produto(s) em {categories} categoria(s).'
	},
	'setup.menu.empty': {
		group: 'staff',
		label: 'Cardápio: vazio',
		default:
			'O cardápio está vazio. Cadastre categorias, produtos, fotos e adicionais no editor, ou comece pelo exemplo e ajuste.'
	},
	'setup.menu.sample': {
		group: 'staff',
		label: 'Cardápio: botão exemplo',
		default: 'Carregar cardápio de exemplo'
	},
	'setup.menu.editor': {
		group: 'staff',
		label: 'Cardápio: botão editor',
		default: 'Abrir o editor de cardápio'
	},
	'setup.menu.tip': {
		group: 'staff',
		label: 'Cardápio: dica SKU',
		default:
			'Dica: cada produto tem um código (SKU). Se você vende no iFood, use o mesmo código como "código externo" no cardápio do iFood para os pedidos chegarem certos na cozinha.'
	},
	'setup.delivery.title': {
		group: 'staff',
		label: 'Entrega: título',
		default: 'Retirada e entrega (pedidos do site)'
	},
	'setup.delivery.pickup': {
		group: 'staff',
		label: 'Entrega: retirada',
		default: 'Cliente retira no balcão'
	},
	'setup.delivery.own': {
		group: 'staff',
		label: 'Entrega: entrega própria',
		default: 'Entrega própria (seu motoboy)'
	},
	'setup.delivery.zones': {
		group: 'staff',
		label: 'Entrega: áreas ativas',
		default: '{count} área(s) de entrega ativa(s).'
	},
	'setup.delivery.noZones': {
		group: 'staff',
		label: 'Entrega: sem áreas',
		default:
			'Nenhuma área de entrega cadastrada: com a entrega ligada, o site recusa todos os endereços.'
	},
	'setup.delivery.manage': {
		group: 'staff',
		label: 'Entrega: link áreas',
		default: 'Cadastrar áreas e taxas'
	},
	'setup.team.title': { group: 'staff', label: 'Equipe: título', default: 'Equipe' },
	'setup.team.text': {
		group: 'staff',
		label: 'Equipe: texto',
		default:
			'{count} pessoa(s) com acesso. Crie uma conta para cada pessoa. Admins cuidam da loja; a cozinha vê só a tela de pedidos.'
	},
	'setup.team.manage': {
		group: 'staff',
		label: 'Equipe: botão gerenciar',
		default: 'Gerenciar equipe'
	},
	'setup.team.continue': { group: 'staff', label: 'Equipe: botão continuar', default: 'Continuar' },
	'setup.pay.title': {
		group: 'staff',
		label: 'Pagamento: título',
		default: 'Como o cliente do site paga'
	},
	'setup.pay.intro': {
		group: 'staff',
		label: 'Pagamento: texto',
		default: 'Todo pedido do site é pago na hora, antes de ir para a cozinha.'
	},
	'setup.pay.pix': {
		group: 'staff',
		label: 'Pagamento: Pix ligado',
		default: 'Pix na chave da loja'
	},
	'setup.pay.pixHint': {
		group: 'staff',
		label: 'Pagamento: explicação Pix',
		default:
			'O site mostra um QR Code com o valor e o número do pedido. Sem taxa de intermediário. A confirmação não é automática: a equipe confere o Pix no app do banco e registra no pedido.'
	},
	'setup.pay.key': { group: 'staff', label: 'Pagamento: campo chave', default: 'Chave Pix' },
	'setup.pay.keyPh': {
		group: 'staff',
		label: 'Pagamento: exemplo chave',
		default: 'CNPJ, CPF, celular, e-mail ou chave aleatória'
	},
	'setup.pay.recipient': {
		group: 'staff',
		label: 'Pagamento: campo recebedor',
		default: 'Nome do recebedor'
	},
	'setup.pay.recipientCity': {
		group: 'staff',
		label: 'Pagamento: campo cidade recebedor',
		default: 'Cidade do recebedor'
	},
	'setup.pay.test': {
		group: 'staff',
		label: 'Pagamento: teste Pix',
		default: 'Faça um pedido de teste e pague R$ 1 para conferir que o Pix cai na conta certa.'
	},
	'setup.pay.psp': {
		group: 'staff',
		label: 'Pagamento: aviso PSP',
		default:
			'Pagamento online com confirmação automática (Pix e cartão) precisa de um provedor de pagamento (PSP).'
	},
	'setup.pay.providerOn': {
		group: 'staff',
		label: 'Pagamento: provedor ativo',
		default: 'Provedor ativo: {provider}.'
	},
	'setup.pay.providerOff': {
		group: 'staff',
		label: 'Pagamento: sem provedor',
		default: 'Nenhum está conectado; isso é opcional.'
	},
	'setup.ifood.title': { group: 'staff', label: 'iFood: título', default: 'iFood (opcional)' },
	'setup.ifood.on': { group: 'staff', label: 'iFood: status ligado', default: 'Ligado' },
	'setup.ifood.off': { group: 'staff', label: 'iFood: status desligado', default: 'Desligado' },
	'setup.ifood.intro': {
		group: 'staff',
		label: 'iFood: texto',
		default:
			'A loja funciona sem o iFood. Sem a integração, a equipe lança os pedidos do iFood no Caixa em "iFood (manual)". Com ela, os pedidos chegam sozinhos na cozinha e o status volta para o iFood.'
	},
	'setup.ifood.warn': {
		group: 'staff',
		label: 'iFood: aviso homologação',
		default:
			'Esta integração foi feita a partir da documentação pública do iFood e ainda não passou pela homologação do iFood. Teste com pedidos de teste antes de depender dela.'
	},
	'setup.ifood.step1': {
		group: 'staff',
		label: 'iFood: passo 1',
		default:
			'No Portal do Desenvolvedor iFood (developer.ifood.com.br), crie um aplicativo do tipo "centralizado" para a sua loja e copie o Client ID e o Client Secret.'
	},
	'setup.ifood.step2': {
		group: 'staff',
		label: 'iFood: passo 2',
		default:
			'No Portal do Parceiro, autorize esse aplicativo para a loja e copie o Merchant ID (código da loja).'
	},
	'setup.ifood.step3': {
		group: 'staff',
		label: 'iFood: passo 3',
		default: 'Cole os três abaixo e clique em "Salvar e testar".'
	},
	'setup.ifood.step4': {
		group: 'staff',
		label: 'iFood: passo 4',
		default: 'No cardápio do iFood, use o código (SKU) de cada produto daqui como "código externo".'
	},
	'setup.ifood.envNote': {
		group: 'staff',
		label: 'iFood: credenciais do servidor',
		default:
			'As credenciais atuais vêm das variáveis do servidor (IFOOD_*). Salvar aqui passa a usar as credenciais do app.'
	},
	'setup.ifood.noSecret': {
		group: 'staff',
		label: 'iFood: sem APP_SECRET',
		default:
			'O servidor não tem APP_SECRET configurado, então não pode guardar o Client Secret com segurança. Rode deploy/setup.sh de novo ou defina APP_SECRET no servidor.'
	},
	'setup.ifood.clientId': { group: 'staff', label: 'iFood: campo Client ID', default: 'Client ID' },
	'setup.ifood.clientSecret': {
		group: 'staff',
		label: 'iFood: campo Client Secret',
		default: 'Client Secret'
	},
	'setup.ifood.secretSaved': {
		group: 'staff',
		label: 'iFood: segredo já salvo',
		default: 'Já salvo. Deixe em branco para manter.'
	},
	'setup.ifood.merchantId': {
		group: 'staff',
		label: 'iFood: campo Merchant ID',
		default: 'Merchant ID'
	},
	'setup.ifood.save': {
		group: 'staff',
		label: 'iFood: botão salvar e testar',
		default: 'Salvar e testar'
	},
	'setup.ifood.retest': {
		group: 'staff',
		label: 'iFood: botão testar de novo',
		default: 'Testar conexão de novo'
	},
	'setup.ifood.technical': {
		group: 'staff',
		label: 'iFood: detalhe técnico',
		default: 'Detalhe técnico'
	},
	'setup.ifood.lastTest': {
		group: 'staff',
		label: 'iFood: último teste',
		default: 'Último teste em {when}: {result}'
	},
	'setup.ifood.ok': { group: 'staff', label: 'iFood: conexão ok', default: 'conexão funcionando.' },
	'setup.ifood.disable': {
		group: 'staff',
		label: 'iFood: botão desligar',
		default: 'Desligar iFood'
	},
	'setup.ifood.ack': {
		group: 'staff',
		label: 'iFood: confirmação',
		default:
			'Entendi que a integração ainda não foi homologada pelo iFood e vou acompanhar os primeiros pedidos também no Gestor de Pedidos do iFood.'
	},
	'setup.ifood.enable': {
		group: 'staff',
		label: 'iFood: botão ligar',
		default: 'Ligar recebimento automático de pedidos'
	},
	'setup.ifood.webhook': {
		group: 'staff',
		label: 'iFood: webhook',
		default:
			'Se o iFood pedir um endereço de webhook, use {url}. Mesmo sem webhook, o sistema consulta o iFood a cada 30 segundos.'
	},
	'setup.ifood.skip': { group: 'staff', label: 'iFood: pular', default: 'Pular por enquanto' },
	'setup.ifood.continue': { group: 'staff', label: 'iFood: continuar', default: 'Continuar' },
	'setup.done.title': { group: 'staff', label: 'Concluir: título', default: 'Tudo pronto?' },
	'setup.done.menu': {
		group: 'staff',
		label: 'Concluir: cardápio',
		default: 'Cardápio: {count} produto(s)'
	},
	'setup.done.pickup': { group: 'staff', label: 'Concluir: retirada', default: 'Retirada' },
	'setup.done.delivery': {
		group: 'staff',
		label: 'Concluir: entrega',
		default: ' e entrega ({count} área(s))'
	},
	'setup.done.team': {
		group: 'staff',
		label: 'Concluir: equipe',
		default: 'Equipe: {count} pessoa(s)'
	},
	'setup.done.pay': { group: 'staff', label: 'Concluir: pagamento', default: 'Pagamento:' },
	'setup.done.payOn': {
		group: 'staff',
		label: 'Concluir: Pix ligado',
		default: 'Pix na chave da loja'
	},
	'setup.done.payOff': {
		group: 'staff',
		label: 'Concluir: sem pagamento no site',
		default: 'nenhum para o site'
	},
	'setup.done.ifoodOn': {
		group: 'staff',
		label: 'Concluir: iFood ligado',
		default: 'iFood ligado'
	},
	'setup.done.ifoodOff': {
		group: 'staff',
		label: 'Concluir: iFood desligado',
		default: 'iFood desligado (use "iFood (manual)" no Caixa)'
	},
	'setup.done.noProducts': {
		group: 'staff',
		label: 'Concluir: sem produtos',
		default: 'Sem produtos, o site e o caixa ficam vazios.'
	},
	'setup.done.open': {
		group: 'staff',
		label: 'Concluir: abrir loja',
		default: 'Abrir a loja para pedidos pelo site agora'
	},
	'setup.done.submit': {
		group: 'staff',
		label: 'Concluir: botão',
		default: 'Concluir configuração'
	},
	'setup.done.hint': {
		group: 'staff',
		label: 'Concluir: dica',
		default: 'Você pode voltar aqui a qualquer momento em Loja → Configuração.'
	},
	// Checkout steps
	'checkout.step.receive': {
		group: 'checkout',
		label: 'Passo: como receber',
		default: 'Como receber'
	},
	'checkout.step.address': { group: 'checkout', label: 'Passo: endereço', default: 'Endereço' },
	'checkout.step.you': { group: 'checkout', label: 'Passo: seus dados', default: 'Seus dados' },
	'checkout.step.payment': { group: 'checkout', label: 'Passo: pagamento', default: 'Pagamento' },
	'checkout.step.review': { group: 'checkout', label: 'Passo: revisar', default: 'Revisar' },
	'checkout.stepOf': {
		group: 'checkout',
		label: 'Indicador de passo',
		default: 'Passo {current} de {total}'
	},
	'checkout.next': { group: 'checkout', label: 'Botão continuar', default: 'Continuar' },
	'checkout.back': { group: 'checkout', label: 'Botão voltar', default: 'Voltar' },
	'checkout.addressNotNeeded': {
		group: 'checkout',
		label: 'Passo endereço: sem entrega',
		default: 'Esta opção não precisa de endereço.'
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
