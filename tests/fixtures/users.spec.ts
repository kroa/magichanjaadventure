import { describe, expect, it } from 'vitest';
import { makeTestUser, NICKNAME_MAX, TEST_PASSWORD } from './users';

/**
 * 테스트 계정 생성기 자체를 검증한다.
 *
 * 이 함수가 조용히 같은 닉네임을 두 번 만들면, 뒤에 실행된 테스트가
 * "이미 있는 닉네임" 으로 가입에 실패한다. 그런데 실패는 **엉뚱한 곳**에서 —
 * 가입 이후 단계의 타임아웃으로 — 나타나기 때문에 원인을 찾기가 매우 어렵다.
 * 실제로 'shop' 과 'shopapi' 가 같은 이름으로 잘려서 그 일을 겪었다.
 */
describe('makeTestUser', () => {
	const LABELS = [
		'shop',
		'shopapi',
		'start',
		'quiz',
		'quizag',
		'battle',
		'again',
		'exit',
		'qexit',
		'btl',
		'btlwin',
		'btlfail',
		'btlnolose',
		'btlstar',
		'btldex',
		'btlapi'
	];
	const SEEDS = ['desktop0', 'desktop1', 'tablet0', 'tablet1', 'mobile0', 'mobile1'];

	it('닉네임 길이 제한을 넘지 않는다', () => {
		for (const label of LABELS) {
			for (const seed of SEEDS) {
				expect(makeTestUser(label, seed).nickname.length).toBeLessThanOrEqual(NICKNAME_MAX);
			}
		}
	});

	it('라벨이 잘려도 서로 다른 조합은 서로 다른 닉네임이 된다', () => {
		const seen = new Map<string, string>();
		for (const label of LABELS) {
			for (const seed of SEEDS) {
				const { nickname } = makeTestUser(label, seed);
				const key = `${label}:${seed}`;
				const clash = seen.get(nickname);
				expect(clash, `${key} 와 ${clash} 가 같은 닉네임(${nickname})을 만든다`).toBeUndefined();
				seen.set(nickname, key);
			}
		}
	});

	it('접두사로 테스트 계정임을 알 수 있다', () => {
		// 정리 스크립트가 이 접두사로 테스트 계정만 지운다
		expect(makeTestUser('shop', 'desktop0').nickname.startsWith('t_')).toBe(true);
	});

	it('같은 입력이면 같은 닉네임이 나온다', () => {
		expect(makeTestUser('shop', 'desktop0')).toEqual(makeTestUser('shop', 'desktop0'));
	});

	it('실제 개인정보를 쓰지 않는다', () => {
		const user = makeTestUser('shop', 'desktop0');
		expect(user.password).toBe(TEST_PASSWORD);
		expect(user.nickname).not.toMatch(/@|\d{3}-\d{4}/);
	});
});
