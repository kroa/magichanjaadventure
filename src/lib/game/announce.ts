import { levelUp } from '$lib/stores/levelup.svelte';
import { toasts } from '$lib/stores/toast.svelte';
import type { RewardDto } from '$lib/types/api';
import type { CharacterClass } from '$lib/types/user';

/**
 * 서버가 확정한 보상을 화면에 알린다.
 *
 * 세 화면(학습·퀴즈·대결)이 같은 규칙을 쓰도록 한 곳에 모았다.
 * 규칙을 화면마다 복붙하면 셋이 조금씩 달라지고, 어떤 화면에서만 업적이 두 번 뜨는 식의
 * 버그가 생긴다.
 *
 * 규칙
 *  - 레벨업이 있으면 **전용 연출**로 띄우고, 업적도 그 안에서 함께 보여 준다
 *  - 레벨업이 없으면 업적만 토스트로 알린다
 *  → 어느 쪽이든 업적이 두 번 표시되지 않는다
 */
export function announceReward(
	reward: RewardDto | null | undefined,
	characterClass: CharacterClass | null
): void {
	if (!reward) return;

	if (reward.levelsGained > 0) {
		levelUp.show({
			level: reward.level,
			levelsGained: reward.levelsGained,
			/*
			 * 서버가 준 값을 그대로 쓴다. `level - levelsGained` 로 역산하면
			 * 업적 보상까지 겹쳐 두 번에 나눠 오른 경우에 어긋난다.
			 */
			previousLevel: reward.previousLevel ?? reward.level - reward.levelsGained,
			characterClass,
			gemsGained: reward.gemsGained,
			achievements: reward.unlockedAchievements
		});
		return;
	}

	for (const achievement of reward.unlockedAchievements) {
		toasts.reward(`${achievement.icon} 업적 — ${achievement.title}`);
	}
}
