/**
 * 한 코드베이스, 두 사이트.
 *
 * ── 왜 도메인을 나누는가 ────────────────────────────────────────────
 * 게임은 초등학생용이고 사전은 검색으로 들어오는 어른용이다. 한 도메인 안에
 * 두 얼굴을 두면 광고 대상 판정이 계속 애매하게 남는다 — Google 은 아동 대상
 * 통지를 **사이트 단위**로도 받으므로, 게임 도메인에 그 표시를 걸면 사전까지
 * 단가가 떨어지고, 안 걸면 정책 위반이다. 도메인이 갈리면 그 선택 자체가 없어진다.
 *
 * AdSense 심사에도 유리하다. 미승인 사유 목록에 "로그인 뒤에 있는 페이지" 가
 * 있는데, 사전 도메인에는 로그인이 **하나도 없다.**
 *
 * ── 어떻게 나누는가 ────────────────────────────────────────────────
 * 빌드는 하나다. 같은 산출물을 두 Pages 프로젝트에 올리고, **요청의 호스트를 보고**
 * 제 것이 아닌 경로를 상대 도메인으로 보낸다. 그래야 같은 주소가 두 도메인에서
 * 열려 중복 콘텐츠가 되는 일이 없다.
 */

export const GAME_HOST = 'magichanjaadventure.pages.dev';
export const DICT_HOST = 'hanjasajeon.pages.dev';

export const GAME_ORIGIN = `https://${GAME_HOST}`;
export const DICT_ORIGIN = `https://${DICT_HOST}`;

/**
 * IndexNow 소유확인 키.
 *
 * 검색엔진(네이버·Bing 등)에 "이 주소들이 바뀌었다" 고 알릴 때, 그 알림이
 * 진짜 이 사이트 주인에게서 온 것인지를 **이 파일 하나로** 증명한다.
 * 로그인도 계정 등록도 필요 없는 것이 요점이다.
 *
 * 비밀값이 아니라 **공개되어야 하는** 표식이다 — 검색엔진이 직접 받아 가서
 * 본문이 키와 같은지 본다. 서치콘솔 소유확인 메타 태그와 같은 부류다.
 *
 * 파일은 `static/<키>.txt` 에 있다. 값이 바뀌면 두 곳을 함께 고쳐야 한다.
 */
export const INDEXNOW_KEY = '9dda83b0a5957e29009a4ea9ebd272b0';

/**
 * 사전 도메인에서 열려야 하는 경로.
 *
 * IndexNow 키가 여기 없으면 **게임 도메인으로 308 튕긴다.** 실제로 그랬다 —
 * `/favicon.png` 가 308 로 넘어가는 것을 보고 알았다. 검색엔진은 키를 못 읽고
 * 403(키가 유효하지 않음)을 돌려주므로, 알림이 통째로 무시된다.
 */
const DICT_PATHS = [
	'/hanja',
	'/sitemap.xml',
	'/sitemap.txt',
	'/robots.txt',
	`/${INDEXNOW_KEY}.txt`
];

export function isDictPath(pathname: string): boolean {
	return DICT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * 어느 사이트로 온 요청인가.
 *
 * 로컬 개발과 테스트(localhost)는 **둘 다 열어 둔다.** 거기까지 갈라 두면
 * 한 번 띄운 서버로 두 사이트를 다 볼 수 없어 확인이 번거로워진다.
 */
export function siteOf(host: string | null): 'game' | 'dict' | 'both' {
	if (!host) return 'both';
	const name = host.split(':')[0].toLowerCase();
	if (name === DICT_HOST) return 'dict';
	if (name === GAME_HOST) return 'game';
	return 'both';
}
