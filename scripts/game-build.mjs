import { cpSync, rmSync } from 'node:fs';
import { relative, sep } from 'node:path';

/**
 * 게임 배포본을 만든다 — **사전을 빼고.**
 *
 * ── 왜 빼야 하나 ──────────────────────────────────────────────────
 * 사전 1,000장은 프리렌더된 정적 파일이다. 같이 올리면 Cloudflare Pages 가
 * 워커를 거치지 않고 그대로 내보낸다 — `hooks.server.ts` 의 호스트 판단이
 * 아예 실행되지 않아 게임 도메인에서도 사전이 열린다.
 * 실제로 그랬다: 게임 호스트로 `/hanja` 를 부르니 308 이 아니라 **200** 이 떨어졌다.
 *
 * 파일이 없어야 요청이 워커까지 와서 사전 도메인으로 넘어간다.
 *
 * ── 무엇을 빼는가 ────────────────────────────────────────────────
 * `hanja/` 폴더만 지우면 안 된다. 목차는 `hanja.html` 이라는 **별개 파일**이라
 * 폴더만 지웠을 때 `/hanja` 가 여전히 200 으로 열렸다.
 */
export const DICT_ARTIFACTS = ['hanja', 'hanja.html', 'sitemap.xml'];

/** 이 경로가 사전 산출물인가 (출력 폴더 기준 상대 경로) */
export function isDictArtifact(rel) {
	return DICT_ARTIFACTS.some((name) => rel === name || rel.startsWith(name + '/'));
}

/** `from` 을 `to` 로 복사하되 사전 산출물은 뺀다 */
export function prepareGameCopy(from, to) {
	rmSync(to, { recursive: true, force: true });
	cpSync(from, to, {
		recursive: true,
		filter: (src) => !isDictArtifact(relative(from, src).split(sep).join('/'))
	});
}
