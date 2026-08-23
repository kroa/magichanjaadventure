import { onNavigate } from '$app/navigation';

/**
 * 화면 전환 연출.
 *
 * 지금까지 페이지를 오갈 때 아무 일도 일어나지 않았다. 내용만 툭 바뀌니
 * "같은 앱 안에서 옮겨 갔다" 가 아니라 "화면이 갈아 끼워졌다" 로 보인다.
 *
 * **`location.href` 를 `goto()` 로 바꾸지 않는다.** 이 저장소가 이미 고치고
 * 테스트로 가둔 버그를 되살리기 때문이다 — 대결·배우기·도감은 컴포넌트가
 * 재생성되지 않으면 이전 판의 상태(결과 화면, 이미 배운 표시, 열린 모달)가 살아남는다.
 * 특히 배우기는 `claimed` 가 남아 **다음 한자의 답을 미리 보여 준다.**
 * 전환 연출은 그 문제와 무관하게 View Transitions 만으로 얹는다.
 */
export function enableViewTransitions(): void {
	onNavigate((navigation) => {
		if (typeof document === 'undefined') return;
		if (!document.startViewTransition) return;
		/*
		 * 감속 설정은 **호출 시점에** 읽는다. 모듈 최상단에서 한 번 읽으면
		 * 사용자가 설정을 바꿔도 새로고침 전까지 반영되지 않는다.
		 */
		if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
}
