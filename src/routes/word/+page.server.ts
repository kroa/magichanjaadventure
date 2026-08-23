import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { loadWordRound, tryWord } from '$lib/server/db/words';
import { grantRewards } from '$lib/server/game/rewards';
import { EXP_REWARD } from '$lib/game/exp';
import { expToNextLevel } from '$lib/game/exp';

/**
 * 낱말 놀이 — **배운 글자가 실제로 쓰이는 자리.**
 *
 * 합체는 아이가 배운 글자의 5%만 건드린다. 室 을 파내도 놀이에 영영 안 나온다 —
 * 至·宀 이 우리 1000자에 없어서 조합으로는 구제할 수 없기 때문이다.
 * 그런데 敎室 은 된다. 敎 는 室 바로 앞에 배우는 글자다.
 *
 * 라우트를 /quiz 에 얹지 않고 따로 뺀 이유: 복습의 조각 판은 "빛난 두 조각을
 * DOM 순서로 누른다" 는 계약 위에 서 있는데, 낱말은 **자리가 있어서** 그 계약과 다르다.
 */
export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.characterClass) redirect(303, '/character');

	const db = getDb(platform);
	const focus = url.searchParams.get('focus') ?? '';
	const round = Number(url.searchParams.get('r') ?? '0') || 0;

	const state = await loadWordRound(db, locals.user.id, focus, round);

	return {
		user: locals.user,
		expToNext: expToNextLevel(locals.user.level),
		/*
		 * 조각은 목표 낱말들의 글자를 **그대로 펼친 것**이다.
		 * 미끼를 섞지 않는다 — 판을 비우는 것이 목표라는 규칙이 대결·복습과 같아야 한다.
		 */
		pieces: state.goals
			.flatMap((w) => [w.head, w.tail])
			.map((character, id) => ({ id, character })),
		total: state.goals.length,
		madeTotal: state.discovered.length,
		makeable: state.makeable,
		focus,
		round,
		/** 방금 배운 글자로 만들 수 있는 낱말이 이 판에 있는가 */
		focused: focus.length > 0 && state.goals.some((w) => w.word.includes(focus))
	};
};

export const actions: Actions = {
	/**
	 * 앞 글자와 뒤 글자를 놓았다.
	 *
	 * **순서가 중요하다.** 敎室 은 되고 室敎 는 안 된다. 그렇다고 "순서가 틀렸어요" 라고
	 * 말하지는 않는다 — 아직 안 채운 칸일 뿐이다.
	 */
	make: async ({ request, platform, locals, url }) => {
		if (!locals.user) redirect(303, '/login');
		const db = getDb(platform);

		const form = await request.formData();
		const head = String(form.get('head') ?? '');
		const tail = String(form.get('tail') ?? '');
		if (head.length !== 1 || tail.length !== 1) return { ok: false as const };

		const focus = url.searchParams.get('focus') ?? '';
		const round = Number(url.searchParams.get('r') ?? '0') || 0;

		const outcome = await tryWord(db, locals.user.id, head, tail, focus, round);
		if (!outcome.ok) {
			return { ok: false as const, reason: outcome.reason, word: outcome.word };
		}

		// 처음 만든 낱말에만 보상을 준다. 같은 것을 반복해서 EXP 를 캐지 못하게
		const reward = outcome.alreadyKnown
			? null
			: await grantRewards(db, locals.user.id, { expGained: EXP_REWARD.correctAnswer });

		return {
			ok: true as const,
			word: outcome.word.word,
			reading: outcome.word.reading,
			meaning: outcome.word.meaning,
			alreadyKnown: outcome.alreadyKnown,
			reward
		};
	}
};
