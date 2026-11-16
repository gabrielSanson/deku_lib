// The WhatsApp ordering bot: what to answer a customer's message. Pure: the server gathers the
// shop's state and the customer's last order, this decides the reply.

export type BotIntent = 'greeting' | 'status' | 'human';

export interface BotTexts {
	greeting: string;
	open: string;
	closed: string;
	status: string;
	noOrder: string;
	human: string;
}

export interface BotContext {
	shopName: string;
	open: boolean;
	menuUrl: string;
	/** The customer's latest order with this shop, if any. */
	lastOrder: { number: number; statusLabel: string } | null;
}

export interface BotReply {
	intent: BotIntent;
	text: string;
	/** Staff should look at this conversation. */
	flagStaff: boolean;
}

/** Lower case, no accents, single spaces. */
export function normalizeMessage(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

const HUMAN = [/\batendente\b/, /\bfalar com\b/, /\bpessoa\b/, /\bhumano\b/];
const STATUS = [/\bstatus\b/, /\bmeu pedido\b/, /\bcade\b/, /\bacompanhar\b/];

export function botIntent(text: string): BotIntent {
	const t = normalizeMessage(text);
	if (HUMAN.some((r) => r.test(t))) return 'human';
	if (STATUS.some((r) => r.test(t))) return 'status';
	return 'greeting';
}

function fill(template: string, vars: Record<string, string | number>) {
	return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function botReply(text: string, ctx: BotContext, texts: BotTexts): BotReply {
	const intent = botIntent(text);
	if (intent === 'human') return { intent, text: texts.human, flagStaff: true };
	if (intent === 'status') {
		const reply = ctx.lastOrder
			? fill(texts.status, { number: ctx.lastOrder.number, status: ctx.lastOrder.statusLabel })
			: texts.noOrder;
		return { intent, text: reply, flagStaff: false };
	}
	return {
		intent,
		text: fill(texts.greeting, {
			shop: ctx.shopName,
			state: ctx.open ? texts.open : texts.closed,
			link: ctx.menuUrl
		}),
		flagStaff: false
	};
}

export type StatusTemplate =
	'pedido_recebido' | 'pedido_pronto' | 'saiu_para_entrega' | 'pedido_cancelado';

/** The utility template for an order event, if one is sent. */
export function statusTemplate(
	event: 'placed' | 'ready' | 'cancelled',
	fulfillment: { type: string; provider: string }
): StatusTemplate {
	if (event === 'placed') return 'pedido_recebido';
	if (event === 'cancelled') return 'pedido_cancelado';
	return fulfillment.type === 'delivery' && fulfillment.provider === 'own_driver'
		? 'saiu_para_entrega'
		: 'pedido_pronto';
}

/** Order updates go out when the customer asked for them, or wrote to the shop in the last 24 h. */
export function mayMessage(
	optedInAt: Date | null,
	lastInboundAt: Date | null,
	now = new Date()
): boolean {
	if (optedInAt) return true;
	return !!lastInboundAt && now.getTime() - lastInboundAt.getTime() < 24 * 3600_000;
}
