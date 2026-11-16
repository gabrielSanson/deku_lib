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
	'store.unpaidPix': {
		group: g,
		label: 'Loja: prazo do Pix não pago',
		default: 'Cancelar Pix não pago após (min)'
	},
	'store.unpaidCounter': {
		group: g,
		label: 'Loja: prazo do totem não pago',
		default: 'Cancelar pedido do totem não pago após (min)'
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
	'payments.online': {
		group: g,
		label: 'Pagamentos: título online',
		default: 'Pagamento online (PSP)'
	},
	'payments.onlineHint': {
		group: g,
		label: 'Pagamentos: explicação online',
		default:
			'Com um provedor, o Pix confirma sozinho e o cliente pode pagar com cartão. Sem provedor, o site usa o Pix na chave da loja.'
	},
	'payments.provider': { group: g, label: 'Pagamentos: provedor', default: 'Provedor' },
	'payments.providerNone': { group: g, label: 'Pagamentos: nenhum', default: 'Nenhum' },
	'payments.providerEfi': {
		group: g,
		label: 'Pagamentos: Efí',
		default: 'Efí (Pix automático)'
	},
	'payments.efiHint': {
		group: g,
		label: 'Pagamentos: Efí, como configurar',
		default:
			'No app da Efí: crie uma aplicação com os escopos de Pix (cobranças, webhooks e devoluções), gere o certificado .p12 e cadastre uma chave Pix na conta. O pagamento é confirmado sozinho; a taxa é cobrada pela Efí.'
	},
	'payments.efiUnverified': {
		group: g,
		label: 'Pagamentos: Efí ainda não testada',
		default:
			'Integração ainda não testada com a Efí. Use primeiro o ambiente de homologação e faça um Pix de teste antes de usar com clientes.'
	},
	'payments.efiClientId': { group: g, label: 'Pagamentos: Efí Client ID', default: 'Client ID' },
	'payments.efiClientSecret': {
		group: g,
		label: 'Pagamentos: Efí Client Secret',
		default: 'Client Secret'
	},
	'payments.efiPixKey': {
		group: g,
		label: 'Pagamentos: Efí chave Pix',
		default: 'Chave Pix cadastrada na Efí'
	},
	'payments.efiCert': {
		group: g,
		label: 'Pagamentos: Efí certificado',
		default: 'Certificado (.p12)'
	},
	'payments.efiCertPass': {
		group: g,
		label: 'Pagamentos: Efí senha do certificado',
		default: 'Senha do certificado (se tiver)'
	},
	'payments.efiSandbox': {
		group: g,
		label: 'Pagamentos: Efí homologação',
		default: 'Ambiente de homologação (testes, sem dinheiro de verdade)'
	},
	'payments.efiWebhook': {
		group: g,
		label: 'Pagamentos: Efí registrar aviso',
		default: 'Registrar aviso de pagamento na Efí'
	},
	'payments.efiWebhookDone': {
		group: g,
		label: 'Pagamentos: Efí aviso registrado',
		default: 'Aviso de pagamento registrado em {date}.'
	},
	'payments.providerStub': {
		group: g,
		label: 'Pagamentos: simulador',
		default: 'Simulador (só para testes)'
	},
	'payments.methodPix': {
		group: g,
		label: 'Pagamentos: Pix online',
		default: 'Pix com confirmação automática'
	},
	'payments.methodCard': {
		group: g,
		label: 'Pagamentos: cartão online',
		default: 'Cartão (página do Mercado Pago)'
	},
	'payments.token': {
		group: g,
		label: 'Pagamentos: access token',
		default: 'Access Token de produção'
	},
	'payments.tokenHint': {
		group: g,
		label: 'Pagamentos: dica do token',
		default: 'Mercado Pago → Suas integrações → sua aplicação → Credenciais de produção.'
	},
	'payments.secret': {
		group: g,
		label: 'Pagamentos: segredo webhook',
		default: 'Assinatura secreta do webhook'
	},
	'payments.webhookUrl': {
		group: g,
		label: 'Pagamentos: URL do webhook',
		default: 'Em Webhooks, cadastre esta URL e marque o evento "Pagamentos":'
	},
	'payments.keySaved': {
		group: g,
		label: 'Pagamentos: chave salva',
		default: 'Já salvo. Deixe em branco para manter.'
	},
	'payments.fromEnv': {
		group: g,
		label: 'Pagamentos: vem do .env',
		default:
			'Hoje o provedor vem do arquivo .env do servidor. Salvar aqui passa a valer no lugar dele.'
	},
	'payments.onlineSave': {
		group: g,
		label: 'Pagamentos: salvar online',
		default: 'Salvar pagamento online'
	},
	'payments.onlineSaved': {
		group: g,
		label: 'Pagamentos: online salvo',
		default: 'Pagamento online salvo.'
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
	'fiscal.tax.section': {
		group: g,
		label: 'Nota: reforma tributária',
		default: 'Reforma tributária (IBS e CBS)'
	},
	'fiscal.tax.hint': {
		group: g,
		label: 'Nota: reforma (explicação)',
		default:
			'A partir de 2027 as notas do Simples Nacional também levam IBS e CBS em cada item. Em 2026 é opcional para o Simples.'
	},
	'fiscal.tax.crt': {
		group: g,
		label: 'Nota: regime tributário',
		default: 'Regime tributário (CRT)'
	},
	'fiscal.tax.crt1': {
		group: g,
		label: 'Nota: Simples Nacional',
		default: '1 · Simples Nacional'
	},
	'fiscal.tax.crt2': {
		group: g,
		label: 'Nota: Simples excesso',
		default: '2 · Simples Nacional, excesso de sublimite'
	},
	'fiscal.tax.crt3': {
		group: g,
		label: 'Nota: regime normal',
		default: '3 · Regime normal'
	},
	'fiscal.tax.crt4': {
		group: g,
		label: 'Nota: MEI',
		default: '4 · MEI'
	},
	'fiscal.tax.enabled': {
		group: g,
		label: 'Nota: enviar IBS e CBS',
		default: 'Enviar IBS e CBS nas notas'
	},
	'fiscal.tax.cst': {
		group: g,
		label: 'Nota: CST padrão IBS/CBS',
		default: 'CST do IBS/CBS (padrão)'
	},
	'fiscal.tax.class': {
		group: g,
		label: 'Nota: cClassTrib padrão',
		default: 'cClassTrib (padrão)'
	},
	'fiscal.tax.accountant': {
		group: g,
		label: 'Nota: confirme com o contador',
		default:
			'Confirme o regime, o CST e o cClassTrib com seu contador. Produtos podem ter códigos próprios no editor do cardápio.'
	},
	'fiscal.tax.confirm': {
		group: g,
		label: 'Nota: confirmar alíquotas do ano',
		default:
			'Confirme com seu contador as alíquotas de IBS e CBS de {year} e salve a tabela abaixo.'
	},
	'fiscal.rates.section': {
		group: g,
		label: 'Nota: alíquotas por ano',
		default: 'Alíquotas por ano'
	},
	'fiscal.rates.hint': {
		group: g,
		label: 'Nota: alíquotas (explicação)',
		default:
			'Em porcentagem, com até 4 casas (0,9 = 0,9%). Para incluir um ano, preencha a última linha.'
	},
	'fiscal.rates.year': {
		group: g,
		label: 'Nota: ano',
		default: 'Ano'
	},
	'fiscal.rates.cbs': {
		group: g,
		label: 'Nota: CBS',
		default: 'CBS (%)'
	},
	'fiscal.rates.ibsUf': {
		group: g,
		label: 'Nota: IBS estadual',
		default: 'IBS estadual (%)'
	},
	'fiscal.rates.ibsMun': {
		group: g,
		label: 'Nota: IBS municipal',
		default: 'IBS municipal (%)'
	},
	'fiscal.rates.note': {
		group: g,
		label: 'Nota: observação',
		default: 'Observação'
	},
	'fiscal.rates.save': {
		group: g,
		label: 'Nota: salvar alíquotas',
		default: 'Salvar alíquotas confirmadas'
	},
	'fiscal.ready.title': {
		group: g,
		label: 'Nota: o que falta',
		default: 'Antes de ligar a nota fiscal'
	},
	'fiscal.ready.cnpj': {
		group: g,
		label: 'Nota: pronto CNPJ',
		default: 'CNPJ da loja'
	},
	'fiscal.ready.token': {
		group: g,
		label: 'Nota: pronto token',
		default: 'Token da Focus NFe'
	},
	'fiscal.ready.environment': {
		group: g,
		label: 'Nota: pronto ambiente',
		default: 'Ambiente de produção (comece em homologação)'
	},
	'fiscal.ready.ncm': {
		group: g,
		label: 'Nota: pronto NCM',
		default: 'NCM padrão'
	},
	'fiscal.ready.crt': {
		group: g,
		label: 'Nota: pronto regime',
		default: 'Regime tributário'
	},
	'fiscal.ready.ibsCbs': {
		group: g,
		label: 'Nota: pronto IBS/CBS',
		default: 'IBS e CBS nas notas (obrigatório no Simples a partir de 2027)'
	},
	'fiscal.ready.homologation': {
		group: g,
		label: 'Nota: pronto teste',
		default: 'Uma nota de teste autorizada em homologação'
	},
	'fiscal.ready.ok': {
		group: g,
		label: 'Nota: pronto ok',
		default: 'Pronto'
	},
	'fiscal.ready.warn': {
		group: g,
		label: 'Nota: pronto atenção',
		default: 'Atenção'
	},
	'fiscal.ready.missing': {
		group: g,
		label: 'Nota: pronto falta',
		default: 'Falta'
	},
	'fiscal.ready.test': {
		group: g,
		label: 'Nota: emitir teste',
		default: 'Emitir nota de teste'
	},
	'fiscal.ready.testHint': {
		group: g,
		label: 'Nota: teste (explicação)',
		default: 'Uma nota de R$ 1,00 em homologação, sem valor fiscal e fora dos relatórios.'
	},
	'fiscal.ready.testOk': {
		group: g,
		label: 'Nota: teste autorizado',
		default: 'Nota de teste autorizada.'
	},
	'fiscal.ready.testFailed': {
		group: g,
		label: 'Nota: teste recusado',
		default: 'A nota de teste não foi autorizada: {message}'
	},
	'fiscal.failed.title': {
		group: g,
		label: 'Nota: notas com erro',
		default: 'Notas com erro'
	},
	'fiscal.failed.order': {
		group: g,
		label: 'Nota: pedido com erro',
		default: 'Pedido #{number}'
	},
	'fiscal.failed.retry': {
		group: g,
		label: 'Nota: tentar de novo',
		default: 'Tentar de novo'
	},
	'fiscal.ncm': { group: g, label: 'Nota fiscal: NCM', default: 'NCM padrão' },
	'fiscal.ncmPlaceholder': { group: g, label: 'Nota fiscal: exemplo de NCM', default: '8 números' },
	'fiscal.cfop': { group: g, label: 'Nota fiscal: CFOP', default: 'CFOP' },
	'fiscal.csosn': { group: g, label: 'Nota fiscal: CSOSN', default: 'CSOSN / CST' },
	'fiscal.ncmHint': {
		group: g,
		label: 'Nota fiscal: dica NCM',
		default:
			'O NCM é o código fiscal do produto; o contador informa qual usar para cada produto. CFOP 5102 e CSOSN 102 são comuns no Simples Nacional, mas confirme.'
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
	},
	'system.tabTitle': { group: g, label: 'Sistema: título da aba', default: 'Sistema' },
	'system.title': { group: g, label: 'Sistema: título', default: 'Sistema' },
	'system.backups': {
		group: g,
		label: 'Sistema: cópias de segurança',
		default: 'Cópias de segurança'
	},
	'system.backupsHint': {
		group: g,
		label: 'Sistema: explicação das cópias',
		default:
			'Toda noite o servidor guarda uma cópia do banco de dados e, se configurado, manda uma cópia para fora da máquina. Uma vez por semana ele testa se a cópia volta inteira.'
	},
	'system.lastDump': { group: g, label: 'Sistema: última cópia', default: 'Última cópia' },
	'system.lastOffsite': {
		group: g,
		label: 'Sistema: última cópia fora da máquina',
		default: 'Última cópia fora da máquina'
	},
	'system.lastRestore': {
		group: g,
		label: 'Sistema: último teste de restauração',
		default: 'Último teste de restauração'
	},
	'system.never': { group: g, label: 'Sistema: nunca', default: 'Nenhuma ainda' },
	'system.ok': { group: g, label: 'Sistema: em dia', default: 'Em dia' },
	'system.late': { group: g, label: 'Sistema: atrasado', default: 'Atrasado' },
	'system.failed': { group: g, label: 'Sistema: falhou', default: 'Falhou' },
	'system.size': { group: g, label: 'Sistema: tamanho', default: '{size} MB' },
	'system.orders': {
		group: g,
		label: 'Sistema: pedidos na cópia',
		default: '{count} pedidos na cópia'
	},
	'system.alerts': {
		group: g,
		label: 'Sistema: alertas',
		default: 'Alertas'
	},
	'system.alertsHint': {
		group: g,
		label: 'Sistema: explicação dos alertas',
		default:
			'Avisamos quando o worker para, quando o iFood não responde, quando a cópia de segurança atrasa ou quando a loja fica sem pedidos num horário que costuma ter movimento.'
	},
	'system.emails': {
		group: g,
		label: 'Sistema: e-mails',
		default: 'E-mails que recebem alertas (separados por vírgula)'
	},
	'system.noSmtp': {
		group: g,
		label: 'Sistema: sem SMTP',
		default: 'Para mandar e-mails, preencha SMTP_URL no arquivo .env do servidor.'
	},
	'system.push': {
		group: g,
		label: 'Sistema: push ligado',
		default: 'Avisar também nos aparelhos cadastrados'
	},
	'system.noOrders': {
		group: g,
		label: 'Sistema: alerta sem pedidos',
		default: 'Avisar quando a loja ficar sem pedidos num horário de movimento'
	},
	'system.noOrdersMinutes': {
		group: g,
		label: 'Sistema: minutos sem pedidos',
		default: 'Minutos sem pedidos antes de avisar'
	},
	'system.saved': {
		group: g,
		label: 'Sistema: salvo',
		default: 'Alertas salvos.'
	},
	'system.device': {
		group: g,
		label: 'Sistema: receber neste aparelho',
		default: 'Receber alertas neste aparelho'
	},
	'system.deviceDone': {
		group: g,
		label: 'Sistema: aparelho cadastrado',
		default: 'Este aparelho vai receber os alertas.'
	},
	'system.deviceBlocked': {
		group: g,
		label: 'Sistema: notificações bloqueadas',
		default: 'As notificações estão bloqueadas neste navegador.'
	},
	'system.deviceUnsupported': {
		group: g,
		label: 'Sistema: sem suporte a push',
		default: 'Este navegador não recebe notificações.'
	},
	'system.test': {
		group: g,
		label: 'Sistema: enviar teste',
		default: 'Enviar alerta de teste'
	},
	'system.testSent': {
		group: g,
		label: 'Sistema: teste enviado',
		default: 'Teste enviado: {email} e-mails, {push} aparelhos.'
	},
	'system.open': {
		group: g,
		label: 'Sistema: alertas abertos',
		default: 'Agora'
	},
	'system.noneOpen': {
		group: g,
		label: 'Sistema: nenhum alerta',
		default: 'Nenhum problema agora.'
	},
	'system.since': {
		group: g,
		label: 'Sistema: desde',
		default: 'desde {time}'
	},
	'system.setupTitle': {
		group: g,
		label: 'Sistema: como configurar cópia externa',
		default: 'Como mandar as cópias para fora da máquina'
	},
	'system.setup1': {
		group: g,
		label: 'Sistema: passo 1',
		default:
			'Crie um lugar para guardar as cópias: um bucket no Backblaze B2, uma pasta no Google Drive ou outro serviço aceito pelo rclone.'
	},
	'system.setup2': {
		group: g,
		label: 'Sistema: passo 2',
		default:
			'No servidor, rode deploy/shop.sh run --rm shop-backup rclone config e siga as perguntas. O arquivo fica em deploy/backup/rclone.conf.'
	},
	'system.setup3': {
		group: g,
		label: 'Sistema: passo 3',
		default:
			'Em deploy/supabase/.env, preencha RCLONE_REMOTE (por exemplo b2:minha-loja/banco) e rode deploy/shop.sh up -d.'
	},
	'system.setup4': {
		group: g,
		label: 'Sistema: passo 4',
		default:
			'Na manhã seguinte, esta página deve mostrar a cópia fora da máquina em dia. Guarde também uma cópia do arquivo .env em lugar seguro.'
	},
	'ifoodLink.title': { group: g, label: 'iFood: conectar (título)', default: 'Conectar com iFood' },
	'ifoodLink.intro': {
		group: g,
		label: 'iFood: conectar (explicação)',
		default:
			'Ligue sua loja do iFood a este sistema sem criar chaves de desenvolvedor: peça um código, digite no Portal do Parceiro do iFood e cole aqui o código de autorização que ele mostrar.'
	},
	'ifoodLink.start': { group: g, label: 'iFood: pedir código', default: 'Pedir código' },
	'ifoodLink.code': {
		group: g,
		label: 'iFood: código para o portal',
		default: 'Digite este código no Portal do Parceiro do iFood:'
	},
	'ifoodLink.open': {
		group: g,
		label: 'iFood: abrir portal',
		default: 'Abrir o Portal do Parceiro'
	},
	'ifoodLink.authCode': {
		group: g,
		label: 'iFood: código de autorização',
		default: 'Código de autorização do iFood'
	},
	'ifoodLink.finish': { group: g, label: 'iFood: concluir', default: 'Conectar' },
	'ifoodLink.linked': {
		group: g,
		label: 'iFood: conectada',
		default: 'Loja conectada ao iFood desde {date}.'
	},
	'ifoodLink.unlink': { group: g, label: 'iFood: desconectar', default: 'Desconectar' },
	'ifoodLink.advanced': {
		group: g,
		label: 'iFood: avançado',
		default: 'Avançado: usar as chaves de desenvolvedor da loja'
	},
	'ifoodLink.portalTip': {
		group: g,
		label: 'iFood: dica do portal',
		default:
			'No Portal do Parceiro do iFood, desligue o aceite automático e a impressão automática: os pedidos passam a ser aceitos e impressos por aqui.'
	},
	'ifoodHomolog.title': {
		group: g,
		label: 'iFood: homologação (título)',
		default: 'Roteiro de homologação'
	},
	'ifoodHomolog.intro': {
		group: g,
		label: 'iFood: homologação (explicação)',
		default:
			'Enquanto ligado, o sistema guarda os pedidos e respostas completos do iFood para a revisão deles e marca cada teste quando ele dá certo.'
	},
	'ifoodHomolog.on': { group: g, label: 'iFood: ligar homologação', default: 'Ligar homologação' },
	'ifoodHomolog.off': {
		group: g,
		label: 'iFood: desligar homologação',
		default: 'Desligar homologação'
	},
	'ifoodHomolog.case.receive': {
		group: g,
		label: 'Homologação: receber',
		default: 'Receber um pedido'
	},
	'ifoodHomolog.case.confirm': {
		group: g,
		label: 'Homologação: confirmar',
		default: 'Confirmar o pedido'
	},
	'ifoodHomolog.case.startPreparation': {
		group: g,
		label: 'Homologação: preparo',
		default: 'Iniciar o preparo'
	},
	'ifoodHomolog.case.readyToPickup': {
		group: g,
		label: 'Homologação: pronto',
		default: 'Avisar que está pronto para retirada'
	},
	'ifoodHomolog.case.dispatch': {
		group: g,
		label: 'Homologação: saiu para entrega',
		default: 'Avisar que saiu para entrega (entregador da loja)'
	},
	'ifoodHomolog.case.shopCancel': {
		group: g,
		label: 'Homologação: cancelar pela loja',
		default: 'Cancelar pela loja e receber a confirmação do iFood'
	},
	'ifoodHomolog.case.customerCancel': {
		group: g,
		label: 'Homologação: cancelado pelo cliente',
		default: 'Receber um cancelamento feito pelo cliente ou pelo iFood'
	},
	'order.cancelRequested': {
		group: g,
		label: 'Pedido: cancelamento aguardando app',
		default: 'Cancelamento pedido ao app de entrega. Aguardando a confirmação.'
	},
	'od.tabTitle': {
		group: g,
		label: 'Open Delivery: título da aba',
		default: '99Food e Keeta · Configurações'
	},
	'od.intro': {
		group: g,
		label: 'Open Delivery: introdução',
		default:
			'Receba pedidos do 99Food e do Keeta no mesmo quadro dos outros pedidos. Os dados de acesso vêm do portal de cada parceiro.'
	},
	'od.unverified': {
		group: g,
		label: 'Open Delivery: ainda não testado',
		default:
			'Integração ainda não testada com os parceiros. Ligue só depois de um pedido de teste combinado com o parceiro.'
	},
	'od.baseUrl': { group: g, label: 'Open Delivery: endereço da API', default: 'Endereço da API' },
	'od.clientId': { group: g, label: 'Open Delivery: Client ID', default: 'Client ID' },
	'od.clientSecret': { group: g, label: 'Open Delivery: Client Secret', default: 'Client Secret' },
	'od.secretKept': {
		group: g,
		label: 'Open Delivery: segredo guardado',
		default: 'Guardado. Deixe em branco para manter.'
	},
	'od.merchantId': {
		group: g,
		label: 'Open Delivery: ID da loja',
		default: 'ID da loja no parceiro'
	},
	'od.save': { group: g, label: 'Open Delivery: salvar', default: 'Salvar' },
	'od.test': { group: g, label: 'Open Delivery: testar', default: 'Testar conexão' },
	'od.turnOn': { group: g, label: 'Open Delivery: ligar', default: 'Ligar pedidos' },
	'od.turnOff': { group: g, label: 'Open Delivery: desligar', default: 'Desligar pedidos' },
	'od.webhook': {
		group: g,
		label: 'Open Delivery: endereço do webhook',
		default: 'Endereço para avisos (webhook), informe no portal do parceiro:'
	},
	'od.lastCheck': {
		group: g,
		label: 'Open Delivery: último teste',
		default: 'Último teste: {date}'
	},
	'od.lastPoll': {
		group: g,
		label: 'Open Delivery: última busca',
		default: 'Última busca de pedidos: {date}'
	}
} as const satisfies Record<string, TextDef>;
