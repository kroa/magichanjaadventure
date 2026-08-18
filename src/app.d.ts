// See https://svelte.dev/docs/kit/types#app.d.ts

/** 로그인한 사용자 (세션에서 복원된 값). 개인 식별 정보를 담지 않는다. */
export interface SessionUser {
	id: string;
	nickname: string;
	level: number;
	exp: number;
	totalExp: number;
	gems: number;
	characterClass: 'knight' | 'wizard' | null;
}

declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			/** 비로그인 요청이면 null */
			user: SessionUser | null;
			/** 세션 쿠키의 원문 토큰 (hooks 내부 전용) */
			sessionToken: string | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
