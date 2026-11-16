// An Open Delivery partner (99Food, Keeta) as a ChannelAdapter.
import { QUEUES } from '../../jobs';
import type { ChannelAdapter, ChannelEvent } from '../channel';
import { OdApiError, odClient, type OdClient, type OdEvent } from './api';
import {
	mapOdOrder,
	OD_PARTNER_LABEL,
	odMeaning,
	odOutboundAction,
	type OdOrder,
	type OdPartner,
	type OdAction
} from './mapping';
import { odSettings } from './settings';

export function toOdChannelEvent(e: OdEvent): ChannelEvent {
	return { id: e?.eventId, type: e?.eventType, orderId: e?.orderId ?? null, raw: e };
}

export function odAdapter(
	partner: OdPartner,
	client: OdClient = odClient(partner)
): ChannelAdapter {
	return {
		channel: `opendelivery_${partner}`,
		orderChannel: 'opendelivery',
		partner,
		sourceMode: 'opendelivery_api',
		label: OD_PARTNER_LABEL[partner],
		queues: { event: QUEUES.odEvent, sync: QUEUES.odSync },
		enabled: async () => (await odSettings(partner)).enabled,
		pollEvents: async () => (await client.poll()).map(toOdChannelEvent),
		ackEvents: (ids) => client.acknowledge(ids),
		meaning: odMeaning,
		async getOrder(id, lookup) {
			return mapOdOrder((await client.order(id)) as OdOrder, partner, lookup);
		},
		planStatus(order, to, reason) {
			const action = odOutboundAction(to, {
				type: order.fulfillmentType,
				provider: order.fulfillmentProvider
			});
			if (!action) return null;
			return {
				action,
				body:
					action === 'requestCancellation'
						? { reason: reason || 'Cancelado pela loja', code: 'OTHER', mode: 'MANUAL' } // TODO(verify) codes
						: undefined
			};
		},
		sendStatus: (order, call) =>
			client.action(order.channelOrderId, call.action as OdAction, call.body),
		describeError: (err) =>
			err instanceof OdApiError ? `${err.message} (${err.status})` : String(err)
	};
}
