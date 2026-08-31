import { DICT_ORIGIN, siteOf } from '$lib/sites';
import type { RequestHandler } from './$types';

/**
 * robots.txt 는 **도메인마다 달라야 한다.**
 *
 * 정적 파일 하나로는 나눌 수 없어 라우트로 옮겼다.
 *  - 사전 도메인: 전부 열고 사이트맵을 가리킨다
 *  - 게임 도메인: 전부 막는다. 로그인 뒤라 색인해 봐야 로그인 폼만 남고,
 *    그 로그인 폼이 검색결과에 뜨는 것은 아무에게도 도움이 안 된다
 */
export const GET: RequestHandler = ({ request }) => {
	const dict = siteOf(request.headers.get('host')) !== 'game';

	const body = dict
		? [
				'# 한자사전 — 공개 자료입니다. 마음껏 긁어도 됩니다.',
				'User-agent: *',
				'Allow: /',
				'',
				`Sitemap: ${DICT_ORIGIN}/sitemap.xml`,
				''
			].join('\n')
		: [
				'# 마법한자탐험대 — 아이들이 로그인해서 하는 게임입니다.',
				'# 화면이 전부 로그인 뒤에 있어 색인할 것이 없습니다.',
				'# 공개 자료(한자사전)는 https://hanjasajeon.pages.dev 에 있습니다.',
				'User-agent: *',
				'Disallow: /',
				''
			].join('\n');

	return new Response(body, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
