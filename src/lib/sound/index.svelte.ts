/**
 * 사운드 매니저 — **Web Audio 합성**.
 *
 * 음원 파일을 쓰지 않고 소리를 직접 만든다. 이유는 아트를 인라인 SVG 로 만든 것과 같다:
 *  - 라이선스 리스크 0 (출처·저작자 표시를 추적할 필요가 없다)
 *  - 다운로드 0 KB (효과음 몇 개 때문에 수백 KB 를 받지 않는다)
 *  - 톤·길이를 코드로 조절할 수 있다
 *
 * 브라우저 autoplay 정책상 **첫 사용자 상호작용 이후에만** 소리를 낼 수 있으므로
 * AudioContext 도 그때 만든다.
 */

export type SoundName =
	'click' | 'correct' | 'wrong' | 'levelup' | 'reward' | 'battle' | 'victory' | 'discover';

const STORAGE_KEY = 'mha:sound';

/** 음이름 → 주파수 (A4 = 440Hz 기준) */
const NOTE: Record<string, number> = {
	C4: 261.63,
	D4: 293.66,
	E4: 329.63,
	F4: 349.23,
	G4: 392.0,
	A4: 440.0,
	B4: 493.88,
	C5: 523.25,
	D5: 587.33,
	E5: 659.25,
	G5: 783.99,
	A5: 880.0,
	C6: 1046.5,
	E6: 1318.51,
	G3: 196.0,
	E3: 164.81
};

interface Tone {
	/** 주파수 (Hz) */
	f: number;
	/** 시작 시각 오프셋 (초) */
	at: number;
	/** 길이 (초) */
	dur: number;
	type?: OscillatorType;
	gain?: number;
	/** 끝 주파수 — 주면 글라이드한다 */
	to?: number;
}

/**
 * 소리 한 줄짜리 악보.
 * 아이가 듣는 소리라 전부 짧고 밝게 잡았다. 오답도 "삑!" 하고 혼내지 않는다.
 */
const SCORES: Record<SoundName, Tone[]> = {
	click: [{ f: NOTE.E5, at: 0, dur: 0.06, gain: 0.18 }],

	// 정답: 위로 올라가는 3음
	correct: [
		{ f: NOTE.C5, at: 0, dur: 0.09 },
		{ f: NOTE.E5, at: 0.07, dur: 0.09 },
		{ f: NOTE.G5, at: 0.14, dur: 0.16 }
	],

	// 오답: 부드럽게 한 번 내려간다 (부저처럼 쏘지 않는다)
	wrong: [{ f: NOTE.E4, at: 0, dur: 0.22, to: NOTE.C4, type: 'triangle', gain: 0.2 }],

	// 새 한자 발견: 반짝이는 느낌의 위쪽 2음
	discover: [
		{ f: NOTE.G5, at: 0, dur: 0.1 },
		{ f: NOTE.C6, at: 0.09, dur: 0.22 }
	],

	// 레벨업: 도-미-솔-도 아르페지오
	levelup: [
		{ f: NOTE.C5, at: 0, dur: 0.12 },
		{ f: NOTE.E5, at: 0.11, dur: 0.12 },
		{ f: NOTE.G5, at: 0.22, dur: 0.12 },
		{ f: NOTE.C6, at: 0.33, dur: 0.34 }
	],

	// 보상 획득
	reward: [
		{ f: NOTE.E5, at: 0, dur: 0.1 },
		{ f: NOTE.A5, at: 0.09, dur: 0.24 }
	],

	// 대결 시작: 낮은 두 음
	battle: [
		{ f: NOTE.E3, at: 0, dur: 0.14, type: 'sawtooth', gain: 0.14 },
		{ f: NOTE.G3, at: 0.13, dur: 0.2, type: 'sawtooth', gain: 0.14 }
	],

	// 승리 팡파르
	victory: [
		{ f: NOTE.C5, at: 0, dur: 0.12 },
		{ f: NOTE.C5, at: 0.12, dur: 0.1 },
		{ f: NOTE.G5, at: 0.24, dur: 0.14 },
		{ f: NOTE.E5, at: 0.4, dur: 0.12 },
		{ f: NOTE.C6, at: 0.52, dur: 0.4 }
	]
};

class SoundManager {
	enabled = $state(true);

	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private unlocked = false;

	/** 앱 시작 시 한 번 호출한다. 첫 상호작용을 기다렸다가 오디오를 켠다. */
	init(): () => void {
		if (typeof window === 'undefined') return () => {};

		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved !== null) this.enabled = saved === 'on';

		const unlock = () => {
			this.unlocked = true;
			// 컨텍스트 생성도 상호작용 시점으로 미룬다 (브라우저 경고 방지)
			void this.context();
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
		if (this.enabled) this.play('click');
	}

	private context(): AudioContext | null {
		if (typeof window === 'undefined') return null;
		if (this.ctx) {
			// 탭 전환 등으로 멈춰 있으면 되살린다
			if (this.ctx.state === 'suspended') void this.ctx.resume();
			return this.ctx;
		}
		try {
			const Ctor =
				window.AudioContext ??
				(window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (!Ctor) return null;
			this.ctx = new Ctor();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.35; // 아이 귀에 크지 않게
			this.master.connect(this.ctx.destination);
			return this.ctx;
		} catch {
			return null;
		}
	}

	/** 재생. 소리를 낼 수 없는 상황이면 **조용히 무시한다** (게임을 막지 않는다). */
	play(name: SoundName): void {
		if (!this.enabled || !this.unlocked) return;

		const ctx = this.context();
		const master = this.master;
		if (!ctx || !master) return;

		const score = SCORES[name];
		if (!score) return;

		const now = ctx.currentTime;
		for (const tone of score) {
			try {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = tone.type ?? 'sine';
				osc.frequency.setValueAtTime(tone.f, now + tone.at);
				if (tone.to) {
					osc.frequency.exponentialRampToValueAtTime(tone.to, now + tone.at + tone.dur);
				}

				// 딸깍 소리를 막으려면 시작과 끝을 부드럽게 감싸야 한다
				const peak = tone.gain ?? 0.22;
				gain.gain.setValueAtTime(0.0001, now + tone.at);
				gain.gain.exponentialRampToValueAtTime(peak, now + tone.at + 0.012);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.at + tone.dur);

				osc.connect(gain);
				gain.connect(master);
				osc.start(now + tone.at);
				osc.stop(now + tone.at + tone.dur + 0.02);
			} catch {
				// 한 음이 실패해도 나머지는 계속 낸다
			}
		}
	}
}

export const sound = new SoundManager();
