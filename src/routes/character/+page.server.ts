import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { chooseCharacter } from '$lib/server/db/users';
import type { CharacterClass } from '$lib/types/user';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	return { current: locals.user.characterClass };
};

const VALID: CharacterClass[] = ['knight', 'wizard'];

export const actions: Actions = {
	default: async ({ request, platform, locals }) => {
		if (!locals.user) redirect(303, '/login');

		const db = getDb(platform);
		const form = await request.formData();
		const choice = String(form.get('class') ?? '') as CharacterClass;

		if (!VALID.includes(choice)) {
			return fail(400, { error: '캐릭터를 골라 주세요.' });
		}

		await chooseCharacter(db, locals.user.id, choice);
		redirect(303, '/');
	}
};
