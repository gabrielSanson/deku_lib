import { error, redirect } from '@sveltejs/kit';
import QRCode from 'qrcode';
import { db } from '#lib/server/db.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, depends }) => {
	depends('app:payment');
	if (!/^[0-9a-f]{36}$/.test(params.token)) error(404, 'Pedido não encontrado.');
	const [row] = await db()<{
		id: string;
		order_number: number;
		total_cents: number;
		payment_status: string;
		status: string;
		method: string | null;
		tender_status: string | null;
		provider_payload: { pixCode?: string; redirectUrl?: string } | null;
		expires_at: Date | null;
	}[]>`
		select o.id, o.order_number, o.total_cents, o.payment_status, o.status,
			t.method, t.status as tender_status, t.provider_payload, t.expires_at
		from orders o
		left join lateral (
			select * from tenders where order_id = o.id and provider <> 'manual' order by created_at desc limit 1
		) t on true
		where o.public_token = ${params.token}`;
	if (!row) error(404, 'Pedido não encontrado.');
	if (row.payment_status === 'paid' || row.status !== 'new') redirect(303, `/orders/${params.token}`);
	const pixCode = row.provider_payload?.pixCode ?? null;
	return {
		token: params.token,
		orderNumber: row.order_number,
		totalCents: row.total_cents,
		method: row.method,
		tenderStatus: row.tender_status,
		pixCode,
		pixSvg: pixCode ? await QRCode.toString(pixCode, { type: 'svg', margin: 1, width: 240 }) : null,
		redirectUrl: row.provider_payload?.redirectUrl ?? null,
		expiresAt: row.expires_at,
		devApproveUrl: process.env.PAYMENT_PROVIDER === 'local_stub' ? `/dev/payments/${params.token}/approve` : null
	};
};
