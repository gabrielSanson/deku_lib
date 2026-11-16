// Texts of WhatsApp: the bot's replies (shop-editable) and the Configurações → WhatsApp page.
import type { TextDef } from './catalog';

const w = 'whatsapp' as const;
const s = 'staffSettings' as const;

export const WHATSAPP_TEXTS = {
	'wa.greeting': {
		group: w,
		label: 'WhatsApp: primeira resposta',
		default:
			'Olá! Aqui é {shop}. {state}\nFaça seu pedido pelo cardápio: {link}\nPara saber do seu pedido, escreva "meu pedido". Para falar com alguém da loja, escreva "atendente".'
	},
	'wa.open': { group: w, label: 'WhatsApp: loja aberta', default: 'Estamos abertos agora.' },
	'wa.closed': {
		group: w,
		label: 'WhatsApp: loja fechada',
		default: 'Estamos fechados agora, mas você já pode ver o cardápio.'
	},
	'wa.status': {
		group: w,
		label: 'WhatsApp: situação do pedido',
		default: 'Seu pedido nº {number} está: {status}.'
	},
	'wa.noOrder': {
		group: w,
		label: 'WhatsApp: sem pedido',
		default: 'Não encontrei pedidos recentes deste número.'
	},
	'wa.human': {
		group: w,
		label: 'WhatsApp: chamar atendente',
		default: 'Certo! Avisamos a equipe e alguém vai responder por aqui em breve.'
	},
	'wa.optIn': {
		group: 'checkout',
		label: 'Finalizar: atualizações pelo WhatsApp',
		default: 'Receber as atualizações do pedido pelo WhatsApp'
	},
	'wa.tabTitle': {
		group: s,
		label: 'WhatsApp: título da aba',
		default: 'WhatsApp · Configurações'
	},
	'wa.intro': {
		group: s,
		label: 'WhatsApp: introdução',
		default:
			'Com o WhatsApp Business oficial, o cliente recebe o link do cardápio, pergunta pelo pedido e recebe avisos quando o pedido é recebido, fica pronto, sai para entrega ou é cancelado.'
	},
	'wa.steps': {
		group: s,
		label: 'WhatsApp: passos',
		default:
			'1. Crie um app em developers.facebook.com com o produto WhatsApp e ligue um número da loja.\n2. Copie o ID do número, o ID da conta (WABA), um token de acesso permanente e a chave secreta do app.\n3. Em Webhooks, informe o endereço e o token de verificação abaixo e assine "messages".\n4. Em Modelos de mensagem, crie os modelos de utilidade pedido_recebido, pedido_pronto, saiu_para_entrega e pedido_cancelado, cada um com as variáveis nome, número do pedido e loja.\n5. Teste e ligue.'
	},
	'wa.unverified': {
		group: s,
		label: 'WhatsApp: ainda não testado',
		default:
			'Integração ainda não testada com a Meta. Ligue só depois de enviar a mensagem de teste para o seu próprio número.'
	},
	'wa.phoneNumberId': { group: s, label: 'WhatsApp: ID do número', default: 'ID do número' },
	'wa.wabaId': { group: s, label: 'WhatsApp: ID da conta', default: 'ID da conta (WABA)' },
	'wa.displayPhone': {
		group: s,
		label: 'WhatsApp: número exibido',
		default: 'Número da loja no WhatsApp'
	},
	'wa.token': { group: s, label: 'WhatsApp: token', default: 'Token de acesso' },
	'wa.appSecret': { group: s, label: 'WhatsApp: chave do app', default: 'Chave secreta do app' },
	'wa.secretKept': {
		group: s,
		label: 'WhatsApp: segredo guardado',
		default: 'Guardado. Deixe em branco para manter.'
	},
	'wa.save': { group: s, label: 'WhatsApp: salvar', default: 'Salvar' },
	'wa.webhook': { group: s, label: 'WhatsApp: webhook', default: 'Endereço do webhook:' },
	'wa.verifyToken': {
		group: s,
		label: 'WhatsApp: token de verificação',
		default: 'Token de verificação:'
	},
	'wa.testTo': {
		group: s,
		label: 'WhatsApp: número para teste',
		default: 'Seu celular (para a mensagem de teste)'
	},
	'wa.test': { group: s, label: 'WhatsApp: testar', default: 'Enviar mensagem de teste' },
	'wa.templates': { group: s, label: 'WhatsApp: modelos', default: 'Modelos de mensagem' },
	'wa.checkTemplates': {
		group: s,
		label: 'WhatsApp: conferir modelos',
		default: 'Conferir modelos na Meta'
	},
	'wa.templateMissing': {
		group: s,
		label: 'WhatsApp: modelo não encontrado',
		default: 'não encontrado'
	},
	'wa.turnOn': { group: s, label: 'WhatsApp: ligar', default: 'Ligar WhatsApp' },
	'wa.turnOff': { group: s, label: 'WhatsApp: desligar', default: 'Desligar WhatsApp' },
	'wa.lastTest': { group: s, label: 'WhatsApp: último teste', default: 'Último teste: {date}' },
	'wa.waiting': {
		group: 'staff',
		label: 'Equipe: clientes pedindo atendente',
		default: 'Pediram atendente no WhatsApp:'
	},
	'wa.handled': { group: 'staff', label: 'Equipe: atendido', default: 'Atendido' },
	'err.wa.phoneNumberId': {
		group: 'staffErrors',
		label: 'WhatsApp: ID do número inválido',
		default: 'Informe o ID do número (só dígitos), copiado do painel da Meta.'
	},
	'err.wa.missing': {
		group: 'staffErrors',
		label: 'WhatsApp: faltam dados',
		default: 'Preencha o token de acesso e a chave secreta do app.'
	},
	'err.wa.testFirst': {
		group: 'staffErrors',
		label: 'WhatsApp: teste antes',
		default: 'Envie a mensagem de teste com sucesso antes de ligar o WhatsApp.'
	},
	'err.wa.testTo': {
		group: 'staffErrors',
		label: 'WhatsApp: número do teste',
		default: 'Informe um celular válido com DDD para o teste.'
	},
	'err.wa.testFailed': {
		group: 'staffErrors',
		label: 'WhatsApp: teste falhou',
		default: 'A Meta recusou a mensagem de teste: {detail}'
	},
	'ok.waSaved': {
		group: 'staffErrors',
		label: 'WhatsApp: salvo',
		default: 'Dados salvos. Envie a mensagem de teste para ligar.'
	},
	'ok.waTested': {
		group: 'staffErrors',
		label: 'WhatsApp: teste enviado',
		default: 'Mensagem de teste enviada. Confira no seu celular.'
	},
	'ok.waTemplates': {
		group: 'staffErrors',
		label: 'WhatsApp: modelos conferidos',
		default: 'Modelos conferidos.'
	},
	'ok.waOn': { group: 'staffErrors', label: 'WhatsApp: ligado', default: 'WhatsApp ligado.' },
	'ok.waOff': {
		group: 'staffErrors',
		label: 'WhatsApp: desligado',
		default: 'WhatsApp desligado.'
	},
	'nav.whatsapp': { group: 'staffLabels', label: 'Menu da equipe: WhatsApp', default: 'WhatsApp' }
} as const satisfies Record<string, TextDef>;
