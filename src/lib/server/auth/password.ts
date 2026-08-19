/**
 * 비밀번호 해시 — Web Crypto PBKDF2-SHA256.
 *
 * bcrypt / argon2 를 쓰지 않는 이유 (docs/00-ARCHITECTURE.md §5):
 *  Workers 런타임에서 WASM 번들 비용이 크다. SubtleCrypto 는 네이티브라 훨씬 빠르고
 *  추가 의존성이 0이다.
 *
 * ⚠️ 반복 횟수는 상수 하나로 조정 가능하게 둔다.
 *    Workers 무료 플랜의 요청당 CPU 제한(10ms)에서 빠듯할 수 있어 배포 후 실측한다.
 */

export const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
		key,
		KEY_LENGTH_BITS
	);
	return new Uint8Array(bits);
}

/**
 * 저장 포맷: `pbkdf2$sha256$<iters>$<saltB64>$<hashB64>`
 *
 * 알고리즘 접두사를 넣어 두면 나중에 알고리즘을 바꿔도
 * 기존 사용자가 로그인할 때 자연스럽게 재해시할 수 있다.
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const hash = await derive(password, salt, PBKDF2_ITERATIONS);
	return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** 타이밍 공격을 피하려고 상수 시간으로 비교한다. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.split('$');
	if (parts.length !== 5) return false;

	const [scheme, algorithm, itersRaw, saltB64, hashB64] = parts;
	if (scheme !== 'pbkdf2' || algorithm !== 'sha256') return false;

	const iterations = Number.parseInt(itersRaw, 10);
	if (!Number.isFinite(iterations) || iterations <= 0) return false;

	try {
		const salt = fromBase64(saltB64);
		const expected = fromBase64(hashB64);
		const actual = await derive(password, salt, iterations);
		return timingSafeEqual(actual, expected);
	} catch {
		return false;
	}
}

/** 저장된 해시가 현재 기준보다 약하면 로그인 시 다시 해시한다. */
export function needsRehash(stored: string): boolean {
	const parts = stored.split('$');
	if (parts.length !== 5) return true;
	const iterations = Number.parseInt(parts[2], 10);
	return !Number.isFinite(iterations) || iterations < PBKDF2_ITERATIONS;
}
