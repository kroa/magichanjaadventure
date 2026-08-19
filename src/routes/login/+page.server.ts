import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { authenticate, getActiveCharacter, touchLogin } from '$lib/server/db/users';
import { createSession, setSessionCookie } from '$lib/server/auth/session';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/');
	return {};
};

/**
 * 아주 단순한 in-memory rate limit.
 *
 * Worker 인스턴스마다 따로 세므로 완벽하진 않지만,
 * 한 아이가 실수로 비밀번호를 반복 입력하는 상황을 막기에는 충분하고 비용이 0이다.
 * 본격적인 제한이 필요해지면 D1 이나 KV 로 옮긴다.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

function tooManyAttempts(key: string, now: number): boolean {
	const entry = attempts.get(key);
	if (!entry || entry.resetAt < now) {
		attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return false;
	}
	entry.count += 1;
	return entry.count > MAX_ATTEMPTS;
}

export const actions: Actions = {
	default: async ({ request, platform, cookies, url }) => {
		const db = getDb(platform);
		const form = await request.formData();
		const nickname = String(form.get('nickname') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!nickname || !password) {
			return fail(400, { nickname, error: '닉네임과 비밀번호를 모두 입력해 주세요.' });
		}

		if (tooManyAttempts(nickname.toLowerCase(), Date.now())) {
			return fail(429, { nickname, error: '잠시 후 다시 시도해 주세요.' });
		}

		const user = await authenticate(db, nickname, password);
		if (!user) {
			// 어느 쪽이 틀렸는지 알려 주지 않는다 (계정 존재 여부 유출 방지)
			return fail(401, { nickname, error: '닉네임이나 비밀번호가 맞지 않아요.' });
		}

		await touchLogin(db, user.id);
		const { token } = await createSession(db, user.id);
		setSessionCookie(cookies, token, url);

		const characterClass = await getActiveCharacter(db, user.id);
		redirect(303, characterClass ? '/' : '/character');
	}
};
