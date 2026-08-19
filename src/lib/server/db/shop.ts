import { newId } from './index';
import { CHARACTERS, STARTER_CLASSES, type CharacterClass } from '$lib/types/user';
import { ITEMS_BY_ID, bonusFrom, type StatBonus } from '$lib/types/item';

/**
 * 상점 — **가격과 잔액 검증은 전부 서버에서 한다.**
 * 클라이언트가 보내는 것은 "무엇을 사겠다"는 의사뿐이다.
 */

export interface PurchaseResult {
	ok: boolean;
	/** 실패 사유 (아이가 읽는 문장) */
	reason?: string;
	gems?: number;
}

export async function listOwnedCharacters(
	db: D1Database,
	userId: string
): Promise<CharacterClass[]> {
	const { results } = await db
		.prepare('SELECT class FROM characters WHERE user_id = ?')
		.bind(userId)
		.all<{ class: CharacterClass }>();

	// 기본 캐릭터는 구매 기록이 없어도 항상 가질 수 있다
	const owned = new Set<CharacterClass>(STARTER_CLASSES);
	for (const row of results) owned.add(row.class);
	return [...owned];
}

export async function listOwnedItems(db: D1Database, userId: string): Promise<string[]> {
	const { results } = await db
		.prepare('SELECT item_id FROM user_items WHERE user_id = ?')
		.bind(userId)
		.all<{ item_id: string }>();
	return results.map((r) => r.item_id);
}

/** 아이템 보너스를 합산한 최종 전투 능력치. */
export async function statsFor(
	db: D1Database,
	userId: string,
	characterClass: CharacterClass
): Promise<{ hp: number; attack: number; bonus: StatBonus }> {
	const owned = await listOwnedItems(db, userId);
	const bonus = bonusFrom(owned);
	const base = CHARACTERS[characterClass];
	return { hp: base.hp + bonus.hp, attack: base.attack + bonus.attack, bonus };
}

async function spendGems(db: D1Database, userId: string, price: number): Promise<number | null> {
	const row = await db
		.prepare('SELECT gems FROM users WHERE id = ?')
		.bind(userId)
		.first<{ gems: number }>();
	if (!row || row.gems < price) return null;

	/*
	 * 차감 조건에 `gems >= ?` 를 넣는다.
	 * 두 번 연타해서 요청이 겹쳐도 잔액보다 많이 쓰이지 않는다 (조건부 갱신).
	 */
	const result = await db
		.prepare('UPDATE users SET gems = gems - ?, updated_at = ? WHERE id = ? AND gems >= ?')
		.bind(price, Date.now(), userId, price)
		.run();

	if ((result.meta?.changes ?? 0) === 0) return null;
	return row.gems - price;
}

export async function buyCharacter(
	db: D1Database,
	userId: string,
	cls: CharacterClass
): Promise<PurchaseResult> {
	const info = CHARACTERS[cls];
	if (!info) return { ok: false, reason: '없는 캐릭터예요.' };

	const owned = await listOwnedCharacters(db, userId);
	if (owned.includes(cls)) return { ok: false, reason: '이미 가지고 있어요.' };

	const gems = await spendGems(db, userId, info.price);
	if (gems === null) return { ok: false, reason: '보석이 모자라요. 퀴즈로 더 모아 볼까요?' };

	await db
		.prepare(
			'INSERT INTO characters (id, user_id, class, is_active, created_at) VALUES (?, ?, ?, 0, ?)'
		)
		.bind(newId(), userId, cls, Date.now())
		.run();

	return { ok: true, gems };
}

export async function buyItem(
	db: D1Database,
	userId: string,
	itemId: string
): Promise<PurchaseResult> {
	const item = ITEMS_BY_ID[itemId];
	if (!item) return { ok: false, reason: '없는 아이템이에요.' };

	const owned = await listOwnedItems(db, userId);
	if (owned.includes(itemId)) return { ok: false, reason: '이미 가지고 있어요.' };

	const gems = await spendGems(db, userId, item.price);
	if (gems === null) return { ok: false, reason: '보석이 모자라요. 퀴즈로 더 모아 볼까요?' };

	await db
		.prepare('INSERT INTO user_items (user_id, item_id, acquired_at) VALUES (?, ?, ?)')
		.bind(userId, itemId, Date.now())
		.run();

	return { ok: true, gems };
}

/** 가진 캐릭터로 교체한다. 없으면 거절한다. */
export async function equipCharacter(
	db: D1Database,
	userId: string,
	cls: CharacterClass
): Promise<PurchaseResult> {
	const owned = await listOwnedCharacters(db, userId);
	if (!owned.includes(cls)) return { ok: false, reason: '아직 가지고 있지 않아요.' };

	await db
		.prepare('UPDATE characters SET is_active = 0 WHERE user_id = ? AND is_active = 1')
		.bind(userId)
		.run();

	const existing = await db
		.prepare('SELECT id FROM characters WHERE user_id = ? AND class = ?')
		.bind(userId, cls)
		.first<{ id: string }>();

	if (existing) {
		await db.prepare('UPDATE characters SET is_active = 1 WHERE id = ?').bind(existing.id).run();
	} else {
		// 기본 캐릭터는 구매 기록이 없을 수 있으므로 이때 만든다
		await db
			.prepare(
				'INSERT INTO characters (id, user_id, class, is_active, created_at) VALUES (?, ?, ?, 1, ?)'
			)
			.bind(newId(), userId, cls, Date.now())
			.run();
	}

	return { ok: true };
}
