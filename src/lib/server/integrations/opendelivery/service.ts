// Open Delivery orders in and out: webhook, polling, event processing and status mirroring.
import type { OrderStatus } from '#lib/domain/order-status.ts';
import { db } from '../../db';
import { getShopSecret } from '../../platform/secrets';
import {
	pollChannelOnce,
	processChannelEvent,
	storeChannelEvents,
	syncOrderToChannel
} from '../channel';
import { toOdChannelEvent, odAdapter } from './adapter';
import { odClient, OdApiError, verifyOdSignature, type OdClient, type OdEvent } from './api';
import { OD_PARTNERS, type OdPartner } from './mapping';
import { odSettings, recordOdCheck } from './settings';

export function isOdPartner(p: string | null | undefined): p is OdPartner {
	return OD_PARTNERS.includes(p as OdPartner);
}

export async function receiveOdWebhook(partner: OdPartner, raw: Uint8Array, headers: Headers) {
	if (!(await odSettings(partner)).enabled) return { status: 404 };
	const secret = await getShopSecret(`opendelivery_${partner}`);
	if (!verifyOdSignature(raw, headers.get('x-app-signature'), secret)) return { status: 401 };
	let parsed: unknown;
	try {
		parsed = JSON.parse(new TextDecoder().decode(raw));
	} catch {
		return { status: 400 };
	}
	const events = (Array.isArray(parsed) ? parsed : [parsed]) as OdEvent[];
	await storeChannelEvents(odAdapter(partner), events.map(toOdChannelEvent), 'webhook', true);
	return { status: 202 };
}

export const pollOdOnce = (partner: OdPartner, client?: OdClient) =>
	pollChannelOnce(odAdapter(partner, client));

export const processOdEvent = (partner: OdPartner, channelEventId: string, client?: OdClient) =>
	processChannelEvent(odAdapter(partner, client), channelEventId);

/** Worker: the partner comes from the order. */
export async function syncOrderToOd(
	data: { orderId: string; to: OrderStatus; reason?: string | null },
	client?: OdClient
) {
	const [o] = await db()<{ channel_partner: string | null }[]>`
		select channel_partner from orders where id = ${data.orderId} and channel = 'opendelivery'`;
	if (!isOdPartner(o?.channel_partner)) return 'skipped';
	return syncOrderToChannel(odAdapter(o.channel_partner, client), data);
}

/** The partner of a stored event (its channel is opendelivery_<partner>). */
export async function processStoredOdEvent(channelEventId: string) {
	const [ev] = await db()<
		{ channel: string }[]
	>`select channel from channel_events where id = ${channelEventId}`;
	const partner = ev?.channel.replace('opendelivery_', '');
	if (!isOdPartner(partner)) return 'skipped';
	return processOdEvent(partner, channelEventId);
}

/** "Testar conexão": token, then the merchant, explained in Portuguese. */
export async function checkOdConnection(partner: OdPartner, client: OdClient = odClient(partner)) {
	const explain = (err: unknown, stage: 'token' | 'merchant') => {
		const status = err instanceof OdApiError ? err.status : 0;
		if (status === 0)
			return /not configured/.test(String(err))
				? 'Faltam dados: preencha endereço da API, Client ID, Client Secret e ID da loja.'
				: 'Não foi possível falar com o parceiro. Confira o endereço da API e a internet do servidor.';
		if (stage === 'token' && (status === 400 || status === 401 || status === 403))
			return 'O parceiro recusou o Client ID ou o Client Secret. Copie os dois de novo no portal do parceiro.';
		if (status === 401 || status === 403)
			return 'As credenciais funcionam, mas não têm acesso a esta loja. Confira o ID da loja no portal do parceiro.';
		if (status === 404) return 'O parceiro não encontrou a loja com este ID. Confira o ID da loja.';
		if (status >= 500) return 'O parceiro está com instabilidade. Tente de novo em alguns minutos.';
		return `O parceiro respondeu com um erro inesperado (HTTP ${status}).`;
	};
	try {
		await client.authenticate();
	} catch (err) {
		const msg = explain(err, 'token');
		await recordOdCheck(partner, false, msg);
		return { ok: false as const, error: msg };
	}
	try {
		await client.merchant();
	} catch (err) {
		const msg = explain(err, 'merchant');
		await recordOdCheck(partner, false, msg);
		return { ok: false as const, error: msg };
	}
	await recordOdCheck(partner, true, null);
	return { ok: true as const };
}
