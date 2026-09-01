/**
 * 씨앗에서 유도하는 난수 — **저장하지 않고 매번 똑같이 다시 만든다.**
 *
 * 이 프로젝트가 여러 곳에서 쓰는 방식이다. 봉인은 씨앗에서 유도되므로 서버가
 * 언제든 다시 계산해 검증할 수 있고, 세션 표를 둘 이유가 없다.
 * 사전의 퀴즈도 같은 이유로 씨앗을 쓴다 — 서버가 그린 화면과 브라우저가 이어받은
 * 화면이 **같아야** 하기 때문이다. `Math.random()` 을 쓰면 그 둘이 어긋난다.
 */

/** 문자열에서 뽑아낸 결정론적 난수 발생기 (mulberry32) */
export function rngFrom(seed: string): () => number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	let state = hash;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** 씨앗대로 섞는다. 원본은 건드리지 않는다 */
export function shuffled<T>(items: readonly T[], rng: () => number): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}
