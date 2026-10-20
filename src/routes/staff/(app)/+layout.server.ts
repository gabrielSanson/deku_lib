import { requireStaff } from '#lib/server/auth/staff.ts';
import { config } from '#lib/server/config.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import { getStoreSettings } from '#lib/server/settings/service.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const staff = requireStaff(event);
	event.depends('app:settings');
	const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = config();
	const profile = await getStoreProfile();
	return {
		staff,
		shopName: profile.displayName,
		setupDone: Boolean(profile.setupCompletedAt),
		settings: await getStoreSettings(),
		live: {
			supabaseUrl: PUBLIC_SUPABASE_URL ?? null,
			supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY ?? null
		}
	};
};
