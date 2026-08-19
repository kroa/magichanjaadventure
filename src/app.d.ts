// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SessionUser } from '$lib/types/user';

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
			/** 세션 쿠키의 원문 토큰 (hooks / 서버 액션 전용) */
			sessionToken: string | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
