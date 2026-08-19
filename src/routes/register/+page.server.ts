import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import {
	createUser,
	findByNickname,
	validateNickname,
	validatePassword
} from '$lib/server/db/users';
import { createSession, setSessionCookie } from '$lib/server/auth/session';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, platform, cookies, url }) => {
		const db = getDb(platform);
		const form = await request.formData();
		const nickname = String(form.get('nickname') ?? '');
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		const nickCheck = validateNickname(nickname);
		if (!nickCheck.ok) return fail(400, { nickname, error: nickCheck.reason });

		const passCheck = validatePassword(password);
		if (!passCheck.ok) return fail(400, { nickname, error: passCheck.reason });

		if (password !== confirm) {
			return fail(400, { nickname, error: '비밀번호가 서로 달라요. 다시 확인해 주세요.' });
		}

		const existing = await findByNickname(db, nickname);
		if (existing) {
			return fail(409, {
				nickname,
				error: '이미 쓰고 있는 닉네임이에요. 다른 이름을 지어 볼까요?'
			});
		}

		const user = await createUser(db, nickname, password);
		const { token } = await createSession(db, user.id);
		setSessionCookie(cookies, token, url);

		// 가입 직후엔 캐릭터가 없으니 캐릭터 선택으로 보낸다
		redirect(303, '/character');
	}
};
