import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearSessionCookie, destroySession } from '$lib/server/auth/session';

/** POST 로만 받는다. GET 로그아웃은 링크 프리페치만으로도 세션이 날아간다. */
export const POST: RequestHandler = async ({ locals, platform, cookies }) => {
	const db = platform?.env?.DB;
	if (db && locals.sessionToken) {
		await destroySession(db, locals.sessionToken);
	}
	clearSessionCookie(cookies);
	redirect(303, '/login');
};
