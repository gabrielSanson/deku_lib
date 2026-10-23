// Staff texts for Configurações: store status, shop details and Pix,
// integrations and the NFC-e page.
import type { TextDef } from './catalog';

const g = 'staffSettings' as const;

export const STAFF_SETTINGS_TEXTS = {
	'settings.tabs': { group: g, label: 'Configurações: menu', default: 'Configurações' },
	'settings.adminOnly': { group: g, label: 'Configurações: só admins', default: 'Apenas admins.' },
	'settings.save': { group: g, label: 'Botão salvar', default: 'Salvar' },
	'settings.saved': { group: g, label: 'Aviso salvo', default: 'Salvo.' },

	// Loja
	'store.tabTitle': {
		group: g,
		label: 'Loja: título da aba',
		default: 'Tipos de pedido · Configurações'
	},
	'store.title': { group: g, label: 'Tipos de pedido: título', default: 'Tipos de pedido' },
	'store.open': { group: g, label: 'Loja: aberta', default: 'Loja aberta' },
	'store.paused': { group: g, label: 'Loja: pausada', default: 'Loja pausada' },
	'store.accepting': {
		group: g,
		label: 'Loja: aceitando pedidos',
		default: 'Pedidos online estão sendo aceitos.'
	},
	'store.updated': { group: g, label: 'Loja: atualizado', default: 'atualizado {time}' },
	'store.pauseReason': { group: g, label: 'Loja: motivo da pausa', default: 'Motivo da pausa' },
	'store.pause': { group: g, label: 'Loja: pausar pedidos', default: 'Pausar pedidos' },
	'store.openStore': { group: g, label: 'Loja: abrir loja', default: 'Abrir loja' },
	'store.operation': { group: g, label: 'Loja: seção operação', default: 'Operação' },
	'store.acceptingField': {
		group: g,
		label: 'Loja: aceitando (campo)',
		default: 'Aceitando pedidos'
	},
	'store.pauseMessage': {
		group: g,
		label: 'Loja: mensagem quando pausado',
		default: 'Mensagem quando pausado'
	},
	'store.web': { group: g, label: 'Loja: pedidos pelo site', default: 'Pedidos pelo site' },
	'store.dineIn': {
		group: g,
		label: 'Loja: comer no salão',
		default: 'Comer no salão (o cliente escolhe "Comer aqui" no pedido)'
	},
	'store.qrBefore': {
		group: g,
		label: 'Loja: QR da mesa (antes do link)',
		default: 'Cole em cada mesa um QR Code com o link'
	},
	'store.qrAfter': {
		group: g,
		label: 'Loja: QR da mesa (depois do link)',
		default: '(troque o 7 pelo número da mesa). O pedido já chega com a mesa preenchida.'
	},
	'store.pickup': {
		group: g,
		label: 'Loja: para viagem',
		default: 'Para viagem / retirada no balcão'
	},
	'store.delivery': { group: g, label: 'Loja: entrega própria', default: 'Entrega própria' },
	'store.prep': {
		group: g,
		label: 'Loja: tempo de preparo',
		default: 'Tempo de preparo prometido (min)'
	},
	'store.maxOpen': {
		group: g,
		label: 'Loja: máximo de pedidos abertos',
		default: 'Máximo de pedidos abertos no site (vazio = sem limite)'
	},
	'store.menuHint': {
		group: g,
		label: 'Loja: onde fica o cardápio',
		default: 'Cardápio, fotos e preços ficam em'
	},
	'store.menuEdit': { group: g, label: 'Loja: link editar cardápio', default: 'Editar cardápio' },
	'store.soldOutHint': {
		group: g,
		label: 'Loja: onde ficam os esgotados',
		default: 'Itens esgotados ficam em'
	},
	'store.menu': { group: g, label: 'Loja: link cardápio', default: 'Cardápio' },

	// Dados e Pix
	'profile.tabTitle': {
		group: g,
		label: 'Dados: título da aba',
		default: 'Dados da loja · Configurações'
	},
	'profile.title': { group: g, label: 'Dados: título', default: 'Dados da loja' },
	'payments.tabTitle': {
		group: g,
		label: 'Pagamentos: título da aba',
		default: 'Pagamentos · Configurações'
	},
	'profile.store': { group: g, label: 'Dados: seção', default: 'Dados da loja' },
	'profile.storeHint': {
		group: g,
		label: 'Dados: dica',
		default: 'Aparecem no site, no app instalado e nos comprovantes.'
	},
	'profile.storeSave': { group: g, label: 'Dados: salvar', default: 'Salvar dados' },
	'profile.storeSaved': { group: g, label: 'Dados: salvos', default: 'Dados salvos.' },
	'profile.name': { group: g, label: 'Dados: nome da loja', default: 'Nome da loja' },
	'profile.phone': { group: g, label: 'Dados: telefone', default: 'Telefone ou WhatsApp' },
	'profile.phonePlaceholder': {
		group: g,
		label: 'Dados: exemplo de telefone',
		default: '(11) 99999-9999'
	},
	'profile.city': { group: g, label: 'Dados: cidade', default: 'Cidade' },
	'profile.cityPlaceholder': { group: g, label: 'Dados: exemplo de cidade', default: 'São Paulo' },
	'profile.address': { group: g, label: 'Dados: endereço', default: 'Endereço para retirada' },
	'profile.addressPlaceholder': {
		group: g,
		label: 'Dados: exemplo de endereço',
		default: 'Rua Exemplo, 123 - Centro'
	},
	'profile.payments': {
		group: g,
		label: 'Pagamentos: seção',
		default: 'Como o cliente do site paga'
	},
	'profile.paymentsHint': {
		group: g,
		label: 'Pagamentos: dica',
		default: 'Todo pedido do site é pago na hora, antes de ir para a cozinha.'
	},
	'profile.paymentsSave': { group: g, label: 'Pagamentos: salvar', default: 'Salvar pagamentos' },
	'profile.paymentsSaved': { group: g, label: 'Pagamentos: salvos', default: 'Pagamentos salvos.' },
	'profile.pix': { group: g, label: 'Pagamentos: Pix na chave', default: 'Pix na chave da loja' },
	'profile.pixHint': {
		group: g,
		label: 'Pagamentos: Pix (dica)',
		default:
			'O site mostra um QR Code com o valor e o número do pedido. A equipe confere o Pix no app do banco e registra no pedido.'
	},
	'profile.pixKey': { group: g, label: 'Pagamentos: chave Pix', default: 'Chave Pix' },
	'profile.pixKeyPlaceholder': {
		group: g,
		label: 'Pagamentos: exemplo de chave',
		default: 'CNPJ, CPF, celular, e-mail ou chave aleatória'
	},
	'profile.pixName': {
		group: g,
		label: 'Pagamentos: nome do recebedor',
		default: 'Nome do recebedor'
	},
	'profile.pixCity': {
		group: g,
		label: 'Pagamentos: cidade do recebedor',
		default: 'Cidade do recebedor'
	},
	'profile.pixTest': {
		group: g,
		label: 'Pagamentos: teste de R$ 1',
		default:
			'Depois de trocar a chave, faça um pedido de teste e pague R$ 1 para conferir que o Pix cai na conta certa.'
	},

	// Integrações
	'integrations.tabTitle': {
		group: g,
		label: 'Integrações: título da aba',
		default: 'iFood · Configurações'
	},
	'integrations.payments': {
		group: g,
		label: 'Integrações: pagamento online',
		default: 'Pagamento online'
	},
	'integrations.noPsp': {
		group: g,
		label: 'Integrações: sem PSP',
		default: 'Nenhum provedor de pagamento (PSP) conectado.'
	},
	'integrations.shopPix': {
		group: g,
		label: 'Integrações: Pix na chave',
		default: 'Clientes do site pagam por Pix na chave da loja e a equipe confirma.'
	},
	'integrations.noPix': {
		group: g,
		label: 'Integrações: sem chave Pix',
		default: 'Sem a chave Pix da loja, o site não aceita pedidos.'
	},
	'integrations.mercadopago': {
		group: g,
		label: 'Integrações: Mercado Pago',
		default:
			'Mercado Pago conectado: Pix com confirmação automática e cartão de crédito ou débito (página do Mercado Pago). O pedido vai para a cozinha assim que o pagamento é aprovado.'
	},
	'integrations.noWebhookSecret': {
		group: g,
		label: 'Integrações: falta segredo do webhook',
		default:
			'Falta a assinatura secreta do webhook (MERCADOPAGO_WEBHOOK_SECRET). Sem ela os avisos de pagamento são recusados e os pedidos só confirmam na verificação periódica.'
	},
	'integrations.stub': {
		group: g,
		label: 'Integrações: simulador',
		default: 'Simulador local ativo. Nenhum dinheiro real é cobrado. Não é permitido em produção.'
	},
	'integrations.on': { group: g, label: 'Integrações: ligado', default: 'Ligado' },
	'integrations.off': { group: g, label: 'Integrações: desligado', default: 'Desligado' },
	'integrations.ifoodOff': {
		group: g,
		label: 'Integrações: iFood desligado',
		default:
			'Desligado. Lance pedidos do iFood pelo Caixa usando "iFood (manual)". A integração foi escrita a partir da documentação pública do iFood e ainda não passou pela homologação.'
	},
	'integrations.lastPoll': {
		group: g,
		label: 'Integrações: última consulta',
		default: 'Última consulta ao iFood com sucesso: {time}.'
	},

	'integrations.health': { group: g, label: 'iFood: seção de saúde', default: 'Pedidos e eventos' },
	'integrations.lastEvent': {
		group: g,
		label: 'Integrações: último evento',
		default: 'Último evento'
	},
	'integrations.lastPollEvent': {
		group: g,
		label: 'Integrações: último via polling',
		default: 'Último via polling'
	},
	'integrations.today': {
		group: g,
		label: 'Integrações: eventos em 24h',
		default: 'Eventos em 24h'
	},
	'integrations.waiting': {
		group: g,
		label: 'Integrações: aguardando confirmação',
		default: 'Aguardando confirmação'
	},
	'integrations.failed': { group: g, label: 'Integrações: com falha', default: 'Com falha' },
	'integrations.dead': { group: g, label: 'Integrações: desistidos', default: 'Desistidos' },
	'integrations.outbound': {
		group: g,
		label: 'Integrações: envios',
		default: 'Envios para o iFood'
	},
	'integrations.noOutbound': {
		group: g,
		label: 'Integrações: sem envios',
		default: 'Nenhum envio ainda.'
	},
	'integrations.col.order': { group: g, label: 'Integrações: coluna pedido', default: 'Pedido' },
	'integrations.col.action': { group: g, label: 'Integrações: coluna ação', default: 'Ação' },
	'integrations.col.status': {
		group: g,
		label: 'Integrações: coluna situação',
		default: 'Situação'
	},
	'integrations.col.attempts': {
		group: g,
		label: 'Integrações: coluna tentativas',
		default: 'Tentativas'
	},
	'integrations.col.when': { group: g, label: 'Integrações: coluna quando', default: 'Quando' },
	'integrations.col.type': { group: g, label: 'Integrações: coluna tipo', default: 'Tipo' },
	'integrations.col.via': { group: g, label: 'Integrações: coluna via', default: 'Via' },
	'integrations.retry': {
		group: g,
		label: 'Integrações: tentar de novo',
		default: 'Tentar de novo'
	},
	'integrations.events': {
		group: g,
		label: 'Integrações: eventos recebidos',
		default: 'Eventos recebidos'
	},
	'integrations.noEvents': {
		group: g,
		label: 'Integrações: sem eventos',
		default: 'Nenhum evento recebido.'
	},
	'integrations.replay': { group: g, label: 'Integrações: reprocessar', default: 'Reprocessar' },

	// Nota fiscal
	'fiscal.tabTitle': {
		group: g,
		label: 'Nota fiscal: título da aba',
		default: 'Nota fiscal · Configurações'
	},
	'fiscal.title': { group: g, label: 'Nota fiscal: título', default: 'Nota fiscal (NFC-e)' },
	'fiscal.warning': {
		group: g,
		label: 'Nota fiscal: aviso',
		default:
			'Peça ao seu contador para conferir estes dados. Comece em Homologação (notas de teste, sem valor) e só passe para Produção depois que as notas de teste saírem autorizadas. Esta integração com a Focus NFe ainda não emitiu notas reais. O passo a passo está em docs/nota-fiscal.md.'
	},
	'fiscal.noSecret': {
		group: g,
		label: 'Nota fiscal: sem APP_SECRET',
		default: 'O servidor não tem APP_SECRET configurado, então não pode guardar o token.'
	},
	'fiscal.section': { group: g, label: 'Nota fiscal: seção', default: 'Emissão automática' },
	'fiscal.sectionHint': {
		group: g,
		label: 'Nota fiscal: dica',
		default:
			'Com a emissão ligada, cada pedido pago (balcão, totem e site) recebe uma NFC-e. Pedidos do iFood ficam de fora.'
	},
	'fiscal.saved': { group: g, label: 'Nota fiscal: salvo', default: 'Configuração salva.' },
	'fiscal.enabled': {
		group: g,
		label: 'Nota fiscal: ligar emissão',
		default: 'Emitir NFC-e para pedidos pagos'
	},
	'fiscal.environment': { group: g, label: 'Nota fiscal: ambiente', default: 'Ambiente' },
	'fiscal.homologacao': {
		group: g,
		label: 'Nota fiscal: homologação',
		default: 'Homologação (teste, sem valor fiscal)'
	},
	'fiscal.producao': {
		group: g,
		label: 'Nota fiscal: produção',
		default: 'Produção (notas reais)'
	},
	'fiscal.cnpj': { group: g, label: 'Nota fiscal: CNPJ', default: 'CNPJ da loja' },
	'fiscal.token': { group: g, label: 'Nota fiscal: token', default: 'Token da Focus NFe' },
	'fiscal.tokenSaved': {
		group: g,
		label: 'Nota fiscal: token guardado',
		default: 'Guardado. Digite só para trocar.'
	},
	'fiscal.tokenPaste': {
		group: g,
		label: 'Nota fiscal: colar token',
		default: 'Cole o token aqui'
	},
	'fiscal.ncm': { group: g, label: 'Nota fiscal: NCM', default: 'NCM padrão' },
	'fiscal.ncmPlaceholder': { group: g, label: 'Nota fiscal: exemplo de NCM', default: '8 números' },
	'fiscal.cfop': { group: g, label: 'Nota fiscal: CFOP', default: 'CFOP' },
	'fiscal.csosn': { group: g, label: 'Nota fiscal: CSOSN', default: 'CSOSN / CST' },
	'fiscal.ncmHint': {
		group: g,
		label: 'Nota fiscal: dica NCM',
		default:
			'O NCM é o código fiscal do produto; o contador informa qual usar para lanches, bebidas e porções. CFOP 5102 e CSOSN 102 são comuns no Simples Nacional, mas confirme.'
	},

	'look.tabTitle': {
		group: g,
		label: 'Aparência: título da aba',
		default: 'Aparência · Configurações'
	},
	'look.title': { group: g, label: 'Aparência: título', default: 'Aparência do site' },
	'look.introBefore': {
		group: g,
		label: 'Aparência: texto (antes de Textos)',
		default: 'Cores, logos e ícone que o cliente vê. Os textos ficam em'
	},
	'look.textsLink': { group: g, label: 'Aparência: link Textos', default: 'Textos' },
	'look.introMiddle': {
		group: g,
		label: 'Aparência: texto (antes de Editar cardápio)',
		default: '; produtos, fotos, adicionais e ingredientes ficam em'
	},
	'look.menuLink': {
		group: g,
		label: 'Aparência: link Editar cardápio',
		default: 'Editar cardápio'
	},
	'look.previewCta': { group: g, label: 'Aparência: prévia do botão', default: 'Pedir agora' },
	'look.previewMenu': { group: g, label: 'Aparência: prévia do fundo', default: 'Cardápio' },
	'look.colors': { group: g, label: 'Aparência: cores', default: 'Cores' },
	'look.primary': { group: g, label: 'Aparência: cor principal', default: 'Cor principal' },
	'look.primaryHint': {
		group: g,
		label: 'Aparência: cor principal (dica)',
		default: 'Botões, destaques e preços em evidência.'
	},
	'look.dark': { group: g, label: 'Aparência: cor escura', default: 'Cor escura' },
	'look.darkHint': {
		group: g,
		label: 'Aparência: cor escura (dica)',
		default: 'Topo, rodapé e o painel do carrinho.'
	},
	'look.background': { group: g, label: 'Aparência: fundo', default: 'Fundo da página' },
	'look.backgroundHint': {
		group: g,
		label: 'Aparência: fundo (dica)',
		default: 'Atrás do cardápio.'
	},
	'look.contrast.title': {
		group: g,
		label: 'Aparência: aviso de contraste',
		default: 'Pouco contraste. Estes textos ficariam difíceis de ler (mínimo 4,5:1):'
	},
	'look.contrast.ratio': {
		group: g,
		label: 'Aparência: contraste medido',
		default: '{ratio}'
	},
	'look.contrast.onPrimary': {
		group: g,
		label: 'Aparência: par botões',
		default: 'Texto preto na cor principal (botões)'
	},
	'look.contrast.onDark': {
		group: g,
		label: 'Aparência: par topo',
		default: 'Texto branco na cor escura (topo e rodapé)'
	},
	'look.contrast.primaryOnDark': {
		group: g,
		label: 'Aparência: par destaques',
		default: 'Cor principal sobre a cor escura (preços e destaques)'
	},
	'look.contrast.inkOnBackground': {
		group: g,
		label: 'Aparência: par texto',
		default: 'Texto do site sobre o fundo da página'
	},
	'look.contrast.mutedOnBackground': {
		group: g,
		label: 'Aparência: par texto secundário',
		default: 'Texto secundário sobre o fundo da página'
	},
	'look.saveColors': { group: g, label: 'Aparência: salvar cores', default: 'Salvar cores' },
	'look.resetColors': {
		group: g,
		label: 'Aparência: cores padrão',
		default: 'Voltar às cores padrão'
	},
	'look.images': { group: g, label: 'Aparência: logos e ícone', default: 'Logos e ícone' },
	'look.imagesHint': {
		group: g,
		label: 'Aparência: formatos de imagem',
		default: 'JPG, PNG ou WebP de até 5 MB.'
	},
	'look.logo': { group: g, label: 'Aparência: símbolo', default: 'Símbolo' },
	'look.logoHint': {
		group: g,
		label: 'Aparência: símbolo (dica)',
		default: 'No topo e onde falta foto. PNG com fundo transparente.'
	},
	'look.wordmark': { group: g, label: 'Aparência: nome em letras', default: 'Nome em letras' },
	'look.wordmarkHint': {
		group: g,
		label: 'Aparência: nome em letras (dica)',
		default: 'Ao lado do símbolo, no topo.'
	},
	'look.heroLogo': {
		group: g,
		label: 'Aparência: imagem do destaque',
		default: 'Imagem do destaque'
	},
	'look.heroLogoHint': {
		group: g,
		label: 'Aparência: imagem do destaque (dica)',
		default: 'Ao lado do texto do topo da página inicial. PNG com fundo transparente.'
	},
	'look.icon': { group: g, label: 'Aparência: ícone do app', default: 'Ícone do app' },
	'look.iconHint': {
		group: g,
		label: 'Aparência: ícone do app (dica)',
		default: 'Aba do navegador e atalho no celular. Quadrado, 512×512 px.'
	},
	'look.signIn': { group: g, label: 'Aparência: telas de entrar', default: 'Telas de entrar' },
	'look.loginImage': {
		group: g,
		label: 'Aparência: foto da entrada do cliente',
		default: 'Foto da tela de entrar do cliente'
	},
	'look.loginImageHint': {
		group: g,
		label: 'Aparência: foto da entrada do cliente (dica)',
		default:
			'Ao lado do formulário de entrar, no computador. Sem foto própria, usa a foto da página inicial.'
	},
	'look.staffBackground': {
		group: g,
		label: 'Aparência: fundo da entrada da equipe',
		default: 'Fundo da entrada da equipe'
	},
	'look.staffBackgroundHint': {
		group: g,
		label: 'Aparência: fundo da entrada da equipe (dica)',
		default: 'Atrás do formulário de entrar da equipe. Foto escura e larga, 1920 px.'
	},
	'look.default': { group: g, label: 'Aparência: marca padrão', default: '(padrão)' },
	'look.newImage': { group: g, label: 'Aparência: nova imagem', default: 'Nova imagem: {name}' },
	'look.upload': { group: g, label: 'Aparência: enviar', default: 'Enviar' },
	'look.useDefault': { group: g, label: 'Aparência: usar o padrão', default: 'Usar o padrão' },
	'hours.tabTitle': {
		group: g,
		label: 'Horários: título da aba',
		default: 'Horários · Configurações'
	},
	'hours.title': { group: g, label: 'Horários: título', default: 'Horário de funcionamento' },
	'hours.auto': {
		group: g,
		label: 'Horários: abrir e fechar sozinho',
		default: 'Abrir e fechar o site sozinho pelos horários abaixo'
	},
	'hours.autoHint': {
		group: g,
		label: 'Horários: abrir e fechar (dica)',
		default:
			'Fora do horário o site mostra quando a loja abre e não aceita pedidos. O botão "Pausar pedidos" continua valendo a qualquer hora. Se fechar depois da meia-noite, use por exemplo 18:00 até 02:00.'
	},
	'hours.byDay': { group: g, label: 'Horários: por dia', default: 'Horários por dia' },
	'hours.opens': { group: g, label: 'Horários: abre', default: '{day}: abre' },
	'hours.until': { group: g, label: 'Horários: até', default: 'até' },
	'hours.closes': { group: g, label: 'Horários: fecha', default: '{day}: fecha' },
	'hours.removeShift': { group: g, label: 'Horários: remover horário', default: 'Remover horário' },
	'hours.closed': { group: g, label: 'Horários: fechado', default: 'Fechado' },
	'hours.addShift': { group: g, label: 'Horários: adicionar horário', default: '+ Horário' },
	'hours.copy': { group: g, label: 'Horários: copiar para todos', default: 'Copiar para todos' },
	'hours.closures': { group: g, label: 'Horários: dias fechados', default: 'Dias fechados' },
	'hours.closuresHint': {
		group: g,
		label: 'Horários: dias fechados (dica)',
		default: 'Feriados, folgas e reformas. Valem o dia inteiro.'
	},
	'hours.date': { group: g, label: 'Horários: data', default: 'Data' },
	'hours.reasonOptional': {
		group: g,
		label: 'Horários: motivo (opcional)',
		default: 'Motivo (opcional)'
	},
	'hours.reason': { group: g, label: 'Horários: motivo', default: 'Motivo' },
	'hours.removeDay': { group: g, label: 'Horários: remover dia', default: 'Remover dia' },
	'hours.addClosure': {
		group: g,
		label: 'Horários: adicionar dia fechado',
		default: '+ Dia fechado'
	},
	'hours.saved': { group: g, label: 'Horários: salvos', default: 'Horários salvos.' },
	'hours.save': { group: g, label: 'Horários: salvar', default: 'Salvar horários' },
	'team.tabTitle': { group: g, label: 'Equipe: título da aba', default: 'Equipe · Configurações' },
	'team.title': { group: g, label: 'Equipe: título', default: 'Equipe' },
	'team.added': { group: g, label: 'Equipe: adicionado', default: '{name} adicionado(a).' },
	'team.you': { group: g, label: 'Equipe: você', default: '(você)' },
	'team.roleOf': { group: g, label: 'Equipe: perfil de', default: 'Perfil de {name}' },
	'team.role.admin': { group: g, label: 'Equipe: perfil admin', default: 'Admin' },
	'team.role.attendant': { group: g, label: 'Equipe: perfil atendente', default: 'Atendente' },
	'team.role.kitchen': { group: g, label: 'Equipe: perfil cozinha', default: 'Cozinha' },
	'team.deactivate': { group: g, label: 'Equipe: desativar', default: 'Desativar' },
	'team.reactivate': { group: g, label: 'Equipe: reativar', default: 'Reativar' },
	'team.deactivateHint': {
		group: g,
		label: 'Equipe: desativar (dica)',
		default: 'Desativar uma pessoa encerra o acesso imediatamente, em todos os aparelhos.'
	},
	'team.add': { group: g, label: 'Equipe: adicionar pessoa', default: 'Adicionar pessoa' },
	'team.name': { group: g, label: 'Equipe: nome', default: 'Nome' },
	'team.email': { group: g, label: 'Equipe: e-mail', default: 'E-mail' },
	'team.role': { group: g, label: 'Equipe: perfil', default: 'Perfil' },
	'team.password': { group: g, label: 'Equipe: senha inicial', default: 'Senha inicial (mín. 10)' },
	'team.linkHint': {
		group: g,
		label: 'Equipe: vincular conta existente',
		default: 'Deixe a senha vazia para vincular uma conta que já existe no Supabase.'
	},
	'team.createHint': {
		group: g,
		label: 'Equipe: criar conta no Supabase',
		default: 'Crie a conta em Supabase → Authentication e depois vincule pelo e-mail aqui.'
	},
	'team.submit': { group: g, label: 'Equipe: botão adicionar', default: 'Adicionar' },
	'delivery.tabTitle': {
		group: g,
		label: 'Entrega: título da aba',
		default: 'Entrega · Configurações'
	},
	'delivery.title': { group: g, label: 'Entrega: título', default: 'Áreas e taxas de entrega' },
	'delivery.new': { group: g, label: 'Entrega: nova área', default: 'Nova área' },
	'delivery.intro': {
		group: g,
		label: 'Entrega: texto',
		default:
			'A taxa é calculada no servidor e gravada no pedido. Regras por CEP (prefixo) valem antes das de bairro com a mesma prioridade; menor prioridade vence.'
	},
	'delivery.name': { group: g, label: 'Entrega: nome', default: 'Nome' },
	'delivery.kind': { group: g, label: 'Entrega: tipo', default: 'Tipo' },
	'delivery.neighborhood': { group: g, label: 'Entrega: bairro', default: 'Bairro' },
	'delivery.cepPrefix': { group: g, label: 'Entrega: prefixo de CEP', default: 'Prefixo de CEP' },
	'delivery.value': {
		group: g,
		label: 'Entrega: bairro ou prefixo',
		default: 'Bairro ou prefixo de CEP'
	},
	'delivery.fee': { group: g, label: 'Entrega: taxa', default: 'Taxa (R$)' },
	'delivery.min': { group: g, label: 'Entrega: pedido mínimo', default: 'Pedido mínimo (R$)' },
	'delivery.priority': { group: g, label: 'Entrega: prioridade', default: 'Prioridade' },
	'delivery.active': { group: g, label: 'Entrega: ativa', default: 'Ativa' },
	'delivery.inactive': { group: g, label: 'Entrega: inativa', default: 'Inativa' },
	'delivery.cancel': { group: g, label: 'Entrega: cancelar', default: 'Cancelar' },
	'delivery.col.area': { group: g, label: 'Entrega: coluna área', default: 'Área' },
	'delivery.col.fee': { group: g, label: 'Entrega: coluna taxa', default: 'Taxa' },
	'delivery.col.min': { group: g, label: 'Entrega: coluna mínimo', default: 'Mínimo' },
	'delivery.col.status': { group: g, label: 'Entrega: coluna status', default: 'Status' },
	'delivery.cep': { group: g, label: 'Entrega: CEP na tabela', default: 'CEP {value}…' },
	'delivery.edit': { group: g, label: 'Entrega: editar', default: 'Editar' },
	'delivery.delete': { group: g, label: 'Entrega: excluir', default: 'Excluir' },
	'delivery.deleteConfirm': {
		group: g,
		label: 'Entrega: confirmar exclusão',
		default: 'Excluir {name}?'
	},
	'delivery.deleteText': {
		group: g,
		label: 'Entrega: texto da exclusão',
		default: 'A área deixa de receber entregas pelo site.'
	},
	'delivery.empty': {
		group: g,
		label: 'Entrega: sem áreas',
		default: 'Nenhuma área cadastrada. Sem áreas, a entrega própria fica indisponível no site.'
	},
	'delivery.testCep': { group: g, label: 'Entrega: testar CEP', default: 'Testar CEP' },
	'delivery.testHood': { group: g, label: 'Entrega: bairro (teste)', default: 'Bairro' },
	'delivery.test': { group: g, label: 'Entrega: ver taxa', default: 'Ver taxa' },
	'delivery.rule': {
		group: g,
		label: 'Entrega: resultado do teste',
		default: 'Regra {name}: taxa {fee}, mínimo {min}.'
	},
	'delivery.outside': {
		group: g,
		label: 'Entrega: fora da área',
		default: 'Fora da área de entrega.'
	},

	'texts.tabTitle': { group: g, label: 'Textos: título da aba', default: 'Textos · Configurações' },
	'texts.title': { group: g, label: 'Textos: título', default: 'Textos do site' },
	'texts.intro': {
		group: g,
		label: 'Textos: texto',
		default:
			'Tudo o que o cliente e a equipe leem: avisos, botões, títulos e mensagens de erro. Deixe um texto vazio para voltar ao padrão. Palavras entre chaves são preenchidas pelo site e precisam continuar no texto.'
	},
	'texts.changed': { group: g, label: 'Textos: alterados', default: '{n} alterado(s).' },
	'texts.search': { group: g, label: 'Textos: procurar', default: 'Procurar texto' },
	'texts.count': { group: g, label: 'Textos: quantidade', default: '{n} texto(s)' },
	'texts.changedMark': { group: g, label: 'Textos: marca alterado', default: 'alterado' },
	'texts.needs': { group: g, label: 'Textos: precisa ter', default: 'Precisa ter: {vars}' },
	'texts.saved': {
		group: g,
		label: 'Textos: salvo',
		default: 'Salvo. O site já mostra os textos novos.'
	},
	'texts.save': { group: g, label: 'Textos: salvar', default: 'Salvar textos' },
	'homeEdit.tabTitle': {
		group: g,
		label: 'Página inicial: título da aba',
		default: 'Página inicial · Configurações'
	},
	'homeEdit.title': { group: g, label: 'Página inicial: título', default: 'Página inicial' },
	'homeEdit.intro': {
		group: g,
		label: 'Página inicial: introdução',
		default:
			'O que o cliente vê ao abrir o site: a foto do topo, os textos, os botões e os blocos abaixo.'
	},
	'homeEdit.view': { group: g, label: 'Página inicial: ver no site', default: 'Ver no site' },
	'homeEdit.images': { group: g, label: 'Página inicial: fotos', default: 'Fotos do topo' },
	'homeEdit.heroImage': {
		group: g,
		label: 'Página inicial: foto de fundo',
		default: 'Foto de fundo'
	},
	'homeEdit.heroImageHint': {
		group: g,
		label: 'Página inicial: foto de fundo (dica)',
		default: 'Ocupa o topo da página. Horizontal, 1920×1080 px ou maior.'
	},
	'homeEdit.hero': { group: g, label: 'Página inicial: topo', default: 'Topo da página' },
	'homeEdit.align': {
		group: g,
		label: 'Página inicial: posição do texto',
		default: 'Posição do texto'
	},
	'homeEdit.align.left': {
		group: g,
		label: 'Página inicial: texto à esquerda',
		default: 'À esquerda'
	},
	'homeEdit.align.center': {
		group: g,
		label: 'Página inicial: texto ao centro',
		default: 'Ao centro'
	},
	'homeEdit.size': { group: g, label: 'Página inicial: altura do topo', default: 'Altura do topo' },
	'homeEdit.size.tall': {
		group: g,
		label: 'Página inicial: topo alto',
		default: 'Alto (quase a tela toda)'
	},
	'homeEdit.size.compact': {
		group: g,
		label: 'Página inicial: topo baixo',
		default: 'Baixo (o cardápio aparece logo)'
	},
	'homeEdit.cutout': {
		group: g,
		label: 'Página inicial: mostrar imagem do destaque',
		default: 'Mostrar a imagem do destaque ao lado do texto'
	},
	'homeEdit.cutoutHint': {
		group: g,
		label: 'Página inicial: mostrar imagem do destaque (dica)',
		default: 'Só com o texto à esquerda, em telas grandes.'
	},
	'homeEdit.status': {
		group: g,
		label: 'Página inicial: mostrar aberto/fechado',
		default: 'Mostrar se a loja está aberta'
	},
	'homeEdit.modes': {
		group: g,
		label: 'Página inicial: mostrar modos',
		default: 'Mostrar retirada, entrega e tempo de preparo'
	},
	'homeEdit.texts': { group: g, label: 'Página inicial: textos', default: 'Textos' },
	'homeEdit.textsHint': {
		group: g,
		label: 'Página inicial: textos (dica)',
		default: 'Os mesmos de Textos do site. Deixe vazio para voltar ao texto padrão.'
	},
	'homeEdit.buttons': { group: g, label: 'Página inicial: botões', default: 'Botões' },
	'homeEdit.primaryHref': {
		group: g,
		label: 'Página inicial: link do botão principal',
		default: 'Link do botão principal'
	},
	'homeEdit.secondaryHref': {
		group: g,
		label: 'Página inicial: link do segundo botão',
		default: 'Link do segundo botão'
	},
	'homeEdit.secondaryHint': {
		group: g,
		label: 'Página inicial: segundo botão (dica)',
		default: 'Deixe vazio para não mostrar o segundo botão.'
	},
	'homeEdit.linkHint': {
		group: g,
		label: 'Página inicial: formato do link',
		default: 'Uma página do site, como /cardapio ou /p/sobre, ou um endereço https://'
	},
	'homeEdit.blocks': { group: g, label: 'Página inicial: blocos', default: 'Blocos da página' },
	'homeEdit.featured': {
		group: g,
		label: 'Página inicial: mostrar destaques',
		default: 'Mostrar a vitrine de destaques'
	},
	'homeEdit.featuredCategory': {
		group: g,
		label: 'Página inicial: categoria dos destaques',
		default: 'Produtos da vitrine'
	},
	'homeEdit.featuredAuto': {
		group: g,
		label: 'Página inicial: destaques automáticos',
		default: 'Automático (categoria Destaques ou os primeiros com foto)'
	},
	'homeEdit.featuredCount': {
		group: g,
		label: 'Página inicial: quantidade de destaques',
		default: 'Quantos produtos'
	},
	'homeEdit.order': {
		group: g,
		label: 'Página inicial: ordem dos blocos',
		default: 'Ordem abaixo da foto'
	},
	'homeEdit.orderHint': {
		group: g,
		label: 'Página inicial: ordem dos blocos (dica)',
		default: 'A foto de abertura fica sempre no topo.'
	},
	'homeEdit.block.featured': {
		group: g,
		label: 'Página inicial: nome do bloco destaques',
		default: 'Vitrine de destaques'
	},
	'homeEdit.block.menuButton': {
		group: g,
		label: 'Página inicial: nome do bloco botão',
		default: 'Botão do cardápio completo'
	},
	'homeEdit.moveUp': { group: g, label: 'Página inicial: subir bloco', default: 'Subir {name}' },
	'homeEdit.moveDown': {
		group: g,
		label: 'Página inicial: descer bloco',
		default: 'Descer {name}'
	},
	'homeEdit.menuButton': {
		group: g,
		label: 'Página inicial: mostrar botão do cardápio',
		default: 'Mostrar o botão do cardápio completo'
	},
	'homeEdit.save': { group: g, label: 'Página inicial: salvar', default: 'Salvar página inicial' },
	'homeEdit.saved': {
		group: g,
		label: 'Página inicial: salvo',
		default: 'Salvo. O site já mostra a página nova.'
	}
} as const satisfies Record<string, TextDef>;
