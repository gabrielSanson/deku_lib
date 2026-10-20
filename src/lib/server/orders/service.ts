// The only place orders are created or change status. Every change runs in a
// transaction that also writes history/audit rows and enqueues follow-up jobs.
import type { Channel } from '#lib/domain/catalog.ts';
import {
	canTransition,
	requiresReason,
	roleMayTransition,
	STATUS_TIMESTAMP,
	type OrderStatus,
	type PaymentStatus,
	type StaffRole
} from '#lib/domain/order-status.ts';
import { priceCart, type CartLineInput, type DeliveryRule, type PricedCart } from '#lib/domain/pricing.ts';
import { audit, type Actor } from '../audit';
import { getCatalogForPricing, soldOutSkus } from '../catalog/service';
import { db, type Db, type Tx } from '../db';
import { DomainError } from '../errors';
import { enqueue, QUEUES } from '../jobs';
import { getStoreSettings } from '../settings/service';

export type SourceMode = 'staff_pos' | 'web' | 'kiosk' | 'ifood_api' | 'ifood_manual';
export type FulfillmentType = 'counter' | 'pickup' | 'delivery';
export type FulfillmentProvider = 'shop' | 'own_driver' | 'ifood_courier';

export interface OrderActor extends Actor {
	role?: StaffRole;
}

export interface AddressInput {
	recipient: string;
	cep: string;
	street: string;
	number: string;
	complement?: string | null;
	neighborhood: string;
	city: string;
	state: string;
	instructions?: string | null;
}

export interface CreateOrderInput {
	channel: Channel;
	sourceMode: SourceMode;
	lines: CartLineInput[];
	fulfillmentType: FulfillmentType;
	fulfillmentProvider?: FulfillmentProvider;
	customerLabel?: string | null;
	customer?: { name: string; phoneE164?: string | null; email?: string | null; marketingConsent?: boolean };
	address?: AddressInput;
	deliveryRule?: DeliveryRule | null;
	notes?: string | null;
	discountCents?: number;
	idempotencyKey: string;
	initialStatus?: 'new' | 'confirmed';
	channelOrderId?: string | null;
	isTest?: boolean;
	/** Channels that collect payment themselves (iFood) report it here. */
	paymentStatus?: PaymentStatus;
	paymentPlan?: 'counter' | 'online' | 'on_fulfillment' | 'channel';
	/**
	 * Channels that price the order themselves (iFood) pass their lines and
	 * fees here; the shop's catalog is then not used to re-price.
	 */
	externalPricing?: { cart: PricedCart; deliveryFeeCents: number; discountCents: number };
	channelDisplayId?: string | null;
	actor: OrderActor;
}

export interface CreatedOrder {
	id: string;
	orderNumber: number;
	publicToken: string;
	totalCents: number;
	status: OrderStatus;
	created: boolean;
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
	const sql = db();
	const existing = await findByIdempotencyKey(sql, input.idempotencyKey);
	if (existing) return existing;

	const catalog = input.externalPricing ? null : await getCatalogForPricing();
	return sql.begin(async (tx) => {
		const settings = await getStoreSettings(tx);
		if (input.channel === 'web') {
			if (!settings.acceptingOrders || !settings.webOrderingEnabled) {
				throw new DomainError(settings.pauseReason || 'A loja não está aceitando pedidos agora.', 'paused', 409);
			}
			if (input.fulfillmentType === 'delivery' && !settings.deliveryEnabled) {
				throw new DomainError('Entrega indisponível no momento.', 'delivery_off', 409);
			}
			if (input.fulfillmentType === 'pickup' && !settings.pickupEnabled) {
				throw new DomainError('Retirada indisponível no momento.', 'pickup_off', 409);
			}
			if (settings.maxOpenOrders) {
				const [{ open }] = await tx<{ open: number }[]>`
					select count(*)::int as open from orders where status in ('new','confirmed','preparing')`;
				if (open >= settings.maxOpenOrders) {
					throw new DomainError('Cozinha lotada. Tente novamente em alguns minutos.', 'capacity', 409);
				}
			}
		}

		const external = input.externalPricing;
		const cart =
			external?.cart ??
			priceCart(catalog!, input.lines, {
				channel: input.channel,
				soldOut: await soldOutSkus(tx, input.channel)
			});
		const deliveryFee = external
			? external.deliveryFeeCents
			: input.fulfillmentType === 'delivery'
				? (input.deliveryRule?.feeCents ?? 0)
				: 0;
		if (input.fulfillmentType === 'delivery' && input.channel === 'web') {
			if (!input.deliveryRule || !input.address) {
				throw new DomainError('Endereço fora da área de entrega.', 'no_zone');
			}
			if (cart.subtotalCents < input.deliveryRule.minOrderCents) {
				throw new DomainError('Pedido abaixo do mínimo para entrega neste endereço.', 'min_order');
			}
		}
		const discount = Math.min(external?.discountCents ?? input.discountCents ?? 0, cart.subtotalCents);
		const total = cart.subtotalCents - discount + deliveryFee;
		const status: OrderStatus = input.initialStatus ?? 'new';
		const now = new Date();
		const promisedAt = new Date(now.getTime() + settings.prepTimeMinutes * 60_000);

		let customerId: string | null = null;
		if (input.customer) {
			const [c] = await tx<{ id: string }[]>`
				insert into customers (name, phone_e164, email, marketing_consent_at)
				values (${input.customer.name}, ${input.customer.phoneE164 ?? null}, ${input.customer.email ?? null},
					${input.customer.marketingConsent ? now : null})
				on conflict (phone_e164) where phone_e164 is not null and deleted_at is null
				do update set name = excluded.name,
					marketing_consent_at = coalesce(excluded.marketing_consent_at, customers.marketing_consent_at)
				returning id`;
			customerId = c.id;
		}

		const staffId = input.actor.type === 'staff' ? input.actor.id : null;
		const inserted = await tx<{ id: string; order_number: number; public_token: string }[]>`
			insert into orders (
				channel, source_mode, channel_order_id, customer_id, customer_label, status, payment_status,
				fulfillment_type, fulfillment_provider, subtotal_cents, discount_cents, delivery_fee_cents,
				total_cents, delivery_rule_snapshot, notes, catalog_version, idempotency_key, is_test,
				promised_at, accepted_at, created_by, payment_plan, channel_display_id
			) values (
				${input.channel}, ${input.sourceMode}, ${input.channelOrderId ?? null}, ${customerId},
				${input.customerLabel ?? input.customer?.name ?? null}, ${status},
				${input.paymentStatus ?? 'pending'},
				${input.fulfillmentType}, ${input.fulfillmentProvider ?? 'shop'}, ${cart.subtotalCents},
				${discount}, ${deliveryFee}, ${total},
				${input.deliveryRule ? tx.json(input.deliveryRule as never) : null}, ${input.notes ?? null},
				${cart.catalogVersion}, ${input.idempotencyKey}, ${input.isTest ?? false},
				${promisedAt}, ${status === 'confirmed' ? now : null}, ${staffId},
				${input.paymentPlan ?? (input.channel === 'ifood' ? 'channel' : 'counter')},
				${input.channelDisplayId ?? null}
			)
			on conflict (idempotency_key) do nothing
			returning id, order_number, public_token`;
		if (inserted.length === 0) {
			// A concurrent request with the same key committed first.
			const again = await findByIdempotencyKey(tx, input.idempotencyKey);
			if (!again) throw new DomainError('Pedido duplicado.', 'duplicate', 409);
			return again;
		}
		const order = inserted[0];

		for (const line of cart.lines) {
			const [item] = await tx<{ id: string }[]>`
				insert into order_items (order_id, position, product_sku, product_name, category_name, quantity,
					unit_price_cents, modifiers_unit_cents, line_total_cents, note, allergy_flag, prep_station)
				values (${order.id}, ${line.position}, ${line.productSku}, ${line.productName}, ${line.categoryName},
					${line.quantity}, ${line.unitPriceCents}, ${line.modifiersUnitCents}, ${line.lineTotalCents},
					${line.note}, ${line.allergyFlag}, ${line.prepStation})
				returning id`;
			for (const m of line.modifiers) {
				await tx`
					insert into order_item_modifiers (order_item_id, group_name, option_sku, option_name, quantity, unit_price_cents)
					values (${item.id}, ${m.groupName}, ${m.optionSku}, ${m.optionName}, ${m.quantity}, ${m.unitPriceCents})`;
			}
		}

		if (input.address) {
			const a = input.address;
			await tx`
				insert into order_addresses (order_id, recipient, cep, street, number, complement, neighborhood, city, state, instructions)
				values (${order.id}, ${a.recipient}, ${a.cep}, ${a.street}, ${a.number}, ${a.complement ?? null},
					${a.neighborhood}, ${a.city}, ${a.state}, ${a.instructions ?? null})`;
		}

		await tx`
			insert into order_status_history (order_id, from_status, to_status, actor_type, actor_id, reason)
			values (${order.id}, null, ${status}, ${input.actor.type}, ${input.actor.id}, 'created')`;
		if (status === 'confirmed') {
			// Count the acceptance moment for analytics like any other confirmation.
			await tx`
				insert into order_status_history (order_id, from_status, to_status, actor_type, actor_id, reason)
				values (${order.id}, 'new', 'confirmed', ${input.actor.type}, ${input.actor.id}, 'accepted at creation')`;
		}
		await audit(tx, input.actor, 'order.created', 'order', order.id, {
			channel: input.channel,
			total_cents: total,
			discount_cents: discount
		});
		await enqueue(tx, QUEUES.orderPlaced, { orderId: order.id }, { singletonKey: `placed:${order.id}` });

		return {
			id: order.id,
			orderNumber: order.order_number,
			publicToken: order.public_token,
			totalCents: total,
			status,
			created: true
		};
	});
}

async function findByIdempotencyKey(sql: Db, key: string): Promise<CreatedOrder | null> {
	const [row] = await sql<
		{ id: string; order_number: number; public_token: string; total_cents: number; status: OrderStatus }[]
	>`select id, order_number, public_token, total_cents, status from orders where idempotency_key = ${key}`;
	return row
		? {
				id: row.id,
				orderNumber: row.order_number,
				publicToken: row.public_token,
				totalCents: row.total_cents,
				status: row.status,
				created: false
			}
		: null;
}

export interface TransitionInput {
	orderId: string;
	to: OrderStatus;
	actor: OrderActor;
	reason?: string | null;
	sourceEventId?: string | null;
	/** Reject the change if the order moved since the client last saw it. */
	expectedVersion?: number;
}

export interface TransitionResult {
	changed: boolean;
	from: OrderStatus;
	to: OrderStatus;
	version: number;
}

export async function transitionOrder(input: TransitionInput, tx?: Tx): Promise<TransitionResult> {
	const run = async (t: Tx) => {
		const [order] = await t<{ status: OrderStatus; version: number; channel: Channel }[]>`
			select status, version, channel from orders where id = ${input.orderId} for update`;
		if (!order) throw new DomainError('Pedido não encontrado.', 'not_found', 404);

		// Repeated clicks and duplicate events land here: already done, nothing to do.
		if (order.status === input.to) {
			return { changed: false, from: order.status, to: input.to, version: order.version };
		}
		if (input.expectedVersion !== undefined && input.expectedVersion !== order.version) {
			throw new DomainError('O pedido foi atualizado por outra pessoa. Recarregue e tente de novo.', 'stale', 409);
		}
		if (!canTransition(order.status, input.to)) {
			throw new DomainError(`Não é possível mudar de ${order.status} para ${input.to}.`, 'bad_transition', 409);
		}
		if (input.actor.type === 'staff') {
			if (!input.actor.role || !roleMayTransition(input.actor.role, order.status, input.to)) {
				throw new DomainError('Seu perfil não permite esta ação.', 'forbidden', 403);
			}
		}
		const reason = input.reason?.trim() || null;
		if (requiresReason(input.to) && !reason) {
			throw new DomainError('Informe o motivo.', 'reason_required');
		}

		const column = STATUS_TIMESTAMP[input.to];
		const [updated] = await t<{ version: number }[]>`
			update orders set
				status = ${input.to},
				accepted_at = case when ${column === 'accepted_at'} then coalesce(accepted_at, now()) else accepted_at end,
				preparing_at = case when ${column === 'preparing_at'} then coalesce(preparing_at, now()) else preparing_at end,
				ready_at = case when ${column === 'ready_at'} then coalesce(ready_at, now()) else ready_at end,
				completed_at = case when ${column === 'completed_at'} then coalesce(completed_at, now()) else completed_at end,
				cancelled_at = case when ${column === 'cancelled_at'} then coalesce(cancelled_at, now()) else cancelled_at end,
				cancel_reason = case when ${column === 'cancelled_at'} then ${reason} else cancel_reason end,
				version = version + 1
			where id = ${input.orderId}
			returning version`;
		await t`
			insert into order_status_history (order_id, from_status, to_status, actor_type, actor_id, reason, source_event_id)
			values (${input.orderId}, ${order.status}, ${input.to}, ${input.actor.type}, ${input.actor.id},
				${reason}, ${input.sourceEventId ?? null})`;
		await audit(t, input.actor, `order.${input.to}`, 'order', input.orderId, { from: order.status, reason });
		// Changes made here are mirrored to iFood; changes that came from iFood are not echoed back.
		if (order.channel === 'ifood' && input.actor.type !== 'integration') {
			await enqueue(t, QUEUES.ifoodSync, { orderId: input.orderId, to: input.to, reason }, { singletonKey: `ifood:${input.orderId}:${input.to}` });
		}
		return { changed: true, from: order.status, to: input.to, version: updated.version };
	};
	return tx ? run(tx) : db().begin(run);
}

export async function markKitchenSeen(orderId: string, actor: OrderActor) {
	const sql = db();
	await sql`update orders set kitchen_seen_at = coalesce(kitchen_seen_at, now()) where id = ${orderId}`;
	await audit(sql, actor, 'order.kitchen_seen', 'order', orderId);
}
