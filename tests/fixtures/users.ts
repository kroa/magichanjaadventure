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
 * 테스트마다 고유한 닉네임을 만든다.
 *
 * Playwright 는 병렬로 돌기 때문에 고정 닉네임을 쓰면 워커끼리 충돌한다.
 * `test_` 접두사는 정리 스크립트가 테스트 계정을 식별하는 표식이기도 하다.
 */
export function makeTestUser(
	label: string,
	seed: number | string,
	characterClass: CharacterClass = 'knight'
): TestUser {
	const safe = label.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'user';
	return {
		nickname: `test_${safe}_${seed}`,
		password: TEST_PASSWORD,
		characterClass
	};
}

/** 문서/데모용 고정 이름들 (실제 로그인에는 makeTestUser 를 쓴다). */
export const SAMPLE_NICKNAMES = ['test_knight', 'test_wizard', 'demo_user', 'sample_user'] as const;
