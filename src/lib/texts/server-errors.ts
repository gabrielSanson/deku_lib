// Messages the server sends back when a form or an order is refused, and the short
// confirmations some staff forms show. Services throw
// DomainError/PricingError with one of these keys; the form action shows the owner's edited
// text (see attempt() and failText() in src/lib/server/actions.ts).
import type { TextDef } from './catalog';

export const SERVER_ERROR_TEXTS = {
	'err.cart.empty': { group: 'errors', label: 'Carrinho vazio', default: 'O carrinho está vazio.' },
	'err.cart.tooMany': {
		group: 'errors',
		label: 'Itens demais',
		default: 'Itens demais no pedido.'
	},
	'err.cart.unavailable': {
		group: 'errors',
		label: 'Produto indisponível',
		default: 'Produto indisponível.'
	},
	'err.cart.soldOut': { group: 'errors', label: 'Item esgotado', default: '{name} está esgotado.' },
	'err.cart.pickOption': {
		group: 'errors',
		label: 'Falta escolher opção',
		default: 'Escolha {group} para {product}.'
	},
	'err.cart.tooManyOptions': {
		group: 'errors',
		label: 'Opções demais',
		default: 'Opções demais em {group}.'
	},
	'err.cart.badOption': { group: 'errors', label: 'Opção inválida', default: 'Opção inválida.' },
	'err.cart.badQuantity': {
		group: 'errors',
		label: 'Quantidade inválida',
		default: 'Quantidade inválida para {name}.'
	},
	'err.cart.ingredientOut': {
		group: 'errors',
		label: 'Ingrediente acabou',
		default: '{ingredient} acabou. Retire do {product} para continuar.'
	},
	'err.order.paused': {
		group: 'errors',
		label: 'Loja pausada',
		default: 'A loja não está aceitando pedidos agora.'
	},
	'err.order.pausedReason': {
		group: 'errors',
		label: 'Loja pausada com motivo',
		default: '{reason}'
	},
	'err.order.closedHours': {
		group: 'errors',
		label: 'Fora do horário',
		default: 'A loja está fora do horário de funcionamento.'
	},
	'err.order.deliveryOff': {
		group: 'errors',
		label: 'Entrega desligada',
		default: 'Entrega indisponível no momento.'
	},
	'err.order.pickupOff': {
		group: 'errors',
		label: 'Retirada desligada',
		default: 'Retirada indisponível no momento.'
	},
	'err.order.dineInOff': {
		group: 'errors',
		label: 'Comer no local desligado',
		default: 'Pedidos para comer no local estão desligados.'
	},
	'err.order.capacity': {
		group: 'errors',
		label: 'Cozinha lotada',
		default: 'Cozinha lotada. Tente novamente em alguns minutos.'
	},
	'err.order.noZone': {
		group: 'errors',
		label: 'Fora da área de entrega',
		default: 'Endereço fora da área de entrega.'
	},
	'err.order.minOrder': {
		group: 'errors',
		label: 'Abaixo do mínimo',
		default: 'Pedido abaixo do mínimo para entrega neste endereço.'
	},
	'err.order.duplicate': {
		group: 'errors',
		label: 'Pedido duplicado',
		default: 'Pedido duplicado.'
	},
	'err.order.notFound': {
		group: 'errors',
		label: 'Pedido não encontrado',
		default: 'Pedido não encontrado.'
	},
	'err.order.invalid': {
		group: 'staffErrors',
		label: 'Pedido inválido',
		default: 'Pedido inválido.'
	},
	'err.order.invalidCart': {
		group: 'staffErrors',
		label: 'Pedido inválido (carrinho)',
		default: 'Pedido inválido. Revise o carrinho.'
	},
	'err.order.stale': {
		group: 'staffErrors',
		label: 'Pedido mudou',
		default: 'O pedido foi atualizado por outra pessoa. Recarregue e tente de novo.'
	},
	'err.order.badTransition': {
		group: 'staffErrors',
		label: 'Mudança de situação não permitida',
		default: 'Não é possível mudar de {from} para {to}.'
	},
	'err.order.badStatus': {
		group: 'staffErrors',
		label: 'Situação inválida',
		default: 'Status inválido.'
	},
	'err.order.forbidden': {
		group: 'staffErrors',
		label: 'Perfil sem permissão (pedido)',
		default: 'Seu perfil não permite esta ação.'
	},
	'err.order.unpaid': {
		group: 'staffErrors',
		label: 'Pagar antes da cozinha',
		default: 'Receba o pagamento antes de enviar o pedido para a cozinha.'
	},
	'err.order.reason': {
		group: 'staffErrors',
		label: 'Falta o motivo',
		default: 'Informe o motivo.'
	},
	'err.order.notReady': {
		group: 'staffErrors',
		label: 'Chamar só pedido pronto',
		default: 'Só pedidos prontos podem ser chamados.'
	},
	'err.order.ifoodCode': {
		group: 'staffErrors',
		label: 'Falta código do iFood',
		default: 'Informe o código do pedido no iFood.'
	},
	'err.order.phone': {
		group: 'staffErrors',
		label: 'Telefone inválido',
		default: 'Telefone inválido. Use DDD + número.'
	},
	'err.order.customerName': {
		group: 'staffErrors',
		label: 'Falta nome do cliente',
		default: 'Informe o nome do cliente.'
	},
	'err.action.invalid': { group: 'staffErrors', label: 'Ação inválida', default: 'Ação inválida.' },
	'err.data.invalid': { group: 'errors', label: 'Dados inválidos', default: 'Dados inválidos.' },
	'err.pay.onlineOff': {
		group: 'errors',
		label: 'Pagamento online indisponível',
		default: 'Pagamento online indisponível no momento.'
	},
	'err.pay.alreadyPaid': {
		group: 'errors',
		label: 'Pedido já pago',
		default: 'Este pedido já está pago.'
	},
	'err.pay.cancelled': { group: 'errors', label: 'Pedido cancelado', default: 'Pedido cancelado.' },
	'err.push.noAlert': {
		group: 'errors',
		label: 'Pedido sem aviso de pronto',
		default: 'Este pedido não recebe aviso de pronto.'
	},
	'err.push.tooMany': {
		group: 'errors',
		label: 'Limite de avisos',
		default: 'Limite de avisos para este pedido.'
	},
	'err.tender.forbidden': {
		group: 'staffErrors',
		label: 'Perfil sem permissão (pagamento)',
		default: 'Seu perfil não permite receber pagamentos.'
	},
	'err.tender.badAmount': {
		group: 'staffErrors',
		label: 'Valor inválido',
		default: 'Valor inválido.'
	},
	'err.tender.short': {
		group: 'staffErrors',
		label: 'Valor menor que o total',
		default: 'Valor recebido menor que o total.'
	},
	'err.tender.nsu': {
		group: 'staffErrors',
		label: 'Falta NSU',
		default: 'Informe o código/NSU da transação.'
	},
	'err.tender.cancelled': {
		group: 'staffErrors',
		label: 'Pedido cancelado não recebe',
		default: 'Pedido cancelado não recebe pagamento.'
	},
	'err.tender.over': {
		group: 'staffErrors',
		label: 'Pagamento acima do total',
		default: 'O pagamento ultrapassa o total do pedido.'
	},
	'err.tender.refundAdmin': {
		group: 'staffErrors',
		label: 'Estorno só admin',
		default: 'Somente um admin pode estornar.'
	},
	'err.tender.refundReason': {
		group: 'staffErrors',
		label: 'Falta motivo do estorno',
		default: 'Informe o motivo do estorno.'
	},
	'err.tender.notFound': {
		group: 'staffErrors',
		label: 'Pagamento não encontrado',
		default: 'Pagamento não encontrado.'
	},
	'err.tender.refundConfirmed': {
		group: 'staffErrors',
		label: 'Estorno só confirmados',
		default: 'Só pagamentos confirmados podem ser estornados.'
	},
	'err.tender.providerRefund': {
		group: 'staffErrors',
		label: 'Estorno online no provedor',
		default: 'Estorno online deve ser feito pelo provedor de pagamento.'
	},
	'err.tender.method': {
		group: 'staffErrors',
		label: 'Forma de pagamento inválida',
		default: 'Forma de pagamento inválida.'
	},
	'err.amount.required': {
		group: 'staffErrors',
		label: 'Falta o valor',
		default: 'Informe o valor.'
	},
	'err.cash.forbidden': {
		group: 'staffErrors',
		label: 'Caixa: perfil sem permissão',
		default: 'Seu perfil não permite mexer no caixa.'
	},
	'err.cash.float': {
		group: 'staffErrors',
		label: 'Caixa: falta fundo de troco',
		default: 'Informe o fundo de troco.'
	},
	'err.cash.floatZero': {
		group: 'staffErrors',
		label: 'Caixa: fundo de troco (pode ser 0)',
		default: 'Informe o fundo de troco (pode ser 0).'
	},
	'err.cash.alreadyOpen': {
		group: 'staffErrors',
		label: 'Caixa: já aberto',
		default: 'O caixa já está aberto.'
	},
	'err.cash.reason': {
		group: 'staffErrors',
		label: 'Caixa: falta motivo da sangria',
		default: 'Informe o motivo da sangria.'
	},
	'err.cash.overdraw': {
		group: 'staffErrors',
		label: 'Caixa: sangria maior que a gaveta',
		default: 'A sangria é maior que o dinheiro na gaveta.'
	},
	'err.cash.counted': {
		group: 'staffErrors',
		label: 'Caixa: falta valor contado',
		default: 'Informe o valor contado na gaveta.'
	},
	'err.cash.countedZero': {
		group: 'staffErrors',
		label: 'Caixa: valor contado (pode ser 0)',
		default: 'Informe o valor contado na gaveta (pode ser 0).'
	},
	'err.cash.closed': {
		group: 'staffErrors',
		label: 'Caixa: fechado',
		default: 'Abra o caixa antes de continuar.'
	},
	'err.cash.closedCash': {
		group: 'staffErrors',
		label: 'Caixa: fechado (dinheiro)',
		default: 'Abra o caixa antes de receber em dinheiro.'
	},
	'err.cash.closedRefund': {
		group: 'staffErrors',
		label: 'Caixa: fechado (devolução)',
		default: 'Abra o caixa para devolver o dinheiro.'
	},
	'err.cash.movement': {
		group: 'staffErrors',
		label: 'Caixa: movimento inválido',
		default: 'Movimento inválido.'
	},
	'err.staff.notFound': {
		group: 'staffErrors',
		label: 'Equipe: pessoa não encontrada',
		default: 'Pessoa não encontrada.'
	},
	'err.staff.cannotEdit': {
		group: 'staffErrors',
		label: 'Equipe: sem permissão para alterar',
		default: 'Seu perfil não pode alterar esta conta.'
	},
	'err.staff.self': {
		group: 'staffErrors',
		label: 'Equipe: a própria conta',
		default: 'Você não pode desativar ou rebaixar a própria conta.'
	},
	'err.staff.lastOwner': {
		group: 'staffErrors',
		label: 'Equipe: último admin',
		default: 'A loja precisa de pelo menos um admin ativo.'
	},
	'err.staff.cannotCreate': {
		group: 'staffErrors',
		label: 'Equipe: sem permissão para criar',
		default: 'Seu perfil não pode criar esta conta.'
	},
	'err.staff.password': {
		group: 'staffErrors',
		label: 'Equipe: senha curta',
		default: 'A senha precisa ter pelo menos 10 caracteres.'
	},
	'err.staff.noAdminKey': {
		group: 'staffErrors',
		label: 'Equipe: sem chave de admin',
		default: 'Crie a conta no painel do Supabase e depois atribua o perfil aqui.'
	},
	'err.staff.createFailed': {
		group: 'staffErrors',
		label: 'Equipe: falha ao criar',
		default: 'Não foi possível criar a conta: {detail}'
	},
	'err.staff.noAuthUser': {
		group: 'staffErrors',
		label: 'Equipe: e-mail sem usuário',
		default: 'Nenhum usuário com este e-mail no Supabase Auth.'
	},
	'err.staff.role': {
		group: 'staffErrors',
		label: 'Equipe: perfil inválido',
		default: 'Perfil inválido.'
	},
	'err.staff.nameEmail': {
		group: 'staffErrors',
		label: 'Equipe: falta nome e e-mail',
		default: 'Informe nome e e-mail.'
	},
	'err.login.unavailable': {
		group: 'staffErrors',
		label: 'Login: sem Supabase',
		default: 'Login indisponível: Supabase não configurado.'
	},
	'err.login.missing': {
		group: 'staffErrors',
		label: 'Login: falta e-mail e senha',
		default: 'Informe e-mail e senha.'
	},
	'err.login.wrong': {
		group: 'staffErrors',
		label: 'Login: senha incorreta',
		default: 'E-mail ou senha incorretos.'
	},
	'err.campaign.codeTaken': {
		group: 'staffErrors',
		label: 'Campanha: cupom repetido',
		default: 'Já existe um cupom com esse código.'
	},
	'err.campaign.notFound': {
		group: 'staffErrors',
		label: 'Campanha não encontrada',
		default: 'Campanha não encontrada.'
	},
	'err.campaign.code': {
		group: 'staffErrors',
		label: 'Campanha: código do cupom',
		default: 'O código deve ter de 3 a 24 letras, números, - ou _.'
	},
	'err.campaign.codeOrAuto': {
		group: 'staffErrors',
		label: 'Campanha: falta cupom',
		default: 'Informe o código do cupom ou marque "aplicar sozinho".'
	},
	'err.campaign.dates': {
		group: 'staffErrors',
		label: 'Campanha: fim antes do início',
		default: 'O fim deve ser depois do início.'
	},
	'err.campaign.rules': {
		group: 'staffErrors',
		label: 'Campanha: regras',
		default: 'Revise as regras da promoção.'
	},
	'err.date.invalid': { group: 'staffErrors', label: 'Data inválida', default: 'Data inválida.' },
	'err.menu.categoryNotFound': {
		group: 'staffErrors',
		label: 'Cardápio: categoria não encontrada',
		default: 'Categoria não encontrada.'
	},
	'err.menu.categoryTaken': {
		group: 'staffErrors',
		label: 'Cardápio: categoria repetida',
		default: 'Já existe uma categoria com esse nome.'
	},
	'err.menu.categoryNotEmpty': {
		group: 'staffErrors',
		label: 'Cardápio: categoria com produtos',
		default: 'Mova ou apague os produtos desta categoria primeiro.'
	},
	'err.menu.pickCategory': {
		group: 'staffErrors',
		label: 'Cardápio: falta categoria',
		default: 'Escolha uma categoria.'
	},
	'err.menu.badCategory': {
		group: 'staffErrors',
		label: 'Cardápio: categoria inválida',
		default: 'Categoria inválida.'
	},
	'err.menu.productNotFound': {
		group: 'staffErrors',
		label: 'Cardápio: produto não encontrado',
		default: 'Produto não encontrado.'
	},
	'err.menu.skuTaken': {
		group: 'staffErrors',
		label: 'Cardápio: SKU repetido',
		default: 'Já existe um item com esse código (SKU).'
	},
	'err.menu.optionSkuTaken': {
		group: 'staffErrors',
		label: 'Cardápio: código de opção repetido',
		default: 'O código {sku} já é usado por outro item.'
	},
	'err.menu.ingredientNotFound': {
		group: 'staffErrors',
		label: 'Cardápio: ingrediente não encontrado',
		default: 'Ingrediente não encontrado.'
	},
	'err.menu.ingredientTaken': {
		group: 'staffErrors',
		label: 'Cardápio: ingrediente repetido',
		default: 'Já existe um ingrediente com esse nome.'
	},
	'err.menu.groupNotFound': {
		group: 'staffErrors',
		label: 'Cardápio: grupo não encontrado',
		default: 'Grupo não encontrado.'
	},
	'err.menu.groupTaken': {
		group: 'staffErrors',
		label: 'Cardápio: grupo repetido',
		default: 'Já existe um grupo com esse nome.'
	},
	'err.menu.notEmpty': {
		group: 'staffErrors',
		label: 'Cardápio: já tem produtos',
		default: 'O cardápio já tem produtos.'
	},
	'err.menu.price': {
		group: 'staffErrors',
		label: 'Cardápio: preço inválido',
		default: 'Preço inválido. Use por exemplo 29,90.'
	},
	'err.menu.optionPrice': {
		group: 'staffErrors',
		label: 'Cardápio: preço de opção inválido',
		default: 'Preço inválido em "{name}".'
	},
	'err.menu.pageSlug': {
		group: 'staffErrors',
		label: 'Páginas: endereço inválido',
		default: 'Endereço inválido.'
	},
	'err.menu.pageTitle': {
		group: 'staffErrors',
		label: 'Páginas: falta título',
		default: 'Informe o título.'
	},
	'err.menu.pageBuiltIn': {
		group: 'staffErrors',
		label: 'Páginas: página fixa',
		default: 'Esta página vem com o site. Desmarque "Publicada" para escondê-la.'
	},
	'err.menu.pageNotFound': {
		group: 'staffErrors',
		label: 'Páginas: não encontrada',
		default: 'Página não encontrada.'
	},
	'err.image.noStorage': {
		group: 'staffErrors',
		label: 'Fotos: sem Storage',
		default: 'O envio de fotos precisa do Supabase Storage configurado no servidor.'
	},
	'err.image.missing': {
		group: 'staffErrors',
		label: 'Fotos: falta a foto',
		default: 'Escolha uma foto.'
	},
	'err.image.tooBig': {
		group: 'staffErrors',
		label: 'Fotos: grande demais',
		default: 'A foto pode ter no máximo 5 MB.'
	},
	'err.image.type': {
		group: 'staffErrors',
		label: 'Fotos: formato',
		default: 'Envie uma foto JPG, PNG ou WebP.'
	},
	'err.image.bucket': {
		group: 'staffErrors',
		label: 'Fotos: falha no armazenamento',
		default: 'Não foi possível preparar o armazenamento: {detail}'
	},
	'err.image.upload': {
		group: 'staffErrors',
		label: 'Fotos: falha no envio',
		default: 'Não foi possível enviar a foto: {detail}'
	},
	'err.image.unknown': {
		group: 'staffErrors',
		label: 'Imagem desconhecida',
		default: 'Imagem desconhecida.'
	},
	'err.image.pick': {
		group: 'staffErrors',
		label: 'Falta escolher imagem',
		default: 'Escolha uma imagem.'
	},
	'err.image.invalid': {
		group: 'staffErrors',
		label: 'Imagem inválida',
		default: 'Imagem inválida.'
	},
	'err.fiscal.cnpj': {
		group: 'staffErrors',
		label: 'Nota: CNPJ',
		default: 'O CNPJ tem 14 números.'
	},
	'err.fiscal.ncm': { group: 'staffErrors', label: 'Nota: NCM', default: 'O NCM tem 8 números.' },
	'err.fiscal.cfop': {
		group: 'staffErrors',
		label: 'Nota: CFOP',
		default: 'O CFOP tem 4 números.'
	},
	'err.fiscal.csosn': {
		group: 'staffErrors',
		label: 'Nota: CSOSN/CST',
		default: 'O CSOSN/CST tem 3 números.'
	},
	'err.fiscal.incomplete': {
		group: 'staffErrors',
		label: 'Nota: dados incompletos',
		default: 'Para ligar a nota fiscal, preencha CNPJ, token do provedor e NCM padrão.'
	},
	'err.fiscal.justification': {
		group: 'staffErrors',
		label: 'Nota: justificativa curta',
		default: 'A justificativa do cancelamento precisa ter pelo menos 15 letras.'
	},
	'err.fiscal.off': {
		group: 'staffErrors',
		label: 'Nota: não configurada',
		default: 'Nota fiscal não configurada.'
	},
	'err.fiscal.noDocument': {
		group: 'staffErrors',
		label: 'Nota: pedido sem nota',
		default: 'Este pedido não tem nota autorizada.'
	},
	'err.fiscal.cancelRefused': {
		group: 'staffErrors',
		label: 'Nota: SEFAZ recusou',
		default: 'A SEFAZ não aceitou o cancelamento.'
	},
	'err.ifood.clientId': {
		group: 'staffErrors',
		label: 'iFood: falta Client ID',
		default: 'Informe o Client ID.'
	},
	'err.ifood.merchantId': {
		group: 'staffErrors',
		label: 'iFood: falta Merchant ID',
		default: 'Informe o Merchant ID (código da loja no iFood).'
	},
	'err.ifood.merchantIdShape': {
		group: 'staffErrors',
		label: 'iFood: Merchant ID estranho',
		default: 'O Merchant ID costuma ser um código como 1a2b3c4d-…; confira se copiou o valor certo.'
	},
	'err.ifood.clientSecret': {
		group: 'staffErrors',
		label: 'iFood: falta Client Secret',
		default: 'Informe o Client Secret.'
	},
	'err.ifood.saveFirst': {
		group: 'staffErrors',
		label: 'iFood: salvar antes de ligar',
		default: 'Salve as credenciais do iFood antes de ligar.'
	},
	'err.ifood.testFirst': {
		group: 'staffErrors',
		label: 'iFood: testar antes de ligar',
		default: 'Teste a conexão com sucesso antes de ligar o iFood.'
	},
	'err.ifood.acknowledge': {
		group: 'staffErrors',
		label: 'iFood: confirmar homologação',
		default:
			'Marque que você entendeu que a integração ainda não foi homologada pelo iFood antes de ligar.'
	},
	'err.ifood.credentials': {
		group: 'staffErrors',
		label: 'iFood: falta credenciais',
		default: 'Preencha Client ID, Client Secret e Merchant ID e salve.'
	},
	'err.settings.appSecret': {
		group: 'staffErrors',
		label: 'Servidor sem APP_SECRET',
		default:
			'O servidor não tem APP_SECRET configurado, então não pode guardar senhas. Rode deploy/setup.sh de novo ou defina APP_SECRET.'
	},
	'err.settings.color': {
		group: 'staffErrors',
		label: 'Aparência: cor inválida',
		default: 'Cor inválida. Use o formato #RRGGBB.'
	},
	'err.settings.contrast': {
		group: 'staffErrors',
		label: 'Aparência: pouco contraste',
		default: 'Pouco contraste, mínimo 4,5:1: {list}.'
	},
	'err.settings.link': {
		group: 'staffErrors',
		label: 'Página inicial: link inválido',
		default: 'Link inválido. Use um endereço do site, como /cardapio, ou https://…'
	},
	'err.settings.shopName': {
		group: 'staffErrors',
		label: 'Loja: falta nome',
		default: 'Informe o nome da loja (até 80 letras).'
	},
	'err.settings.pixKey': {
		group: 'staffErrors',
		label: 'Loja: chave Pix inválida',
		default: 'Chave Pix inválida. Use CPF, CNPJ, celular com DDD, e-mail ou chave aleatória.'
	},
	'err.settings.pixName': {
		group: 'staffErrors',
		label: 'Loja: falta recebedor',
		default: 'Informe o nome do recebedor (como aparece no banco).'
	},
	'err.settings.pixCity': {
		group: 'staffErrors',
		label: 'Loja: falta cidade',
		default: 'Informe a cidade do recebedor.'
	},
	'err.settings.stale': {
		group: 'staffErrors',
		label: 'Configurações mudaram',
		default: 'As configurações mudaram. Recarregue a página.'
	},
	'err.settings.ruleNotFound': {
		group: 'staffErrors',
		label: 'Regra não encontrada',
		default: 'Regra não encontrada.'
	},
	'err.settings.prepTime': {
		group: 'staffErrors',
		label: 'Operação: tempo de preparo',
		default: 'Tempo de preparo inválido.'
	},
	'err.settings.capacity': {
		group: 'staffErrors',
		label: 'Operação: capacidade',
		default: 'Capacidade inválida.'
	},
	'err.settings.channels': {
		group: 'staffErrors',
		label: 'Configuração: canais do site',
		default: 'Escolha retirada, entrega ou as duas para os pedidos do site.'
	},
	'err.type.invalid': { group: 'staffErrors', label: 'Tipo inválido', default: 'Tipo inválido.' },
	'err.delivery.fields': {
		group: 'staffErrors',
		label: 'Entrega: campos',
		default: 'Preencha nome, área e taxa.'
	},
	'err.integrations.event': {
		group: 'staffErrors',
		label: 'Integrações: evento inválido',
		default: 'Evento inválido.'
	},
	'err.integrations.delivery': {
		group: 'staffErrors',
		label: 'Integrações: envio inválido',
		default: 'Envio inválido.'
	},
	'err.texts.tooLong': {
		group: 'staffErrors',
		label: 'Textos: longo demais',
		default: '"{label}" pode ter no máximo {max} letras.'
	},
	'err.texts.placeholders': {
		group: 'staffErrors',
		label: 'Textos: faltam chaves',
		default: '"{label}" precisa ter {names}, e nada além disso entre chaves.'
	},
	'err.texts.noPlaceholders': {
		group: 'staffErrors',
		label: 'Textos: chaves sobrando',
		default: '"{label}" não pode ter palavras entre chaves.'
	},
	'err.catalog.unavailable': {
		group: 'errors',
		label: 'Cardápio indisponível',
		default: 'Cardápio indisponível no momento.'
	},
	'ok.colorsSaved': {
		group: 'staffErrors',
		label: 'Aparência: cores salvas',
		default: 'Cores salvas.'
	},
	'ok.colorsReset': {
		group: 'staffErrors',
		label: 'Aparência: cores padrão',
		default: 'Cores padrão de volta.'
	},
	'ok.imageChanged': { group: 'staffErrors', label: 'Imagem trocada', default: 'Imagem trocada.' },
	'ok.imageReset': {
		group: 'staffErrors',
		label: 'Imagem padrão',
		default: 'Imagem padrão de volta.'
	},
	'ok.eventRetried': {
		group: 'staffErrors',
		label: 'Integrações: evento reenviado',
		default: 'Evento reenviado para processamento.'
	},
	'ok.deliveryRetried': {
		group: 'staffErrors',
		label: 'Integrações: nova tentativa',
		default: 'Nova tentativa agendada.'
	},
	'ok.categorySaved': {
		group: 'staffErrors',
		label: 'Cardápio: categoria salva',
		default: 'Categoria salva.'
	},
	'ok.categoryDeleted': {
		group: 'staffErrors',
		label: 'Cardápio: categoria apagada',
		default: 'Categoria apagada.'
	},
	'ok.sampleMenu': {
		group: 'staffErrors',
		label: 'Cardápio: exemplo carregado',
		default: 'Cardápio de exemplo carregado. Ajuste nomes, preços e fotos.'
	},
	'ok.sampleMenuSetup': {
		group: 'staffErrors',
		label: 'Configuração: exemplo carregado',
		default: 'Cardápio de exemplo carregado. Troque nomes, preços e fotos em Editar cardápio.'
	},
	'ok.ifoodConnected': {
		group: 'staffErrors',
		label: 'iFood: conexão funcionando',
		default: 'Conexão com o iFood funcionando.'
	}
} satisfies Record<string, TextDef>;
