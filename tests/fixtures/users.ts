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
 */
export function makeTestUser(
	label: string,
	seed: number | string,
	characterClass: CharacterClass = 'knight'
): TestUser {
	const safe = label.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'u';
	const suffix = String(seed)
		.replace(/[^a-z0-9]/gi, '')
		.toLowerCase();

	// 접두사(2) + 구분자(1) 를 뺀 나머지를 라벨과 시드가 나눠 쓴다
	const budget = NICKNAME_MAX - 3;
	const seedPart = suffix.slice(-Math.min(6, budget - 1));
	const labelPart = safe.slice(0, budget - seedPart.length);

	const nickname = `t_${labelPart}_${seedPart}`;
	if (nickname.length > NICKNAME_MAX) {
		throw new Error(`테스트 닉네임이 ${NICKNAME_MAX}자를 넘습니다: ${nickname}`);
	}

	return { nickname, password: TEST_PASSWORD, characterClass };
}

/** 문서/데모용 고정 이름들 (실제 로그인에는 makeTestUser 를 쓴다). */
export const SAMPLE_NICKNAMES = ['test_knight', 'test_wizard', 'demo_user', 'sample_user'] as const;
