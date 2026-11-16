// The order link as a print-ready QR code PNG (1024 px), for tables, flyers and the counter.
import QRCode from 'qrcode';
import { ADMIN, requireStaff } from '#lib/server/auth/staff.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	requireStaff(event, ADMIN);
	const png = await QRCode.toBuffer(`${event.url.origin}/cardapio`, { width: 1024, margin: 2 });
	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'content-disposition': 'attachment; filename="qr-pedidos.png"',
			'cache-control': 'no-store'
		}
	});
};
