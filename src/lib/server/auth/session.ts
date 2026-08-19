import type { Cookies } from '@sveltejs/kit';
import type { SessionUser } from '$lib/types/user';

export const SESSION_COOKIE = 'mha_session';
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
/** 만료가 이만큼 남았을 때 슬라이딩 연장한다 */
const RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 원문 토큰을 만든다. 이 값은 쿠키에만 들어가고 DB 에는 저장하지 않는다. */
export function createSessionToken(): string {
	return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * 토큰의 SHA-256 해시. **이것이 DB 에 저장되는 값**이다.
 *
 * DB 가 유출되어도 원문 토큰을 복원할 수 없으므로 세션을 탈취당하지 않는다.
 */
export async function hashSessionToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface SessionRow {
	id: string;
	user_id: string;
	expires_at: number;
}

export async function createSession(
	db: D1Database,
	userId: string,
	now = Date.now()
): Promise<{ token: string; expiresAt: number }> {
	const token = createSessionToken();
	const id = await hashSessionToken(token);
	const expiresAt = now + SESSION_MS;

	await db
		.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
		.bind(id, userId, now, expiresAt)
		.run();

	// 만료된 세션을 확률적으로 청소한다. Cron Trigger 없이 무료로 유지된다.
	if (Math.random() < 0.05) {
		await db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
	}

	return { token, expiresAt };
}

/** 세션을 검증하고 사용자 정보를 돌려준다. 유효하지 않으면 null. */
export async function resolveSession(
	db: D1Database,
	token: string,
	now = Date.now()
): Promise<SessionUser | null> {
	const id = await hashSessionToken(token);

	const row = await db
		.prepare(
			`SELECT s.expires_at, u.id, u.nickname, u.level, u.exp, u.total_exp, u.gems,
			        (SELECT class FROM characters c WHERE c.user_id = u.id AND c.is_active = 1) AS character_class
			 FROM sessions s
			 JOIN users u ON u.id = s.user_id
			 WHERE s.id = ?`
		)
		.bind(id)
		.first<{
			expires_at: number;
			id: string;
			nickname: string;
			level: number;
			exp: number;
			total_exp: number;
			gems: number;
			character_class: 'knight' | 'wizard' | null;
		}>();

	if (!row) return null;

	if (row.expires_at <= now) {
		await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
		return null;
	}

	// 슬라이딩 연장 — 자주 오는 아이가 갑자기 로그아웃되지 않게
	if (row.expires_at - now < RENEW_THRESHOLD_MS) {
		await db
			.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
			.bind(now + SESSION_MS, id)
			.run();
	}

	return {
		id: row.id,
		nickname: row.nickname,
		level: row.level,
		exp: row.exp,
		totalExp: row.total_exp,
		gems: row.gems,
		characterClass: row.character_class
	};
}

export async function destroySession(db: D1Database, token: string): Promise<void> {
	const id = await hashSessionToken(token);
	await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
}

/**
 * 쿠키를 심는다.
 *
 * `secure` 는 환경변수가 아니라 **요청 URL 의 프로토콜**로 결정한다.
 * 설정 실수로 운영에서 Secure 가 꺼지는 사고를 막기 위해서다.
 */
export function setSessionCookie(cookies: Cookies, token: string, url: URL): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: SESSION_DAYS * 24 * 60 * 60
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
