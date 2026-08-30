import { ALL, GRADES } from '$lib/dict';
import type { RequestHandler } from './$types';

/**
 * 사이트맵 — **사전만 싣는다.**
 *
 * 게임은 로그인 뒤에 있어 크롤러가 볼 수 없고, 색인되어 봤자 로그인 화면으로
 * 리다이렉트될 뿐이다. 없는 페이지를 실은 사이트맵은 신뢰만 깎는다.
 *
 * 사이트맵도 빌드할 때 굽는다. 목록이 시드에서 나오므로 서버가 매번 만들 이유가 없다.
 */
export const prerender = true;

const SITE = 'https://magichanjaadventure.pages.dev';

export const GET: RequestHandler = () => {
	/*
	 * 경로 전체를 한 번에 인코딩한다.
	 *
	 * 조각마다 `encodeURIComponent` 를 쓰면 `/hanja/급수/8%EA%B8%89` 처럼
	 * 한글이 섞여 나온다. 동작은 하지만 사이트맵은 RFC 3986 로 이스케이프된
	 * 주소를 요구하므로 한 가지 모양으로 통일한다.
	 */
	const urls = [
		{ loc: encodeURI(`${SITE}/hanja`), priority: '1.0' },
		...GRADES.map((g) => ({ loc: encodeURI(`${SITE}/hanja/급수/${g.label}`), priority: '0.8' })),
		...ALL.map((e) => ({ loc: encodeURI(`${SITE}/hanja/${e.character}`), priority: '0.6' }))
	];

	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		urls
			.map(
				(u) => `\t<url>\n\t\t<loc>${u.loc}</loc>\n\t\t<priority>${u.priority}</priority>\n\t</url>`
			)
			.join('\n') +
		'\n</urlset>\n';

	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8' }
	});
};
