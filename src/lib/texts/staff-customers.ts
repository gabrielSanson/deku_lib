// Texts of the staff customer list (Clientes) and privacy requests.
import type { TextDef } from './catalog';

const g = 'staff' as const;

export const STAFF_CUSTOMER_TEXTS = {
	'customers.tabTitle': { group: g, label: 'Clientes: título da aba', default: 'Clientes' },
	'customers.title': { group: g, label: 'Clientes: título', default: 'Clientes' },
	'customers.intro': {
		group: g,
		label: 'Clientes: introdução',
		default:
			'Quem já pediu na loja. Contatos do iFood e de outros apps aparecem para consulta, mas nunca recebem mensagens de marketing.'
	},
	'customers.search': {
		group: g,
		label: 'Clientes: buscar',
		default: 'Nome, telefone ou e-mail'
	},
	'customers.filter': { group: g, label: 'Clientes: filtro', default: 'Filtro' },
	'customers.filter.all': { group: g, label: 'Clientes: todos', default: 'Todos' },
	'customers.filter.inactive': {
		group: g,
		label: 'Clientes: sem pedir há 30 dias',
		default: 'Sem pedir há 30 dias'
	},
	'customers.filter.frequent': { group: g, label: 'Clientes: frequentes', default: 'Frequentes' },
	'customers.filter.new': { group: g, label: 'Clientes: novos', default: 'Novos (30 dias)' },
	'customers.source': { group: g, label: 'Clientes: origem', default: 'Origem' },
	'customers.source.any': { group: g, label: 'Clientes: qualquer origem', default: 'Todas' },
	'customers.source.own': { group: g, label: 'Clientes: origem site', default: 'Site' },
	'customers.source.pos': { group: g, label: 'Clientes: origem balcão', default: 'Balcão' },
	'customers.source.whatsapp': {
		group: g,
		label: 'Clientes: origem WhatsApp',
		default: 'WhatsApp'
	},
	'customers.source.ifood': { group: g, label: 'Clientes: origem iFood', default: 'iFood' },
	'customers.source.opendelivery': {
		group: g,
		label: 'Clientes: origem outros apps',
		default: 'Outros apps'
	},
	'customers.name': { group: g, label: 'Clientes: nome', default: 'Nome' },
	'customers.orders': { group: g, label: 'Clientes: pedidos', default: 'Pedidos' },
	'customers.total': { group: g, label: 'Clientes: total', default: 'Total gasto' },
	'customers.lastOrder': { group: g, label: 'Clientes: último pedido', default: 'Último pedido' },
	'customers.consent': {
		group: g,
		label: 'Clientes: aceita marketing',
		default: 'Aceita ofertas'
	},
	'customers.noConsent': {
		group: g,
		label: 'Clientes: sem marketing',
		default: 'Sem ofertas'
	},
	'customers.none': { group: g, label: 'Clientes: nenhum', default: 'Nenhum cliente encontrado.' },
	'customers.exportMarketing': {
		group: g,
		label: 'Clientes: exportar para ofertas',
		default: 'Exportar quem aceita ofertas (CSV)'
	},
	'customers.exportDelivery': {
		group: g,
		label: 'Clientes: exportar sem contato',
		default: 'Exportar lista sem telefone (CSV)'
	},
	'customers.back': { group: g, label: 'Clientes: voltar', default: 'Voltar para clientes' },
	'customers.phone': { group: g, label: 'Clientes: telefone', default: 'Telefone' },
	'customers.email': { group: g, label: 'Clientes: e-mail', default: 'E-mail' },
	'customers.firstOrder': {
		group: g,
		label: 'Clientes: primeiro pedido',
		default: 'Primeiro pedido'
	},
	'customers.ordersTitle': { group: g, label: 'Clientes: pedidos do cliente', default: 'Pedidos' },
	'marketing.tabTitle': {
		group: 'staffCampaigns',
		label: 'Mensagens: título da aba',
		default: 'Mensagens · Campanhas'
	},
	'marketing.title': { group: 'staffCampaigns', label: 'Mensagens: título', default: 'Mensagens' },
	'marketing.intro': {
		group: 'staffCampaigns',
		label: 'Mensagens: introdução',
		default:
			'Mande uma oferta só para quem aceitou receber. Contatos do iFood e de outros apps nunca entram. Toda mensagem leva um link para a pessoa sair da lista com um toque.'
	},
	'marketing.channel': {
		group: 'staffCampaigns',
		label: 'Mensagens: canal',
		default: 'Enviar por'
	},
	'marketing.email': { group: 'staffCampaigns', label: 'Mensagens: e-mail', default: 'E-mail' },
	'marketing.whatsapp': {
		group: 'staffCampaigns',
		label: 'Mensagens: WhatsApp',
		default: 'WhatsApp (modelo de marketing)'
	},
	'marketing.template': {
		group: 'staffCampaigns',
		label: 'Mensagens: nome do modelo',
		default: 'Nome do modelo aprovado na Meta (variáveis: nome, link para sair)'
	},
	'marketing.subject': { group: 'staffCampaigns', label: 'Mensagens: assunto', default: 'Assunto' },
	'marketing.body': {
		group: 'staffCampaigns',
		label: 'Mensagens: texto',
		default: 'Texto ({nome} vira o primeiro nome do cliente)'
	},
	'marketing.audience': {
		group: 'staffCampaigns',
		label: 'Mensagens: para quem',
		default: 'Para quem'
	},
	'marketing.count': {
		group: 'staffCampaigns',
		label: 'Mensagens: quantos',
		default: '{count} contatos aceitam receber por este canal.'
	},
	'marketing.cost': {
		group: 'staffCampaigns',
		label: 'Mensagens: custo estimado',
		default: 'Custo estimado no WhatsApp: {cost} ({price} por mensagem).'
	},
	'marketing.price': {
		group: 'staffCampaigns',
		label: 'Mensagens: preço por mensagem',
		default: 'Preço por mensagem de marketing no WhatsApp (R$)'
	},
	'marketing.preview': {
		group: 'staffCampaigns',
		label: 'Mensagens: contar',
		default: 'Contar contatos'
	},
	'marketing.confirm': {
		group: 'staffCampaigns',
		label: 'Mensagens: confirmar',
		default: 'Confirmo o envio para estes contatos'
	},
	'marketing.send': { group: 'staffCampaigns', label: 'Mensagens: enviar', default: 'Enviar' },
	'marketing.sentOk': {
		group: 'staffCampaigns',
		label: 'Mensagens: enviado',
		default: 'Envio começou para {count} contatos.'
	},
	'marketing.history': { group: 'staffCampaigns', label: 'Mensagens: envios', default: 'Envios' },
	'marketing.historyLine': {
		group: 'staffCampaigns',
		label: 'Mensagens: linha do envio',
		default: '{count} contatos · {sent} enviadas · {failed} com erro'
	},
	'marketing.link': {
		group: 'staffCampaigns',
		label: 'Mensagens: link na lista',
		default: 'Mensagens'
	},
	'marketing.optOutLine': {
		group: 'account',
		label: 'Mensagem: link para sair',
		default: 'Não quer mais receber ofertas? Toque aqui: {link}'
	},
	'marketing.optedOut': {
		group: 'account',
		label: 'Sair da lista: feito',
		default: 'Pronto. Você não vai mais receber ofertas desta loja.'
	},
	'marketing.optOutBad': {
		group: 'account',
		label: 'Sair da lista: link inválido',
		default: 'Este link não é válido.'
	},
	'err.marketing.noWhatsapp': {
		group: 'staffErrors',
		label: 'Mensagens: WhatsApp desligado',
		default: 'Ligue o WhatsApp em Configurações → WhatsApp antes de enviar por lá.'
	},
	'err.marketing.template': {
		group: 'staffErrors',
		label: 'Mensagens: modelo inválido',
		default: 'Informe o nome do modelo como está na Meta (letras minúsculas, números e _).'
	},
	'err.marketing.text': {
		group: 'staffErrors',
		label: 'Mensagens: falta texto',
		default: 'Escreva o assunto e o texto do e-mail.'
	},
	'err.marketing.nobody': {
		group: 'staffErrors',
		label: 'Mensagens: ninguém',
		default: 'Nenhum contato desta lista aceita receber por este canal.'
	},
	'privacy.mail.subject': {
		group: 'account',
		label: 'Meus dados: assunto do código',
		default: 'Seu código para o pedido sobre seus dados'
	},
	'privacy.mail.body': {
		group: 'account',
		label: 'Meus dados: texto do código',
		default: 'Seu código é {code}. Digite no site para confirmar o pedido. Se não foi você, ignore.'
	},
	'privacy.title': { group: 'account', label: 'Meus dados: título', default: 'Meus dados' },
	'privacy.intro': {
		group: 'account',
		label: 'Meus dados: introdução',
		default:
			'Você pode pedir uma cópia dos dados que a loja guarda sobre você, ou pedir para apagá-los. Os pedidos continuam nos registros fiscais, sem o seu nome.'
	},
	'privacy.access': {
		group: 'account',
		label: 'Meus dados: pedir cópia',
		default: 'Pedir uma cópia dos meus dados'
	},
	'privacy.delete': {
		group: 'account',
		label: 'Meus dados: pedir para apagar',
		default: 'Pedir para apagar meus dados'
	},
	'privacy.requested': {
		group: 'account',
		label: 'Meus dados: pedido recebido',
		default: 'Pedido recebido. A loja responde em até {days} dias.'
	},
	'privacy.email': { group: 'account', label: 'Meus dados: e-mail', default: 'Seu e-mail' },
	'privacy.kind': {
		group: 'account',
		label: 'Meus dados: o que você quer',
		default: 'O que você quer'
	},
	'privacy.sendCode': {
		group: 'account',
		label: 'Meus dados: enviar código',
		default: 'Enviar código'
	},
	'privacy.code': {
		group: 'account',
		label: 'Meus dados: código',
		default: 'Código recebido por e-mail'
	},
	'privacy.confirm': {
		group: 'account',
		label: 'Meus dados: confirmar',
		default: 'Confirmar pedido'
	},
	'privacy.codeSent': {
		group: 'account',
		label: 'Meus dados: código enviado',
		default: 'Enviamos um código para o seu e-mail.'
	},
	'privacy.link': {
		group: 'account',
		label: 'Meus dados: link na conta',
		default: 'Meus dados (LGPD)'
	},
	'privacy.staffTitle': {
		group: g,
		label: 'Solicitações: título',
		default: 'Solicitações sobre dados'
	},
	'privacy.staffIntro': {
		group: g,
		label: 'Solicitações: introdução',
		default:
			'Pedidos de cópia ou exclusão de dados feitos pelos clientes. Responda até o prazo. Apagar remove nome, telefone, e-mail e endereço; os pedidos continuam nos relatórios como "Cliente removido".'
	},
	'privacy.kind.access': { group: g, label: 'Solicitações: cópia', default: 'Cópia dos dados' },
	'privacy.kind.delete': { group: g, label: 'Solicitações: exclusão', default: 'Apagar dados' },
	'privacy.status.pending': { group: g, label: 'Solicitações: aberta', default: 'Aberta' },
	'privacy.status.done': { group: g, label: 'Solicitações: atendida', default: 'Atendida' },
	'privacy.status.refused': { group: g, label: 'Solicitações: recusada', default: 'Recusada' },
	'privacy.due': { group: g, label: 'Solicitações: prazo', default: 'Prazo: {date}' },
	'privacy.export': {
		group: g,
		label: 'Solicitações: baixar dados',
		default: 'Baixar dados (JSON)'
	},
	'privacy.markDone': {
		group: g,
		label: 'Solicitações: marcar atendida',
		default: 'Marcar como atendida'
	},
	'privacy.doDelete': {
		group: g,
		label: 'Solicitações: apagar agora',
		default: 'Apagar os dados agora'
	},
	'privacy.refuse': { group: g, label: 'Solicitações: recusar', default: 'Recusar' },
	'privacy.note': { group: g, label: 'Solicitações: observação', default: 'Motivo ou observação' },
	'privacy.noCustomer': {
		group: g,
		label: 'Solicitações: sem cadastro',
		default: 'Nenhum cadastro com este e-mail.'
	},
	'privacy.none': { group: g, label: 'Solicitações: nenhuma', default: 'Nenhuma solicitação.' },
	'privacy.staffLink': { group: g, label: 'Solicitações: link', default: 'Solicitações (LGPD)' },
	'err.privacy.email': {
		group: 'errors',
		label: 'Meus dados: e-mail inválido',
		default: 'Informe um e-mail válido.'
	},
	'err.privacy.code': {
		group: 'errors',
		label: 'Meus dados: código errado',
		default: 'Código inválido ou vencido. Peça um novo.'
	},
	'err.privacy.noCustomer': {
		group: 'staffErrors',
		label: 'Solicitações: sem cliente',
		default: 'Não há cadastro ligado a esta solicitação.'
	},
	'err.privacy.notPending': {
		group: 'staffErrors',
		label: 'Solicitações: já respondida',
		default: 'Esta solicitação já foi respondida.'
	},
	'nav.clientes': { group: 'staffLabels', label: 'Menu da equipe: Clientes', default: 'Clientes' }
} as const satisfies Record<string, TextDef>;
