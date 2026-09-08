import { sitemapEntries } from '$lib/dict/sitemap';
import type { RequestHandler } from './$types';

/**
 * 사이트맵 (XML) — 표준 형식.
 *
 * 주소 목록은 `$lib/dict/sitemap` 이 만든다. 텍스트 형식(`/sitemap.txt`)과
 * 같은 목록을 써야 하므로 여기서 다시 만들지 않는다.
 *
 * 빌드할 때 굽는다. 목록이 시드에서 나오므로 서버가 매번 만들 이유가 없다.
 */
export const prerender = true;

export const GET: RequestHandler = () => {
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		sitemapEntries()
			.map((loc) => `\t<url>\n\t\t<loc>${loc}</loc>\n\t</url>`)
			.join('\n') +
		'\n</urlset>\n';

	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8' }
	});
};
