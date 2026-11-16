import { redirect } from '@sveltejs/kit';
import { PLATFORM_VIEW_COOKIE } from '#lib/server/platform/console.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	cookies.delete(PLATFORM_VIEW_COOKIE, { path: '/' });
	redirect(303, '/staff/login');
};
