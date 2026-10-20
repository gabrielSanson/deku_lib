// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StaffSession } from '#lib/server/auth/staff.ts';

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			supabase: SupabaseClient | null;
			staff: StaffSession | null;
			requestId: string;
		}
	}
}

export {};
