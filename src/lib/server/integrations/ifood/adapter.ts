// iFood as a ChannelAdapter: the iFood-specific parts (API calls, event codes, order shape).
import type { ChannelAdapter, ChannelEvent } from '../channel';
import { QUEUES } from '../../jobs';
import { IFOOD_PATHS, IfoodApiError, ifoodClient, type IfoodClient, type IfoodEvent } from './api';
import {
	cancellationDenied,
	isPlaced,
	mapIfoodOrder,
	outboundAction,
	statusForEvent,
	type IfoodOrder
} from './mapping';
import { pushIfoodMenu, setIfoodItemStatus } from './catalog';
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
		keepPayloads: async () => (await ifoodSettings()).homologation,
		meaning(code) {
			if (isPlaced(code)) return { kind: 'placed' };
			if (cancellationDenied(code)) return { kind: 'cancelDenied' };
			const to = statusForEvent(code);
			return to ? { kind: 'status', to } : { kind: 'ignore' };
		},
		async getOrder(id, lookup) {
			const raw = (await client.order(id)) as IfoodOrder;
			return { ...mapIfoodOrder(raw, lookup), raw };
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
			return client.action(path(order.channelOrderId), call.body);
		},
		async syncMenu(menu, known) {
			return pushIfoodMenu(client, menu, known);
		},
		setAvailability: (items) => setIfoodItemStatus(client, items),
		describeError: (err) =>
			err instanceof IfoodApiError ? `${err.message} (${err.status})` : String(err)
	};
}
