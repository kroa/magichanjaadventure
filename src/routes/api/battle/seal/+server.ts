import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { attack } from '$lib/server/db/battle';

/**
 * 봉인 두드리기.
 *
 * 화면은 조합표에 **없는** 조합이면 여기까지 오지도 않는다 (클라이언트가 즉시 되돌린다).
 * 그래서 이 엔드포인트로 오는 건 "유효한 합체를 만들었다" 는 뜻이고,
 * 서버는 그것이 **이번 판의 봉인 중 하나인지**를 스스로 유도해서 확인한다.
 * 화면은 봉인 번호를 알 필요도, 알 방법도 없다.
 *
 * 실패해도 아이에게서 빼앗는 것은 없다. 벌은 여기에도 없다.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) error(401, '로그인이 필요해요.');
	const db = getDb(platform);

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, '요청을 이해할 수 없어요.');

	const { sessionKey, areaId, parts, firstTry } = body as {
		sessionKey?: unknown;
		areaId?: unknown;
		parts?: unknown;
		firstTry?: unknown;
	};

	if (typeof sessionKey !== 'string' || !sessionKey) error(400, '세션 정보가 없어요.');
	if (!Array.isArray(parts) || parts.length < 2 || parts.length > 4) {
		return json({ ok: false, reason: 'no-recipe' });
	}

	const outcome = await attack(
		db,
		locals.user.id,
		sessionKey,
		Number.isInteger(areaId) ? (areaId as number) : 1,
		parts.map(String),
		firstTry === true
	);

	return json(outcome);
};
