import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

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
 *
 * ── 파일을 지우는 것만으로는 부족했다 ────────────────────────────
 * 지우고 나니 308 이 아니라 **404** 가 떨어졌다. 어댑터가 만든 워커는
 * 프리렌더된 경로 목록을 품고 있어서, 그 목록에 있으면 SvelteKit 을 거치지 않고
 * 곧바로 정적 자산으로 넘긴다 — `hooks.server.ts` 까지 오지 않는다.
 *
 * 그래서 Pages 가 제공하는 `_redirects` 로 처리한다. 이건 워커보다 앞단이라
 * 프리렌더 목록과 무관하게 동작한다. 어제 잠깐 게임 도메인에 올라갔던
 * 사전 주소들도 이 규칙으로 사전 도메인에 넘겨진다.
 */
export const DICT_ARTIFACTS = ['hanja', 'hanja.html', 'sitemap.xml'];

/** 이 경로가 사전 산출물인가 (출력 폴더 기준 상대 경로) */
export function isDictArtifact(rel) {
	return DICT_ARTIFACTS.some((name) => rel === name || rel.startsWith(name + '/'));
}

/** 사전 주소를 사전 도메인으로 넘기는 Pages 규칙 */
export const DICT_REDIRECTS = [
	'# 한자사전은 https://hanjasajeon.pages.dev 로 옮겼습니다.',
	'# 이 규칙은 워커보다 앞단이라 프리렌더 목록과 무관하게 동작합니다.',
	'/hanja https://hanjasajeon.pages.dev/hanja 301',
	'/hanja/* https://hanjasajeon.pages.dev/hanja/:splat 301',
	'/sitemap.xml https://hanjasajeon.pages.dev/sitemap.xml 301',
	''
].join('\n');

/** `from` 을 `to` 로 복사하되 사전 산출물은 빼고, 사전으로 넘기는 규칙을 넣는다 */
export function prepareGameCopy(from, to) {
	rmSync(to, { recursive: true, force: true });
	cpSync(from, to, {
		recursive: true,
		filter: (src) => !isDictArtifact(relative(from, src).split(sep).join('/'))
	});
	writeFileSync(join(to, '_redirects'), DICT_REDIRECTS, 'utf8');
}
