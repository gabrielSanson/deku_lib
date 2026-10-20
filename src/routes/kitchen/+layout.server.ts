import { requireStaff } from '#lib/server/auth/staff.ts';
import { config } from '#lib/server/config.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const staff = requireStaff(event);
	const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = config();
	return {
		staff,
		live: { supabaseUrl: PUBLIC_SUPABASE_URL ?? null, supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY ?? null }
	};
};
