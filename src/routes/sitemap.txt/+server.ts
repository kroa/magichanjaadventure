import { sitemapEntries } from '$lib/dict/sitemap';
import type { RequestHandler } from './$types';

/**
 * 사이트맵 (텍스트) — **XML 이 안 읽힐 때의 다른 길.**
 *
 * 구글은 줄바꿈으로 나눈 주소 목록도 사이트맵으로 받는다. 규격은 단순하다:
 * 한 줄에 주소 하나, UTF-8, 다른 것은 아무것도 넣지 않는다(주석도 안 된다).
 *
 * 왜 두 벌인지는 `$lib/dict/sitemap` 에 적었다 — 요약하면, 서치콘솔이 XML 을
 * "가져올 수 없음" 으로 두고 있는데 우리가 잴 수 있는 것은 전부 정상이라
 * 원인을 아직 모르기 때문이다. 모를 때는 길을 하나 더 내 둔다.
 */
export const prerender = true;

export const GET: RequestHandler = () => {
	const body = sitemapEntries().join('\n');

	return new Response(body + '\n', {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
