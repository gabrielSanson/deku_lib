// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StaffSession } from '#lib/server/auth/staff.ts';
import type { CustomerSession } from '#lib/server/auth/customer.ts';
import type { ShopInfo } from '#lib/server/platform/shops.ts';

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			supabase: SupabaseClient | null;
			staff: StaffSession | null;
			customer: CustomerSession | null;
			requestId: string;
			/** The shop this request is for; null only on the platform's own pages (multi-shop). */
			shop: ShopInfo | null;
		}
	}
}

export {};
