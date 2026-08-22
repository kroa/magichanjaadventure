<script lang="ts">
	import ProgressBar from '$lib/components/common/ProgressBar.svelte';
	import { sound } from '$lib/sound/index.svelte';

	interface Props {
		nickname: string;
		level: number;
		exp: number;
		expToNext: number;
		gems?: number;
		class?: string;
	}

	let { nickname, level, exp, expToNext, gems = 0, class: className = '' }: Props = $props();
</script>

<!-- 게임 HUD. 아이가 "내가 얼마나 컸는지"를 언제나 볼 수 있어야 한다. -->
<header
	class="hud glass flex items-center gap-3 rounded-panel p-3 shadow-card sm:gap-4 sm:p-4 {className}"
	data-testid="top-hud"
>
	<!-- 레벨 뱃지 -->
	<div class="level-badge shrink-0 font-display">
		<span class="lv">Lv</span>
		<span class="num">{level}</span>
	</div>

	<div class="min-w-0 flex-1">
		<div class="mb-1 flex items-baseline justify-between gap-2">
			<p class="truncate font-display text-base text-white sm:text-lg" data-allow-clip>
				{nickname}
			</p>
			<p class="shrink-0 font-display text-xs text-white/70 sm:text-sm">
				{exp} / {expToNext}
			</p>
		</div>
		<ProgressBar
			value={exp}
			max={expToNext}
			tone="gold"
			size="sm"
			label="경험치 {exp} / {expToNext}"
		/>
	</div>

	<!-- 젬 -->
	<div class="gems shrink-0 font-display" aria-label="보석 {gems}개">
		<span aria-hidden="true">💎</span>
		<span>{gems}</span>
	</div>

	<!-- 소리 켜기/끄기 (autoplay 정책상 첫 상호작용 뒤부터 실제로 들린다) -->
	<button
		type="button"
		class="sound-toggle"
		onclick={() => sound.toggle()}
		aria-pressed={sound.enabled}
		aria-label={sound.enabled ? '소리 끄기' : '소리 켜기'}
	>
		{sound.enabled ? '🔊' : '🔇'}
	</button>
</header>

<style>
	.level-badge {
		display: grid;
		place-items: center;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 9999px;
		background: var(--gradient-magic);
		color: #fff;
		box-shadow:
			0 4px 0 var(--color-magic-700),
			var(--shadow-soft);
		line-height: 1;
	}

	.level-badge .lv {
		font-size: 0.6rem;
		opacity: 0.85;
	}

	.level-badge .num {
		font-size: 1.15rem;
	}

	.sound-toggle {
		display: grid;
		place-items: center;
		width: var(--tap-min);
		height: var(--tap-min);
		flex-shrink: 0;
		border: none;
		border-radius: 9999px;
		background: var(--color-magic-50);
		/*
		 * 색을 물려받으면 흰색이 된다. 이모지는 보통 제 색으로 그려지지만
		 * 폰트가 단색 글리프로 떨어지는 환경에서는 연보라 위 흰 글자(1.12:1)가 되어
		 * 버튼이 통째로 사라진다. 대비 검사를 켜자마자 잡힌 자리다.
		 */
		color: var(--color-ink-900);
		font-size: 1.1rem;
		cursor: pointer;
	}

	.gems {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.45rem 0.75rem;
		border-radius: 9999px;
		background: var(--color-sky-100);
		color: var(--color-sky-700);
		font-size: 0.95rem;
	}
</style>
