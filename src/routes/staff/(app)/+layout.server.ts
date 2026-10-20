import { requireStaff } from '#lib/server/auth/staff.ts';
import { config } from '#lib/server/config.ts';
import { getStoreSettings } from '#lib/server/settings/service.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const staff = requireStaff(event);
	event.depends('app:settings');
	const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SHOP_NAME } = config();
	return {
		staff,
		shopName: SHOP_NAME,
		settings: await getStoreSettings(),
		live: { supabaseUrl: PUBLIC_SUPABASE_URL ?? null, supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY ?? null }
	};
};
