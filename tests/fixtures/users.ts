/**
 * E2E 테스트용 **가짜** 사용자 데이터.
 *
 * 실제 사용자 정보를 절대 사용하지 않는다.
 * 여기 있는 값은 전부 지어낸 것이며 운영 환경에 존재하지 않는다.
 */

/** 모든 테스트 계정이 공유하는 가짜 비밀번호. 실제 어디에서도 쓰이지 않는 값이다. */
export const TEST_PASSWORD = 'TestPassword123!';

export type CharacterClass = 'knight' | 'wizard';

export interface TestUser {
	nickname: string;
	password: string;
	characterClass: CharacterClass;
}

/**
 * 서비스의 닉네임 최대 길이. `validateNickname` 과 반드시 같아야 한다.
 *
 * 이 값을 넘기면 브라우저의 `maxlength` 가 입력을 **조용히 잘라** 버려서,
 * 서로 다른 테스트가 같은 계정을 쓰게 되고 원인 파악이 매우 어려워진다.
 * 실제로 그 버그를 겪어서 상수로 고정하고 아래에서 강제한다.
 */
export const NICKNAME_MAX = 12;

/**
 * 테스트마다 고유하고 **길이 제한을 넘지 않는** 닉네임을 만든다.
 *
 * Playwright 는 병렬로 돌기 때문에 고정 닉네임을 쓰면 워커끼리 충돌한다.
 * `t_` 접두사는 정리 스크립트가 테스트 계정을 식별하는 표식이다.
 *
 * 이름을 12자에 맞추려면 반드시 자르게 되는데, **자르고 나면 서로 달랐던 이름이 같아질 수 있다.**
 * 실제로 'shop' 과 'shopapi' 가 둘 다 `t_sho_...` 로 잘려 같은 계정이 되었고,
 * 뒤에 실행된 테스트가 "이미 있는 닉네임" 으로 가입에 실패했다.
 * 같은 워커에 배정될 때만 터져서 원인 파악이 오래 걸렸다.
 *
 * 그래서 잘리지 않는 **해시**로 고유성을 보장하고, 라벨은 읽기 편하라고 남겨 둔다.
 */
function shortHash(input: string): string {
	// FNV-1a — 짧고 결정적이면 충분하다 (보안 용도가 아니다)
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash.toString(36).padStart(5, '0').slice(-5);
}

export function makeTestUser(
	label: string,
	seed: number | string,
	characterClass: CharacterClass = 'knight'
): TestUser {
	const safe = label.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'u';

	// 접두사(2) + 해시(5) 를 뺀 나머지를 라벨이 쓴다
	const hash = shortHash(`${label}:${seed}`);
	const labelPart = safe.slice(0, NICKNAME_MAX - 2 - hash.length);

	const nickname = `t_${labelPart}${hash}`;
	if (nickname.length > NICKNAME_MAX) {
		throw new Error(`테스트 닉네임이 ${NICKNAME_MAX}자를 넘습니다: ${nickname}`);
	}

	return { nickname, password: TEST_PASSWORD, characterClass };
}

/** 문서/데모용 고정 이름들 (실제 로그인에는 makeTestUser 를 쓴다). */
export const SAMPLE_NICKNAMES = ['test_knight', 'test_wizard', 'demo_user', 'sample_user'] as const;
