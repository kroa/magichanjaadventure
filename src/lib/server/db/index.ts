import { error } from '@sveltejs/kit';

/**
 * D1 접근 헬퍼.
 *
 * 브라우저는 DB 에 직접 접근할 수 없다. 모든 데이터는 서버 라우트를 통과한다.
 * (docs/00-ARCHITECTURE.md §3.1)
 */
export function getDb(platform: App.Platform | undefined): D1Database {
	const db = platform?.env?.DB;
	if (!db) {
		// 로컬에서 `npm run db:migrate` 를 잊었거나, 배포에 바인딩이 빠진 경우다.
		throw error(503, 'D1 데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
	}
	return db;
}

export function newId(): string {
	return crypto.randomUUID();
}

/** 'YYYY-MM-DD' (KST 기준). 연속 접속일 계산에 쓴다. */
export function todayKst(now = Date.now()): string {
	const kst = new Date(now + 9 * 60 * 60 * 1000);
	return kst.toISOString().slice(0, 10);
}
