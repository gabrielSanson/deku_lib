// "Roteiro de homologação": the iFood test cases a shop goes through before going live, each
// ticked when the system has seen it succeed. TODO(verify) the list against iFood's checklist.
import { db } from '../../db';

export const IFOOD_HOMOLOGATION_CASES = [
	'receive',
	'confirm',
	'startPreparation',
	'readyToPickup',
	'dispatch',
	'shopCancel',
	'customerCancel'
] as const;
export type HomologationCase = (typeof IFOOD_HOMOLOGATION_CASES)[number];

export async function ifoodHomologationProgress(): Promise<
	{ id: HomologationCase; doneAt: Date | null }[]
> {
	const [r] = await db()<Record<HomologationCase, Date | null>[]>`
		select
			(select min(processed_at) from channel_events where channel = 'ifood'
				and event_type in ('PLC', 'PLACED') and processing_status = 'processed') as "receive",
			(select min(sent_at) from channel_outbound where channel = 'ifood' and action = 'confirm' and status = 'sent') as "confirm",
			(select min(sent_at) from channel_outbound where channel = 'ifood' and action = 'startPreparation' and status = 'sent') as "startPreparation",
			(select min(sent_at) from channel_outbound where channel = 'ifood' and action = 'readyToPickup' and status = 'sent') as "readyToPickup",
			(select min(sent_at) from channel_outbound where channel = 'ifood' and action = 'dispatch' and status = 'sent') as "dispatch",
			(select min(e.processed_at) from channel_events e join orders o
				on o.channel = 'ifood' and o.channel_order_id = e.channel_order_id
				where e.channel = 'ifood' and e.event_type in ('CAN', 'CANCELLED') and e.processing_status = 'processed'
					and o.cancel_requested_at is not null) as "shopCancel",
			(select min(e.processed_at) from channel_events e join orders o
				on o.channel = 'ifood' and o.channel_order_id = e.channel_order_id
				where e.channel = 'ifood' and e.event_type in ('CAN', 'CANCELLED') and e.processing_status = 'processed'
					and o.cancel_requested_at is null) as "customerCancel"`;
	return IFOOD_HOMOLOGATION_CASES.map((id) => ({ id, doneAt: r[id] }));
}
