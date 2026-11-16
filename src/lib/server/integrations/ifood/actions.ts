// The iFood connection form actions (save credentials, test, switch on/off), shared
// by the setup wizard and Configurações → iFood so both pages edit the same thing.
import { fail, type RequestEvent } from '@sveltejs/kit';
import { attempt, failText, formString, shopText } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { checkIfoodConnection } from './check';
import { finishIfoodLink, setIfoodHomologation, startIfoodLink, unlinkIfood } from './connect';
import {
	ifoodSettings,
	invalidateIfoodSettings,
	recordIfoodCheck,
	saveIfoodCredentials,
	setIfoodEnabled
} from './settings';

export const ifoodActions = {
	ifoodLinkStart: async (event: RequestEvent) => {
		const staff = requireStaff(event, ADMIN);
		return attempt(async () => ({ link: await startIfoodLink(staffActor(staff)) }));
	},
	ifoodLinkFinish: async (event: RequestEvent) => {
		const staff = requireStaff(event, ADMIN);
		const code = formString(await event.request.formData(), 'authorizationCode');
		return attempt(async () => {
			await finishIfoodLink(code, staffActor(staff));
			return { ok: await shopText('ok.ifoodLinked') };
		});
	},
	ifoodUnlink: async (event: RequestEvent) => {
		const staff = requireStaff(event, ADMIN);
		await unlinkIfood(staffActor(staff));
		return { ok: true };
	},
	ifoodHomologation: async (event: RequestEvent) => {
		const staff = requireStaff(event, ADMIN);
		const on = formString(await event.request.formData(), 'on') === '1';
		await setIfoodHomologation(on, staffActor(staff));
		return { ok: true };
	},
	ifoodSave: async (event: RequestEvent) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const r = await attempt(async () => {
			await saveIfoodCredentials(
				{
					clientId: formString(d, 'clientId'),
					clientSecret: formString(d, 'clientSecret'),
					merchantId: formString(d, 'merchantId')
				},
				staffActor(staff)
			);
			return { ok: true };
		});
		if (!('ok' in r)) return r;
		return runCheck();
	},
	ifoodTest: async (event: RequestEvent) => {
		requireStaff(event, ADMIN);
		return runCheck();
	},
	ifoodEnable: async (event: RequestEvent) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const enable = formString(d, 'enabled') === '1';
		if (enable && d.get('understood') !== 'on') {
			return failText(400, 'err.ifood.acknowledge');
		}
		return attempt(async () => {
			await setIfoodEnabled(enable, staffActor(staff));
			return {
				ok: enable
					? 'iFood ligado. Os pedidos novos aparecem em Início e na cozinha. Acompanhe os primeiros pelo Gestor de Pedidos do iFood também.'
					: 'iFood desligado. Lance pedidos do iFood pelo Caixa em "iFood (manual)".'
			};
		});
	}
};

async function runCheck() {
	invalidateIfoodSettings();
	const s = await ifoodSettings({ fresh: true });
	if (s.problem) return fail(400, { error: s.problem });
	if (!s.clientId || !s.clientSecret || !s.merchantId) {
		return failText(400, 'err.ifood.credentials');
	}
	const result = await checkIfoodConnection({
		base: s.apiBase,
		clientId: s.clientId,
		clientSecret: s.clientSecret,
		merchantId: s.merchantId,
		refreshToken: s.authMode === 'app' ? s.refreshToken : null
	});
	if (result.ok) {
		await recordIfoodCheck(true, null);
		return { ok: await shopText('ok.ifoodConnected') };
	}
	const { problem } = result;
	await recordIfoodCheck(false, `${problem.title} ${problem.action}`);
	return fail(400, { ifoodProblem: problem });
}
