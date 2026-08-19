import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import {
	buyCharacter,
	buyItem,
	equipCharacter,
	listOwnedCharacters,
	listOwnedItems
} from '$lib/server/db/shop';
import { isCharacterClass } from '$lib/types/user';
import { expToNextLevel } from '$lib/game/exp';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.characterClass) redirect(303, '/character');

	const db = getDb(platform);
	const [ownedCharacters, ownedItems] = await Promise.all([
		listOwnedCharacters(db, locals.user.id),
		listOwnedItems(db, locals.user.id)
	]);

	return {
		user: locals.user,
		expToNext: expToNextLevel(locals.user.level),
		ownedCharacters,
		ownedItems
	};
};

export const actions: Actions = {
	buyCharacter: async ({ request, platform, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const db = getDb(platform);
		const cls = String((await request.formData()).get('class') ?? '');
		if (!isCharacterClass(cls)) return fail(400, { error: '없는 캐릭터예요.' });

		const result = await buyCharacter(db, locals.user.id, cls);
		if (!result.ok) return fail(400, { error: result.reason });
		return { bought: cls, gems: result.gems };
	},

	equip: async ({ request, platform, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const db = getDb(platform);
		const cls = String((await request.formData()).get('class') ?? '');
		if (!isCharacterClass(cls)) return fail(400, { error: '없는 캐릭터예요.' });

		const result = await equipCharacter(db, locals.user.id, cls);
		if (!result.ok) return fail(400, { error: result.reason });
		return { equipped: cls };
	},

	buyItem: async ({ request, platform, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const db = getDb(platform);
		const itemId = String((await request.formData()).get('itemId') ?? '');

		const result = await buyItem(db, locals.user.id, itemId);
		if (!result.ok) return fail(400, { error: result.reason });
		return { boughtItem: itemId, gems: result.gems };
	}
};
