// Configurações → Divulgar: the shop's order link, a QR code and how to put the link on Google
// and Instagram. Only instructions: no calls to Google or Meta.
import QRCode from 'qrcode';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'settings.edit');
	// Staff reach the admin on the shop's own address, so that is the link customers use.
	const link = `${event.url.origin}/cardapio`;
	return {
		link,
		qrSvg: await QRCode.toString(link, { type: 'svg', margin: 1, width: 220 })
	};
};
