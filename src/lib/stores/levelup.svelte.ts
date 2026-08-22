import type { CharacterClass } from '$lib/types/user';
import type { UnlockedAchievementDto } from '$lib/types/api';

export interface LevelUpEvent {
	/** 도달한 레벨 */
	level: number;
	/** 이번에 오른 레벨 수 (2 이상이면 "2단계 상승!") */
	levelsGained: number;
	/** 이 보상을 받기 전 레벨. 전직 여부를 여기서 판정한다 */
	previousLevel: number;
	characterClass: CharacterClass | null;
	gemsGained: number;
	achievements: UnlockedAchievementDto[];
}

/**
 * 레벨업 연출 큐.
 *
 * 어느 화면에서든(학습·퀴즈·대결) 레벨이 오르면 여기에 넣기만 하면 된다.
 * 실제 연출은 AppShell 에 상시 마운트된 LevelUpOverlay 가 담당한다.
 *
 * 화면마다 연출을 따로 붙이지 않는 이유: 레벨업은 **어디서 일어나든 같은 사건**이고,
 * 같은 연출을 세 곳에 복붙하면 셋이 조금씩 달라지기 마련이다.
 */
class LevelUpStore {
	current = $state<LevelUpEvent | null>(null);
	private queue: LevelUpEvent[] = [];

	show(event: LevelUpEvent): void {
		if (this.current) {
			this.queue.push(event);
			return;
		}
		this.current = event;
	}

	/** 연출이 끝났을 때 호출. 대기 중인 다음 레벨업을 이어서 보여 준다. */
	dismiss(): void {
		this.current = this.queue.shift() ?? null;
	}

	clear(): void {
		this.queue = [];
		this.current = null;
	}
}

export const levelUp = new LevelUpStore();
