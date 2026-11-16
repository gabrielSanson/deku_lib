import { fail } from '@sveltejs/kit';
import { attempt, formString, shopText } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import type { PayoutField } from '#lib/server/integrations/ifood/payout-csv.ts';
import {
	importIfoodPayouts,
	payoutColumns,
	payoutReport,
	payoutUploads,
	savePayoutColumns
} from '#lib/server/integrations/ifood/payouts.ts';
import type { Actions, PageServerLoad } from './$types';

const FIELDS: PayoutField[] = ['order', 'date', 'gross', 'commission', 'fee', 'net'];

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const uploads = await payoutUploads();
	const chosen = event.url.searchParams.get('extrato') ?? uploads[0]?.id ?? null;
	return {
		uploads,
		chosen,
		report: chosen ? await payoutReport(chosen) : null,
		columns: await payoutColumns(),
		fields: FIELDS
	};
};

export const actions: Actions = {
	upload: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const file = (await event.request.formData()).get('file');
		if (!(file instanceof File) || !file.size || file.size > 5_000_000) {
			return fail(400, { error: await shopText('err.payouts.columns', { missing: '-' }) });
		}
		return attempt(async () => {
			const r = await importIfoodPayouts(await file.text(), file.name, staffActor(staff));
			return { ok: await shopText('ok.payoutsImported', r), uploadId: r.uploadId };
		});
	},
	columns: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const f = await event.request.formData();
		const columns: Partial<Record<PayoutField, string[]>> = {};
		for (const field of FIELDS) {
			const v = formString(f, field);
			if (v) columns[field] = [v];
		}
		await savePayoutColumns(columns, staffActor(staff));
		return { ok: await shopText('ok.pricesSaved') };
	}
};
