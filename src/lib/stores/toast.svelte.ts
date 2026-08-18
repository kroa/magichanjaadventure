import type { Tone } from '$lib/types/ui';

export interface Toast {
	id: number;
	message: string;
	tone: Tone;
	icon?: string;
	/** ms. 0 이면 자동으로 닫히지 않는다 */
	duration: number;
}

let nextId = 1;

/**
 * 전역 토스트 상태 (Svelte 5 runes).
 *
 * 별도 상태관리 라이브러리를 쓰지 않는다. runes 로 충분하고 번들이 가볍다.
 */
class ToastStore {
	items = $state<Toast[]>([]);

	show(message: string, options: { tone?: Tone; icon?: string; duration?: number } = {}): number {
		const toast: Toast = {
			id: nextId++,
			message,
			tone: options.tone ?? 'magic',
			icon: options.icon,
			duration: options.duration ?? 3000
		};
		this.items = [...this.items, toast];

		if (toast.duration > 0) {
			setTimeout(() => this.dismiss(toast.id), toast.duration);
		}
		return toast.id;
	}

	/** 정답/보상처럼 기분 좋은 알림 */
	success(message: string, icon = '✨'): number {
		return this.show(message, { tone: 'mint', icon });
	}

	/** 오답/실패. 강한 빨강 대신 부드러운 톤을 쓴다 */
	warn(message: string, icon = '💫'): number {
		return this.show(message, { tone: 'ember', icon });
	}

	/** 보상 획득 */
	reward(message: string, icon = '🎁'): number {
		return this.show(message, { tone: 'gold', icon, duration: 4000 });
	}

	dismiss(id: number): void {
		this.items = this.items.filter((t) => t.id !== id);
	}

	clear(): void {
		this.items = [];
	}
}

export const toasts = new ToastStore();
