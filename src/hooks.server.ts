import { redirect, type Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { resolveSession, SESSION_COOKIE } from '$lib/server/auth/session';
import { DICT_ORIGIN, GAME_ORIGIN, isDictPath, siteOf } from '$lib/sites';

/**
 * 모든 요청의 첫 관문.
 *  1. 세션 쿠키 → locals.user 복원
 *  2. 보안 헤더 부착
 */
export const handle: Handle = async ({ event, resolve }) => {
	/*
	 * **제 사이트의 경로만 연다.**
	 *
	 * 같은 산출물이 두 Pages 프로젝트에 올라가므로, 갈라 주지 않으면 같은 주소가
	 * 두 도메인에서 열려 중복 콘텐츠가 된다. 세션을 찾기 **전에** 판단해서,
	 * 사전 도메인 요청이 운영 D1 을 건드릴 일이 없게 한다.
	 */
	if (!building) {
		const site = siteOf(event.request.headers.get('host'));
		const path = event.url.pathname;
		if (site === 'dict' && !isDictPath(path)) {
			redirect(308, `${GAME_ORIGIN}${path}${event.url.search}`);
		}
		if (site === 'game' && isDictPath(path) && path !== '/robots.txt') {
			redirect(308, `${DICT_ORIGIN}${path}${event.url.search}`);
		}
	}

	const token = event.cookies.get(SESSION_COOKIE) ?? null;
	event.locals.sessionToken = token;
	event.locals.user = null;

	/*
	 * 빌드할 때는 세션을 찾지 않는다.
	 *
	 * 한자 사전(/hanja)은 프리렌더로 굽는데, 그 과정에는 D1 이 없다.
	 * 여기서 platform.env.DB 에 손을 대면 어댑터가
	 * "Cannot access platform.env.DB in a prerenderable route" 로 빌드를 세운다.
	 * 사전은 어차피 로그인과 무관하므로 건너뛰어도 잃는 것이 없다.
	 */
	const db = building ? undefined : event.platform?.env?.DB;
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
