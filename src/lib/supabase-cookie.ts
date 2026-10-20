// One fixed auth cookie name for server and browser. The default name is derived
// from the Supabase URL, which differs when the server uses a private gateway URL.
export const SUPABASE_COOKIE_OPTIONS = { name: 'sb-shop-auth' } as const;
