import type { CharacterClass } from '$lib/types/user';

export interface PurchaseEvent {
	/** 무엇을 샀는가 */
	title: string;
	/** 캐릭터를 샀으면 그 캐릭터 (장비면 null) */
	characterClass: CharacterClass | null;
	/** 장비를 샀으면 아이콘 */
	icon: string | null;
	/** 산 뒤 남은 보석 */
	gems: number;
	/** 사기 전 보석 — 카운트다운의 시작점 */
	gemsBefore: number;
}

/**
 * 구매 연출 큐.
 *
 * 레벨업과 같은 구조를 쓴다. 어느 화면에서 사든 같은 사건이고,
 * 연출을 화면마다 복붙하면 셋이 조금씩 달라지기 마련이다.
 */
class PurchaseStore {
	current = $state<PurchaseEvent | null>(null);
	private queue: PurchaseEvent[] = [];

	show(event: PurchaseEvent): void {
		if (this.current) {
			this.queue.push(event);
			return;
		}
		this.current = event;
	}

	dismiss(): void {
		this.current = this.queue.shift() ?? null;
	}

	clear(): void {
		this.queue = [];
		this.current = null;
	}
}

export const purchase = new PurchaseStore();
