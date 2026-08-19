/**
 * 주요 메뉴 한 벌.
 *
 * 모바일(하단 바)과 데스크톱(상단 바)이 **같은 목록**을 써야 한다.
 * 예전에 하단 바만 있고 그것마저 `sm:hidden` 이어서,
 * 데스크톱에서 상점·도감에 들어가면 나갈 방법이 없었다.
 */
export interface NavTab {
	href: string;
	label: string;
	icon: string;
}

export const NAV_TABS: NavTab[] = [
	{ href: '/', label: '모험', icon: '🗺️' },
	{ href: '/learn', label: '배우기', icon: '✨' },
	{ href: '/quiz', label: '퀴즈', icon: '⚔️' },
	{ href: '/collection', label: '도감', icon: '📖' },
	{ href: '/shop', label: '상점', icon: '💎' }
];

/** 현재 경로가 이 탭에 속하는지 */
export function isTabActive(href: string, pathname: string): boolean {
	return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
