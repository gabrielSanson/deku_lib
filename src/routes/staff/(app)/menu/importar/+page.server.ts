import { fail } from '@sveltejs/kit';
import { parseMenuCsv } from '#lib/domain/menu-csv.ts';
import { attempt, formString, shopText } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { importMenuCsv } from '#lib/server/catalog/csv-import.ts';
import { ifoodClient } from '#lib/server/integrations/ifood/api.ts';
import { readIfoodMenuAsCsv } from '#lib/server/integrations/ifood/catalog.ts';
import { explainIfoodError } from '#lib/server/integrations/ifood/check.ts';
import { ifoodSettings } from '#lib/server/integrations/ifood/settings.ts';
import type { Actions, PageServerLoad } from './$types';

const MAX_BYTES = 1_000_000;

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	return {
		fromSetup: event.url.searchParams.has('configuracao'),
		ifoodOn: (await ifoodSettings()).enabled
	};
};

function previewOf(csv: string) {
	const result = parseMenuCsv(csv);
	if (result.fileProblem) return fail(400, { problem: result.fileProblem });
	return {
		csv,
		rows: result.rows,
		ready: Boolean(result.catalog),
		count: result.rows.length
	};
}

export const actions: Actions = {
	preview: async (event) => {
		requireStaff(event, ADMIN);
		const file = (await event.request.formData()).get('file');
		if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) {
			return fail(400, { problem: 'empty' as const });
		}
		return previewOf(await file.text());
	},
	/** iFood's menu, read back into the same preview (S2.3). */
	ifood: async (event) => {
		requireStaff(event, ADMIN);
		if (!(await ifoodSettings()).enabled) return fail(400, { problem: 'empty' as const });
		let csv: string;
		try {
			csv = await readIfoodMenuAsCsv(ifoodClient());
		} catch (err) {
			return fail(502, { error: explainIfoodError(err, 'merchant').title });
		}
		return previewOf(csv);
	},
	import: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const csv = formString(await event.request.formData(), 'csv');
		if (!csv || csv.length > MAX_BYTES) return fail(400, { problem: 'empty' as const });
		return attempt(async () => {
			const counts = await importMenuCsv(csv, staffActor(staff));
			return { imported: await shopText('ok.menuImported', counts) };
		});
	}
};
