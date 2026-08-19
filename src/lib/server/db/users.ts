import { newId, todayKst } from './index';
import { hashPassword, verifyPassword, needsRehash } from '../auth/password';
import type { CharacterClass, SessionUser } from '$lib/types/user';

export interface UserRow {
	id: string;
	nickname: string;
	nickname_key: string;
	password_hash: string;
	level: number;
	exp: number;
	total_exp: number;
	gems: number;
	best_combo: number;
	streak_days: number;
	last_played_on: string | null;
}

/** 닉네임 정규화 — 대소문자/공백 차이로 헷갈리는 계정이 생기지 않게 */
export function normalizeNickname(nickname: string): string {
	return nickname.trim().toLowerCase().normalize('NFKC');
}

export interface NicknameCheck {
	ok: boolean;
	reason?: string;
}

/**
 * 닉네임 규칙.
 *
 * 아이가 쓰는 서비스이므로 규칙을 최대한 느슨하게 두되,
 * 화면이 깨지거나 남을 사칭하는 것만 막는다.
 */
export function validateNickname(nickname: string): NicknameCheck {
	const trimmed = nickname.trim();
	if (trimmed.length < 2) return { ok: false, reason: '닉네임은 2글자 이상이어야 해요.' };
	if (trimmed.length > 12) return { ok: false, reason: '닉네임은 12글자까지 쓸 수 있어요.' };
	if (!/^[가-힣a-zA-Z0-9_]+$/.test(trimmed)) {
		return { ok: false, reason: '한글, 영어, 숫자, _ 만 쓸 수 있어요.' };
	}
	return { ok: true };
}

export function validatePassword(password: string): NicknameCheck {
	if (password.length < 6) return { ok: false, reason: '비밀번호는 6글자 이상이어야 해요.' };
	if (password.length > 72) return { ok: false, reason: '비밀번호가 너무 길어요.' };
	return { ok: true };
}

export async function findByNickname(db: D1Database, nickname: string): Promise<UserRow | null> {
	return db
		.prepare('SELECT * FROM users WHERE nickname_key = ?')
		.bind(normalizeNickname(nickname))
		.first<UserRow>();
}

export async function createUser(
	db: D1Database,
	nickname: string,
	password: string,
	now = Date.now()
): Promise<UserRow> {
	const id = newId();
	const hash = await hashPassword(password);

	await db
		.prepare(
			`INSERT INTO users (id, nickname, nickname_key, password_hash, created_at, updated_at, last_played_on)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(id, nickname.trim(), normalizeNickname(nickname), hash, now, now, todayKst(now))
		.run();

	const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
	if (!row) throw new Error('사용자 생성 직후 조회에 실패했습니다.');
	return row;
}

/** 비밀번호를 확인한다. 맞으면 사용자 행을, 틀리면 null 을 준다. */
export async function authenticate(
	db: D1Database,
	nickname: string,
	password: string
): Promise<UserRow | null> {
	const user = await findByNickname(db, nickname);
	if (!user) {
		/*
		 * 존재하지 않는 계정이어도 해시 계산 시간을 흉내 낸다.
		 * 응답 시간 차이로 "이 닉네임은 있다/없다"가 새어 나가지 않게 한다.
		 */
		await hashPassword(password);
		return null;
	}

	const ok = await verifyPassword(password, user.password_hash);
	if (!ok) return null;

	if (needsRehash(user.password_hash)) {
		const fresh = await hashPassword(password);
		await db
			.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
			.bind(fresh, Date.now(), user.id)
			.run();
	}
	return user;
}

export function toSessionUser(row: UserRow, characterClass: CharacterClass | null): SessionUser {
	return {
		id: row.id,
		nickname: row.nickname,
		level: row.level,
		exp: row.exp,
		totalExp: row.total_exp,
		gems: row.gems,
		characterClass
	};
}

/** 접속 기록 갱신 + 연속 접속일 계산. */
export async function touchLogin(
	db: D1Database,
	userId: string,
	now = Date.now()
): Promise<number> {
	const row = await db
		.prepare('SELECT last_played_on, streak_days FROM users WHERE id = ?')
		.bind(userId)
		.first<{ last_played_on: string | null; streak_days: number }>();
	if (!row) return 0;

	const today = todayKst(now);
	if (row.last_played_on === today) return row.streak_days;

	const yesterday = todayKst(now - 24 * 60 * 60 * 1000);
	const streak = row.last_played_on === yesterday ? row.streak_days + 1 : 1;

	await db
		.prepare('UPDATE users SET last_played_on = ?, streak_days = ?, updated_at = ? WHERE id = ?')
		.bind(today, streak, now, userId)
		.run();

	return streak;
}

export async function getActiveCharacter(
	db: D1Database,
	userId: string
): Promise<CharacterClass | null> {
	const row = await db
		.prepare('SELECT class FROM characters WHERE user_id = ? AND is_active = 1')
		.bind(userId)
		.first<{ class: CharacterClass }>();
	return row?.class ?? null;
}

export async function chooseCharacter(
	db: D1Database,
	userId: string,
	characterClass: CharacterClass,
	now = Date.now()
): Promise<void> {
	// 부분 유니크 인덱스가 "활성 캐릭터는 하나"를 보장하므로 먼저 비활성화한다.
	await db
		.prepare('UPDATE characters SET is_active = 0 WHERE user_id = ? AND is_active = 1')
		.bind(userId)
		.run();

	const existing = await db
		.prepare('SELECT id FROM characters WHERE user_id = ? AND class = ?')
		.bind(userId, characterClass)
		.first<{ id: string }>();

	if (existing) {
		await db.prepare('UPDATE characters SET is_active = 1 WHERE id = ?').bind(existing.id).run();
		return;
	}

	await db
		.prepare(
			'INSERT INTO characters (id, user_id, class, is_active, created_at) VALUES (?, ?, ?, 1, ?)'
		)
		.bind(newId(), userId, characterClass, now)
		.run();
}
