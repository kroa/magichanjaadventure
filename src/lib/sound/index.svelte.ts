/**
 * 사운드 매니저.
 *
 * MVP 에는 **음원 파일을 넣지 않는다.** 대신 구조만 갖춰 두고 무음으로 동작시킨다.
 * (docs/06-ASSETS-LICENSE.md §3 — CC0 출처를 확인한 뒤에만 파일을 추가한다)
 *
 * 그래도 지금 만들어 두는 이유:
 *  - 나중에 파일만 넣으면 되도록 **호출 지점을 미리 흩뿌려 둘 수 있다**
 *  - 브라우저 autoplay 정책상 "첫 사용자 상호작용 이후"에만 재생할 수 있는데,
 *    그 규칙을 나중에 끼워 넣으려면 모든 호출부를 다시 손봐야 한다
 *  - ON/OFF 설정도 나중에 화면만 붙이면 되도록 상태를 여기 둔다
 */

export type SoundName =
	'click' | 'correct' | 'wrong' | 'levelup' | 'reward' | 'battle' | 'victory' | 'discover';

/** 파일이 생기면 여기에 경로를 채운다. 값이 없으면 조용히 무시된다. */
const SOURCES: Partial<Record<SoundName, string>> = {
	// click: '/sound/click.mp3',
	// correct: '/sound/correct.mp3',
	// ...
};

const STORAGE_KEY = 'mha:sound';

class SoundManager {
	enabled = $state(true);

	/** 사용자가 화면을 한 번이라도 건드렸는가 (autoplay 정책) */
	private unlocked = false;
	private cache = new Map<SoundName, HTMLAudioElement>();

	/**
	 * 앱 시작 시 한 번 호출한다.
	 * 첫 상호작용을 기다렸다가 재생을 허용한다 — 그 전에 재생하면 브라우저가 막고 경고를 띄운다.
	 */
	init(): () => void {
		if (typeof window === 'undefined') return () => {};

		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved !== null) this.enabled = saved === 'on';

		const unlock = () => {
			this.unlocked = true;
		};
		window.addEventListener('pointerdown', unlock, { once: true });
		window.addEventListener('keydown', unlock, { once: true });

		return () => {
			window.removeEventListener('pointerdown', unlock);
			window.removeEventListener('keydown', unlock);
		};
	}

	toggle(): void {
		this.enabled = !this.enabled;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, this.enabled ? 'on' : 'off');
		}
	}

	/** 재생. 음원이 없거나 아직 잠겨 있으면 **조용히 무시한다** (에러를 던지지 않는다). */
	play(name: SoundName, volume = 0.6): void {
		if (!this.enabled || !this.unlocked) return;

		const src = SOURCES[name];
		if (!src) return;

		try {
			let audio = this.cache.get(name);
			if (!audio) {
				audio = new Audio(src);
				audio.preload = 'auto';
				this.cache.set(name, audio);
			}
			audio.currentTime = 0;
			audio.volume = volume;
			void audio.play().catch(() => {
				// 재생 실패가 게임을 막으면 안 된다
			});
		} catch {
			// 같은 이유로 삼킨다
		}
	}
}

export const sound = new SoundManager();
