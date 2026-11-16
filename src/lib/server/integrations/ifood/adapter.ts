// iFood as a ChannelAdapter: the iFood-specific parts (API calls, event codes, order shape).
import type { ChannelAdapter, ChannelEvent } from '../channel';
import { QUEUES } from '../../jobs';
import { IFOOD_PATHS, IfoodApiError, ifoodClient, type IfoodClient, type IfoodEvent } from './api';
import {
	isPlaced,
	mapIfoodOrder,
	outboundAction,
	statusForEvent,
	type IfoodOrder
} from './mapping';
import { ifoodSettings } from './settings';

export function toChannelEvent(e: IfoodEvent): ChannelEvent {
	return { id: e?.id, type: e?.code, orderId: e?.orderId ?? null, raw: e };
}

export function ifoodAdapter(client: IfoodClient = ifoodClient()): ChannelAdapter {
	return {
		channel: 'ifood',
		orderChannel: 'ifood',
		partner: null,
		sourceMode: 'ifood_api',
		label: 'iFood',
		queues: { event: QUEUES.ifoodEvent, sync: QUEUES.ifoodSync },
		enabled: async () => (await ifoodSettings()).enabled,
		pollEvents: async () => (await client.poll()).map(toChannelEvent),
		ackEvents: (ids) => client.acknowledge(ids),
		meaning(code) {
			if (isPlaced(code)) return { kind: 'placed' };
			const to = statusForEvent(code);
			return to ? { kind: 'status', to } : { kind: 'ignore' };
		},
		async getOrder(id, lookup) {
			return mapIfoodOrder((await client.order(id)) as IfoodOrder, lookup);
		},
		planStatus(order, to, reason) {
			const action = outboundAction(to, {
				type: order.fulfillmentType,
				provider: order.fulfillmentProvider
			});
			if (!action) return null;
			const body =
				action === 'requestCancellation'
					? { reason: reason || 'Cancelado pela loja', cancellationCode: '501' } // UNVERIFIED: pick the code from iFood's cancellationReasons
					: undefined;
			return { action, body };
		},
		async sendStatus(order, call) {
			const path = IFOOD_PATHS[call.action as keyof typeof IFOOD_PATHS];
			if (typeof path !== 'function') throw new Error(`unknown iFood action ${call.action}`);
			await client.action(path(order.channelOrderId), call.body);
		},
		describeError: (err) =>
			err instanceof IfoodApiError ? `${err.message} (${err.status})` : String(err)
	};
}
