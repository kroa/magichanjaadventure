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

/*
 * 여섯 칸이 한계다 (390px 화면에서 한 칸 65px).
 * 그래서 **복습은 여기 두지 않는다** — 지도에서 섬을 고르면 나오는 차림표에 있다.
 * 대결은 반대로 반드시 여기 있어야 한다: 지도를 눌러야만 갈 수 있으면 못 찾는다.
 */
export const NAV_TABS: NavTab[] = [
	{ href: '/', label: '모험', icon: '🗺️' },
	{ href: '/learn', label: '배우기', icon: '✨' },
	{ href: '/fusion', label: '합체', icon: '🧪' },
	{ href: '/battle', label: '대결', icon: '⚔️' },
	{ href: '/collection', label: '도감', icon: '📖' },
	{ href: '/shop', label: '상점', icon: '💎' }
];

/** 현재 경로가 이 탭에 속하는지 */
export function isTabActive(href: string, pathname: string): boolean {
	return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
