// Staff texts for the daily operation: order actions, dashboard alerts, POS
// payment, the cash drawer, the day close, tickets and the staff shell.
import type { TextDef } from './catalog';

export const STAFF_OPS_TEXTS = {
	// Order action bar (order detail)
	'actions.title': { group: 'staff', label: 'Ações do pedido: título', default: 'Ações' },
	'actions.confirmed': {
		group: 'staff',
		label: 'Ações: confirmar',
		default: 'Confirmar pedido'
	},
	'actions.preparing': {
		group: 'staff',
		label: 'Ações: iniciar preparo',
		default: 'Iniciar preparo'
	},
	'actions.ready': { group: 'staff', label: 'Ações: marcar pronto', default: 'Marcar como pronto' },
	'actions.completed': {
		group: 'staff',
		label: 'Ações: entregue',
		default: 'Entregue ao cliente'
	},
	'actions.cancelled': { group: 'staff', label: 'Ações: cancelar', default: 'Cancelar' },
	'actions.rejected': { group: 'staff', label: 'Ações: recusar', default: 'Recusar' },
	'actions.reason': {
		group: 'staff',
		label: 'Ações: campo motivo',
		default: 'Motivo (obrigatório)'
	},
	'actions.back': { group: 'staff', label: 'Ações: voltar', default: 'Voltar' },
	'actions.none': {
		group: 'staff',
		label: 'Ações: nenhuma disponível',
		default: 'Nenhuma ação disponível.'
	},

	// Dashboard alerts
	'alerts.setup': {
		group: 'staff',
		label: 'Alerta: configuração pendente',
		default: 'Falta terminar a configuração da loja.'
	},
	'alerts.setupHint': {
		group: 'staff',
		label: 'Alerta: configuração (dica)',
		default: 'Leva poucos minutos.'
	},
	'alerts.setupCta': {
		group: 'staff',
		label: 'Alerta: continuar configuração',
		default: 'Continuar configuração'
	},
	'alerts.ifood': { group: 'staff', label: 'Alerta iFood: rótulo', default: 'iFood:' },
	'alerts.details': {
		group: 'staff',
		label: 'Alerta iFood: ver detalhes',
		default: 'Ver detalhes'
	},
	'alerts.ifoodLate': {
		group: 'staff',
		label: 'Alerta: iFood aguardando',
		default: '{n} pedido(s) do iFood aguardando há mais de 5 min.'
	},
	'alerts.ifoodLateHint': {
		group: 'staff',
		label: 'Alerta: iFood aguardando (dica)',
		default: 'Confirme antes de 8 min para o iFood não cancelar.'
	},
	'alerts.unpaid': {
		group: 'staff',
		label: 'Alerta: pagamentos pendentes',
		default: '{n} pedido(s) das últimas 24 h com pagamento pendente ou desconhecido.'
	},
	'alerts.dead': {
		group: 'staff',
		label: 'Alerta: integrações com falha',
		default: '{n} evento(s) de integração com falha. Veja a página de integrações.'
	},

	// Staff shell
	'shell.nav': { group: 'staff', label: 'Menu da equipe: nome', default: 'Principal' },
	'shell.openMenu': { group: 'staff', label: 'Menu da equipe: abrir', default: 'Abrir menu' },
	'shell.closeMenu': { group: 'staff', label: 'Menu da equipe: fechar', default: 'Fechar menu' },
	'shell.home': { group: 'staff', label: 'Logo: link para o início', default: '{name}, início' },
	'shell.outOfHours': {
		group: 'staff',
		label: 'Status: fora do horário',
		default: 'Fora do horário'
	},
	'shell.open': { group: 'staff', label: 'Status: aberto', default: 'Aberto' },
	'shell.paused': { group: 'staff', label: 'Status: pausado', default: 'Pausado' },
	'shell.logout': { group: 'staff', label: 'Sair da conta', default: 'Sair' },
	'shell.steps': { group: 'staff', label: 'Configuração: passos', default: 'Passos' },

	// Staff login
	'staffLogin.tabTitle': {
		group: 'staff',
		label: 'Login: título da aba',
		default: 'Entrar · Equipe'
	},
	'staffLogin.title': { group: 'staff', label: 'Login: título', default: 'Acesso da equipe' },
	'staffLogin.subtitle': {
		group: 'staff',
		label: 'Login: subtítulo',
		default: 'Entre para acompanhar pedidos, cardápio e vendas.'
	},
	'staffLogin.email': { group: 'staff', label: 'Login: e-mail', default: 'E-mail' },
	'staffLogin.emailPlaceholder': {
		group: 'staff',
		label: 'Login: exemplo de e-mail',
		default: 'voce@email.com'
	},
	'staffLogin.password': { group: 'staff', label: 'Login: senha', default: 'Senha' },
	'staffLogin.passwordPlaceholder': {
		group: 'staff',
		label: 'Login: exemplo de senha',
		default: 'Sua senha'
	},
	'staffLogin.show': { group: 'staff', label: 'Login: mostrar senha', default: 'Mostrar senha' },
	'staffLogin.hide': { group: 'staff', label: 'Login: ocultar senha', default: 'Ocultar senha' },
	'staffLogin.submit': { group: 'staff', label: 'Login: botão', default: 'Entrar' },
	'staffLogin.busy': { group: 'staff', label: 'Login: entrando', default: 'Entrando…' },
	'staffLogin.restricted': {
		group: 'staff',
		label: 'Login: aviso de acesso',
		default: 'Acesso restrito à equipe da loja'
	},
	'staffLogin.back': { group: 'staff', label: 'Login: voltar ao site', default: 'Voltar ao site' },

	// Charts
	'chart.table': { group: 'staff', label: 'Gráfico: ver tabela', default: 'Ver tabela' },
	'chart.day': { group: 'staff', label: 'Gráfico: coluna dia', default: 'Dia' },
	'chart.orders': { group: 'staff', label: 'Gráfico: coluna pedidos', default: 'Pedidos' },
	'chart.gross': { group: 'staff', label: 'Gráfico: coluna vendas', default: 'Vendas brutas' },
	'chart.salesPeak': {
		group: 'staff',
		label: 'Gráfico: pico de vendas',
		default: 'Vendas (pico {value})'
	},
	'chart.ordersPeak': {
		group: 'staff',
		label: 'Gráfico: pico de pedidos',
		default: 'Pedidos (pico {value})'
	},
	'chart.hourly': {
		group: 'staff',
		label: 'Gráfico: descrição por hora',
		default: 'Vendas e pedidos por hora'
	},

	// POS ticket, product tiles and the options sheet
	'pos.removeLine': { group: 'staff', label: 'Caixa: remover item', default: 'Remover {name}' },
	'pos.minusOne': { group: 'staff', label: 'Caixa: menos um', default: 'Remover um' },
	'pos.plusOne': { group: 'staff', label: 'Caixa: mais um', default: 'Adicionar um' },
	'pos.allergyMark': { group: 'staff', label: 'Caixa: marca de alergia', default: '⚠ Alergia.' },
	'pos.soldOut': { group: 'staff', label: 'Caixa: esgotado', default: 'Esgotado' },
	'pos.noProducts': {
		group: 'staff',
		label: 'Caixa: busca sem resultado',
		default: 'Nenhum produto encontrado.'
	},
	'pos.close': { group: 'staff', label: 'Caixa: fechar opções', default: 'Fechar' },
	'pos.required': { group: 'staff', label: 'Caixa: grupo obrigatório', default: 'Obrigatório ·' },
	'pos.optionSoldOut': { group: 'staff', label: 'Caixa: opção esgotada', default: '(esgotado)' },
	'pos.removeTitle': { group: 'staff', label: 'Caixa: retirar ingredientes', default: 'Retirar' },
	'pos.missing': { group: 'staff', label: 'Caixa: ingrediente em falta', default: '(em falta)' },
	'pos.lineNote': { group: 'staff', label: 'Caixa: observação do item', default: 'Observação' },
	'pos.lineNotePlaceholder': {
		group: 'staff',
		label: 'Caixa: exemplo de observação',
		default: 'Ex.: cortar ao meio'
	},
	'pos.allergy': {
		group: 'staff',
		label: 'Caixa: alergia',
		default: 'Alergia / atenção especial'
	},
	'pos.decrease': { group: 'staff', label: 'Caixa: diminuir', default: 'Diminuir' },
	'pos.increase': { group: 'staff', label: 'Caixa: aumentar', default: 'Aumentar' },
	'pos.choose': { group: 'staff', label: 'Caixa: escolha obrigatória', default: 'Escolha {name}' },
	'pos.add': { group: 'staff', label: 'Caixa: adicionar', default: 'Adicionar' },

	// POS payment
	'posPay.tabTitle': {
		group: 'staff',
		label: 'Pagamento: título da aba',
		default: 'Pagamento #{n}'
	},
	'posPay.title': { group: 'staff', label: 'Pagamento: título', default: 'Pedido #{n}' },
	'posPay.total': { group: 'staff', label: 'Pagamento: total', default: 'Total' },
	'posPay.paid': { group: 'staff', label: 'Pagamento: já pago', default: 'Já pago' },
	'posPay.remaining': { group: 'staff', label: 'Pagamento: falta', default: 'Falta' },
	'posPay.change': { group: 'staff', label: 'Pagamento: troco', default: 'Troco:' },
	'posPay.confirmed': {
		group: 'staff',
		label: 'Pagamento: confirmado',
		default: 'Pagamento confirmado.'
	},
	'posPay.continue': { group: 'staff', label: 'Pagamento: continuar', default: 'Continuar' },
	'posPay.methods': { group: 'staff', label: 'Pagamento: formas', default: 'Forma de pagamento' },
	'posPay.cash': { group: 'staff', label: 'Pagamento: dinheiro', default: 'Dinheiro' },
	'posPay.cashHint': {
		group: 'staff',
		label: 'Pagamento: dica dinheiro',
		default: 'Informe o valor recebido para calcular o troco.'
	},
	'posPay.pix': { group: 'staff', label: 'Pagamento: Pix', default: 'Pix' },
	'posPay.pixHint': {
		group: 'staff',
		label: 'Pagamento: dica Pix',
		default: 'Confira o Pix no app do banco/PSP e informe o ID (E2E) da transação.'
	},
	'posPay.card': { group: 'staff', label: 'Pagamento: maquininha', default: 'Maquininha' },
	'posPay.cardHint': {
		group: 'staff',
		label: 'Pagamento: dica maquininha',
		default: 'Passe o cartão na maquininha e informe o NSU/autorização impresso.'
	},
	'posPay.tap': {
		group: 'staff',
		label: 'Pagamento: aproximação',
		default: 'Aproximação (celular)'
	},
	'posPay.tapHint': {
		group: 'staff',
		label: 'Pagamento: dica aproximação',
		default: 'Cobre no app Tap to Pay do seu PSP e informe o código da transação.'
	},
	'posPay.amount': {
		group: 'staff',
		label: 'Pagamento: valor a cobrar',
		default: 'Valor a cobrar (R$)'
	},
	'posPay.received': {
		group: 'staff',
		label: 'Pagamento: valor recebido',
		default: 'Valor recebido (R$)'
	},
	'posPay.reference': {
		group: 'staff',
		label: 'Pagamento: código da transação',
		default: 'Código da transação (NSU / E2E)'
	},
	'posPay.openDrawer': {
		group: 'staff',
		label: 'Pagamento: abrir o caixa',
		default: 'Abrir o caixa'
	},
	'posPay.busy': { group: 'staff', label: 'Pagamento: registrando', default: 'Registrando…' },
	'posPay.submit': {
		group: 'staff',
		label: 'Pagamento: confirmar',
		default: 'Confirmar pagamento'
	},
	'posPay.cancelConfirm': {
		group: 'staff',
		label: 'Pagamento: confirmar cancelamento',
		default: 'Cancelar este pedido?'
	},
	'posPay.cancel': {
		group: 'staff',
		label: 'Pagamento: cancelar pedido',
		default: 'Cancelar pedido'
	},
	'posPay.cancelText': {
		group: 'staff',
		label: 'Pagamento: texto do cancelamento',
		default: 'O pedido é cancelado e não pode ser reaberto.'
	},
	'posPay.keep': { group: 'staff', label: 'Pagamento: manter pedido', default: 'Manter pedido' },

	// POS done
	'posDone.tabTitle': {
		group: 'staff',
		label: 'Pedido enviado: título da aba',
		default: 'Pedido #{n} enviado'
	},
	'posDone.sent': {
		group: 'staff',
		label: 'Pedido enviado: aviso',
		default: 'Pedido enviado para a cozinha'
	},
	'posDone.code': { group: 'staff', label: 'Pedido enviado: senha', default: 'Senha' },
	'posDone.table': { group: 'staff', label: 'Pedido enviado: mesa', default: 'Mesa {label}' },
	'posDone.total': { group: 'staff', label: 'Pedido enviado: total', default: 'Total' },
	'posDone.payment': { group: 'staff', label: 'Pedido enviado: pagamento', default: 'Pagamento' },
	'posDone.change': { group: 'staff', label: 'Pedido enviado: troco', default: 'Troco' },
	'posDone.print': {
		group: 'staff',
		label: 'Pedido enviado: imprimir recibo',
		default: 'Imprimir recibo'
	},
	'posDone.new': { group: 'staff', label: 'Pedido enviado: nova venda', default: 'Nova venda' },
	'posDone.details': {
		group: 'staff',
		label: 'Pedido enviado: ver detalhes',
		default: 'Ver detalhes do pedido'
	},

	// Cash drawer
	'drawer.tabTitle': { group: 'staff', label: 'Gaveta: título da aba', default: 'Gaveta · Equipe' },
	'drawer.title': { group: 'staff', label: 'Gaveta: título', default: 'Gaveta do caixa' },
	'drawer.kind.sale': { group: 'staff', label: 'Gaveta: venda', default: 'Venda em dinheiro' },
	'drawer.kind.refund': {
		group: 'staff',
		label: 'Gaveta: estorno',
		default: 'Estorno em dinheiro'
	},
	'drawer.kind.sangria': { group: 'staff', label: 'Gaveta: sangria', default: 'Sangria' },
	'drawer.kind.suprimento': { group: 'staff', label: 'Gaveta: suprimento', default: 'Suprimento' },
	'drawer.closedAt': {
		group: 'staff',
		label: 'Gaveta: fechado às',
		default: 'Caixa fechado às {time}'
	},
	'drawer.counted': { group: 'staff', label: 'Gaveta: contado', default: 'Contado' },
	'drawer.expected': { group: 'staff', label: 'Gaveta: esperado', default: 'Esperado' },
	'drawer.noDifference': {
		group: 'staff',
		label: 'Gaveta: sem diferença',
		default: 'Sem diferença'
	},
	'drawer.short': { group: 'staff', label: 'Gaveta: falta', default: 'Falta' },
	'drawer.over': { group: 'staff', label: 'Gaveta: sobra', default: 'Sobra' },
	'drawer.closeNote': { group: 'staff', label: 'Gaveta: observação', default: 'Obs.: {note}' },
	'drawer.openTitle': { group: 'staff', label: 'Gaveta: abrir (título)', default: 'Abrir o caixa' },
	'drawer.openText': {
		group: 'staff',
		label: 'Gaveta: abrir (texto)',
		default:
			'Conte o dinheiro que fica na gaveta para troco. Vendas em dinheiro só podem ser registradas com o caixa aberto.'
	},
	'drawer.float': {
		group: 'staff',
		label: 'Gaveta: fundo de troco (R$)',
		default: 'Fundo de troco (R$)'
	},
	'drawer.open': { group: 'staff', label: 'Gaveta: botão abrir', default: 'Abrir caixa' },
	'drawer.openedBy': {
		group: 'staff',
		label: 'Gaveta: aberto por',
		default: 'Caixa aberto por {name} em {time}.'
	},
	'drawer.floatLine': {
		group: 'staff',
		label: 'Gaveta: fundo de troco',
		default: 'Fundo de troco'
	},
	'drawer.sales': {
		group: 'staff',
		label: 'Gaveta: vendas em dinheiro',
		default: 'Vendas em dinheiro'
	},
	'drawer.out': {
		group: 'staff',
		label: 'Gaveta: sangrias e estornos',
		default: 'Sangrias e estornos'
	},
	'drawer.in': { group: 'staff', label: 'Gaveta: suprimentos', default: 'Suprimentos' },
	'drawer.expectedLine': {
		group: 'staff',
		label: 'Gaveta: esperado na gaveta',
		default: 'Esperado na gaveta'
	},
	'drawer.blind': {
		group: 'staff',
		label: 'Gaveta: aviso fechamento cego',
		default: 'Só administradores veem o valor esperado; quem fecha o caixa conta sem saber.'
	},
	'drawer.moveTitle': {
		group: 'staff',
		label: 'Gaveta: sangria ou suprimento',
		default: 'Sangria ou suprimento'
	},
	'drawer.moveKind': {
		group: 'staff',
		label: 'Gaveta: tipo de movimento',
		default: 'Tipo de movimento'
	},
	'drawer.sangria': {
		group: 'staff',
		label: 'Gaveta: botão sangria',
		default: 'Sangria (retirar)'
	},
	'drawer.suprimento': {
		group: 'staff',
		label: 'Gaveta: botão suprimento',
		default: 'Suprimento (colocar)'
	},
	'drawer.amount': { group: 'staff', label: 'Gaveta: valor', default: 'Valor (R$)' },
	'drawer.reason': { group: 'staff', label: 'Gaveta: motivo', default: 'Motivo' },
	'drawer.reasonOptional': {
		group: 'staff',
		label: 'Gaveta: motivo (opcional)',
		default: 'Motivo (opcional)'
	},
	'drawer.sangriaPlaceholder': {
		group: 'staff',
		label: 'Gaveta: exemplo de sangria',
		default: 'Ex.: depósito no cofre'
	},
	'drawer.suprimentoPlaceholder': {
		group: 'staff',
		label: 'Gaveta: exemplo de suprimento',
		default: 'Ex.: mais troco'
	},
	'drawer.sangriaDone': {
		group: 'staff',
		label: 'Gaveta: sangria registrada',
		default: 'Sangria registrada.'
	},
	'drawer.suprimentoDone': {
		group: 'staff',
		label: 'Gaveta: suprimento registrado',
		default: 'Suprimento registrado.'
	},
	'drawer.record': { group: 'staff', label: 'Gaveta: registrar', default: 'Registrar' },
	'drawer.closeTitle': {
		group: 'staff',
		label: 'Gaveta: fechar (título)',
		default: 'Fechar o caixa'
	},
	'drawer.closeText': {
		group: 'staff',
		label: 'Gaveta: fechar (texto)',
		default:
			'Conte todo o dinheiro da gaveta, inclusive o fundo de troco, e digite o total. A diferença aparece depois de fechar e não pode ser alterada.'
	},
	'drawer.countedField': {
		group: 'staff',
		label: 'Gaveta: dinheiro contado',
		default: 'Dinheiro contado (R$)'
	},
	'drawer.note': {
		group: 'staff',
		label: 'Gaveta: observação (opcional)',
		default: 'Observação (opcional)'
	},
	'drawer.closeConfirm': {
		group: 'staff',
		label: 'Gaveta: confirmar fechamento',
		default: 'Contei o dinheiro e quero fechar o caixa'
	},
	'drawer.close': { group: 'staff', label: 'Gaveta: botão fechar', default: 'Fechar caixa' },
	'drawer.movements': { group: 'staff', label: 'Gaveta: movimentos', default: 'Movimentos ({n})' },
	'drawer.noMovements': {
		group: 'staff',
		label: 'Gaveta: sem movimentos',
		default: 'Nenhum movimento ainda.'
	},

	// Day close (reconciliation)
	'recon.tabTitle': {
		group: 'staff',
		label: 'Fechamento: título da aba',
		default: 'Caixa do dia · Equipe'
	},
	'recon.title': { group: 'staff', label: 'Fechamento: título', default: 'Fechamento do dia' },
	'recon.day': { group: 'staff', label: 'Fechamento: dia', default: 'Dia' },
	'recon.intro': {
		group: 'staff',
		label: 'Fechamento: texto',
		default:
			'Confira o dinheiro na gaveta e os extratos da maquininha/PSP contra estes valores. Pagamentos pendentes ou desconhecidos não entram nos totais.'
	},
	'recon.totalPaid': {
		group: 'staff',
		label: 'Fechamento: total recebido',
		default: 'Total recebido'
	},
	'recon.cash': { group: 'staff', label: 'Fechamento: dinheiro', default: 'Vendas em dinheiro' },
	'recon.ifood': {
		group: 'staff',
		label: 'Fechamento: iFood',
		default: 'iFood ({n} pedidos, pago no app)'
	},
	'recon.byMethod': {
		group: 'staff',
		label: 'Fechamento: por forma de pagamento',
		default: 'Por forma de pagamento'
	},
	'recon.method': { group: 'staff', label: 'Fechamento: coluna forma', default: 'Forma' },
	'recon.count': { group: 'staff', label: 'Fechamento: coluna quantidade', default: 'Qtd.' },
	'recon.received': { group: 'staff', label: 'Fechamento: coluna recebido', default: 'Recebido' },
	'recon.noPayments': {
		group: 'staff',
		label: 'Fechamento: sem pagamentos',
		default: 'Nenhum pagamento.'
	},
	'recon.refunded': {
		group: 'staff',
		label: 'Fechamento: estornado',
		default: 'Estornado · {method}'
	},
	'recon.drawer': {
		group: 'staff',
		label: 'Fechamento: gaveta',
		default: 'Gaveta ({n} aberturas)'
	},
	'recon.drawerNone': {
		group: 'staff',
		label: 'Fechamento: caixa não aberto',
		default: 'O caixa não foi aberto neste dia.'
	},
	'recon.openedBy': { group: 'staff', label: 'Fechamento: aberto por', default: 'Aberto por' },
	'recon.closedBy': { group: 'staff', label: 'Fechamento: fechado', default: 'Fechado' },
	'recon.expected': { group: 'staff', label: 'Fechamento: esperado', default: 'Esperado' },
	'recon.counted': { group: 'staff', label: 'Fechamento: contado', default: 'Contado' },
	'recon.difference': { group: 'staff', label: 'Fechamento: diferença', default: 'Diferença' },
	'recon.stillOpen': { group: 'staff', label: 'Fechamento: ainda aberto', default: 'Ainda aberto' },
	'recon.issues': {
		group: 'staff',
		label: 'Fechamento: divergências',
		default: 'Divergências ({n})'
	},
	'recon.allGood': {
		group: 'staff',
		label: 'Fechamento: tudo conferido',
		default: 'Tudo conferido: cada pedido do dia tem pagamento igual ao total.'
	},
	'recon.order': { group: 'staff', label: 'Fechamento: coluna pedido', default: 'Pedido' },
	'recon.status': { group: 'staff', label: 'Fechamento: coluna status', default: 'Status' },
	'recon.payment': { group: 'staff', label: 'Fechamento: coluna pagamento', default: 'Pagamento' },
	'recon.total': { group: 'staff', label: 'Fechamento: coluna total', default: 'Total' },

	// Printed kitchen ticket and receipt
	'print.kitchenTitle': { group: 'staff', label: 'Impressão: comanda', default: 'Comanda #{n}' },
	'print.receiptTitle': { group: 'staff', label: 'Impressão: recibo', default: 'Recibo #{n}' },
	'print.toReceipt': {
		group: 'staff',
		label: 'Impressão: ver recibo',
		default: 'Ver recibo do cliente'
	},
	'print.toKitchen': {
		group: 'staff',
		label: 'Impressão: ver comanda',
		default: 'Ver comanda da cozinha'
	},
	'print.kiosk': { group: 'staff', label: 'Impressão: canal totem', default: 'Totem' },
	'print.promised': { group: 'staff', label: 'Impressão: prometido', default: 'prometido {time}' },
	'print.print': { group: 'staff', label: 'Impressão: botão imprimir', default: 'Imprimir' },
	'print.allergy': { group: 'staff', label: 'Impressão: alergia', default: '*** ALERGIA ***' },
	'print.itemNote': { group: 'staff', label: 'Impressão: obs. do item', default: 'Obs.: {note}' },
	'print.orderNote': {
		group: 'staff',
		label: 'Impressão: obs. do pedido',
		default: 'Obs. do pedido: {note}'
	},
	'print.delivery': {
		group: 'staff',
		label: 'Impressão: entrega para',
		default: 'Entrega: {name}'
	},
	'print.unpaid': { group: 'staff', label: 'Impressão: não pago', default: '*** NÃO PAGO ***' },
	'print.order': { group: 'staff', label: 'Impressão: pedido', default: 'Pedido #{n}' },
	'print.code': { group: 'staff', label: 'Impressão: senha', default: 'Senha {code}' },
	'print.subtotal': { group: 'staff', label: 'Impressão: subtotal', default: 'Subtotal' },
	'print.discount': { group: 'staff', label: 'Impressão: desconto', default: 'Desconto' },
	'print.deliveryFee': {
		group: 'staff',
		label: 'Impressão: taxa de entrega',
		default: 'Taxa de entrega'
	},
	'print.total': { group: 'staff', label: 'Impressão: total', default: 'Total' },
	'print.change': { group: 'staff', label: 'Impressão: troco', default: 'Troco' },
	'print.pending': {
		group: 'staff',
		label: 'Impressão: pagamento pendente',
		default: 'Pagamento pendente'
	},
	'print.thanks': {
		group: 'staff',
		label: 'Impressão: agradecimento',
		default: 'Obrigado pela preferência!'
	},
	'print.notFiscal': {
		group: 'staff',
		label: 'Impressão: aviso não fiscal',
		default: 'Não é documento fiscal'
	},

	'dash.tabTitle': { group: 'staff', label: 'Início: título da aba', default: 'Início · Equipe' },
	'orderDetail.pixReminder': {
		group: 'staff',
		label: 'Pedido: lembrete do Pix na chave',
		default:
			'O cliente vai pagar por Pix na chave da loja. Confira no app do banco um Pix de {total} com a referência PEDIDO{n} e registre o pagamento antes de aceitar.'
	},
	'orderDetail.fiscal': {
		group: 'staff',
		label: 'Pedido: nota fiscal',
		default: 'Nota fiscal (NFC-e)'
	},
	'orderDetail.fiscalNone': {
		group: 'staff',
		label: 'Pedido: nenhuma nota',
		default: 'Nenhuma nota emitida para este pedido.'
	},
	'orderDetail.fiscalWhenPaid': {
		group: 'staff',
		label: 'Pedido: nota quando pago',
		default: 'A nota é emitida quando o pedido estiver pago.'
	},
	'orderDetail.fiscalNumber': {
		group: 'staff',
		label: 'Pedido: número da nota',
		default: 'Nº {n}'
	},
	'orderDetail.fiscalSeries': {
		group: 'staff',
		label: 'Pedido: série da nota',
		default: 'série {n}'
	},
	'orderDetail.fiscalTest': { group: 'staff', label: 'Pedido: nota de teste', default: '· teste' },
	'orderDetail.fiscal.pending': {
		group: 'staff',
		label: 'Pedido: nota enviando',
		default: 'Enviando…'
	},
	'orderDetail.fiscal.authorized': {
		group: 'staff',
		label: 'Pedido: nota autorizada',
		default: 'Autorizada'
	},
	'orderDetail.fiscal.rejected': {
		group: 'staff',
		label: 'Pedido: nota rejeitada',
		default: 'Rejeitada'
	},
	'orderDetail.fiscal.error': {
		group: 'staff',
		label: 'Pedido: nota com erro',
		default: 'Erro, tentando de novo'
	},
	'orderDetail.fiscal.cancelled': {
		group: 'staff',
		label: 'Pedido: nota cancelada',
		default: 'Cancelada'
	},
	'orderDetail.danfe': { group: 'staff', label: 'Pedido: abrir DANFE', default: 'Abrir DANFE' },
	'orderDetail.fiscalRetry': {
		group: 'staff',
		label: 'Pedido: emitir de novo',
		default: 'Emitir nota de novo'
	},
	'orderDetail.fiscalReason': {
		group: 'staff',
		label: 'Pedido: motivo do cancelamento da nota',
		default: 'Motivo (mínimo 15 letras)'
	},
	'orderDetail.fiscalCancelConfirm': {
		group: 'staff',
		label: 'Pedido: cancelar a nota',
		default: 'Cancelar a nota'
	},
	'orderDetail.fiscalCancel': {
		group: 'staff',
		label: 'Pedido: cancelar nota',
		default: 'Cancelar nota'
	},
	'kitchen.seen': { group: 'staff', label: 'Cozinha: botão visto', default: 'Visto' },
	'kitchen.promo': { group: 'staff', label: 'Cozinha: item de promoção', default: 'promo' },
	'kitchen.since': { group: 'staff', label: 'Cozinha: tempo desde', default: 'desde o pedido' },
	'kitchen.allergy': { group: 'staff', label: 'Cozinha: alergia', default: 'ALERGIA' },
	'kitchen.promised': {
		group: 'staff',
		label: 'Cozinha: horário prometido',
		default: 'Prometido {time}'
	},
	'shell.shopNav': { group: 'header', label: 'Menu do site: nome', default: 'Principal' },
	'account.tabTitle': {
		group: 'account',
		label: 'Entrar: título da aba',
		default: 'Entrar · Conta'
	}
} as const satisfies Record<string, TextDef>;
