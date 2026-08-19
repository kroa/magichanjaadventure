import type { Handle } from '@sveltejs/kit';
import { resolveSession, SESSION_COOKIE } from '$lib/server/auth/session';

/**
 * 모든 요청의 첫 관문.
 *  1. 세션 쿠키 → locals.user 복원
 *  2. 보안 헤더 부착
 */
export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE) ?? null;
	event.locals.sessionToken = token;
	event.locals.user = null;

	const db = event.platform?.env?.DB;
	if (token && db) {
		try {
			event.locals.user = await resolveSession(db, token);
		} catch {
			// 세션 조회 실패로 앱 전체가 죽으면 안 된다. 비로그인으로 취급한다.
			event.locals.user = null;
		}
	}

	const response = await resolve(event);

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'same-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

	return response;
};
