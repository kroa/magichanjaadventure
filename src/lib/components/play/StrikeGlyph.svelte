<script lang="ts">
	interface Props {
		/** 방금 만든 한자 */
		character: string;
		meaning: string;
		reading: string;
		/** 날아가 부딪힐 대상 */
		target: HTMLElement | null;
		/** 연출이 끝났다 */
		ondone?: () => void;
	}

	let { character, meaning, reading, target, ondone }: Props = $props();

	let el = $state<HTMLElement | null>(null);
	let flying = $state(false);
	let dx = $state(0);
	let dy = $state(0);

	$effect(() => {
		if (!el) return;

		/*
		 * 잠깐 크게 보여 주고(읽을 시간), 그 다음 몬스터에게 날아간다.
		 * **버튼을 누르게 하지 않는다.** 합칠 때마다 카드가 뜨고 "좋아!" 를 눌러야 하면
		 * 한 판에 세 번 흐름이 끊긴다. 게임은 멈추지 않고 이어져야 한다.
		 */
		const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
		const hold = reduce ? 900 : 1100;

		const start = setTimeout(() => {
			if (target && el) {
				const from = el.getBoundingClientRect();
				const to = target.getBoundingClientRect();
				dx = to.left + to.width / 2 - (from.left + from.width / 2);
				dy = to.top + to.height / 2 - (from.top + from.height / 2);
			}
			flying = true;
		}, hold);

		const finish = setTimeout(() => ondone?.(), hold + (reduce ? 60 : 520));

		return () => {
			clearTimeout(start);
			clearTimeout(finish);
		};
	});
</script>

<!--
	만든 글자가 몬스터에게 **날아가 부딪힌다.**

	예전에는 합칠 때마다 카드가 뜨고 "좋아!" 를 눌러야 다음으로 갔다.
	한 판에 세 번 멈추면 그건 게임이 아니라 슬라이드쇼다.
	여기서는 아무것도 누르지 않는다 — 잠깐 크게 보였다가 날아가고, 판은 계속 굴러간다.
-->
<div
	class="strike"
	class:flying
	bind:this={el}
	style="--dx:{dx}px; --dy:{dy}px"
	data-testid="strike-glyph"
	aria-live="polite"
>
	<span class="hanja char">{character}</span>
	<span class="label font-display">{meaning} {reading}</span>
</div>

<style>
	.strike {
		position: absolute;
		z-index: 30;
		top: 50%;
		left: 50%;
		display: grid;
		justify-items: center;
		gap: 0.25rem;
		transform: translate(-50%, -50%);
		pointer-events: none;
		animation: strike-pop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.char {
		font-size: 4.5rem;
		line-height: 1;
		color: var(--color-magic-800);
		text-shadow:
			0 0 18px rgb(255 209 102 / 0.9),
			0 6px 14px rgb(60 40 120 / 0.28);
	}

	.label {
		padding: 0.1rem 0.6rem;
		border-radius: 9999px;
		background: rgb(255 255 255 / 0.92);
		color: var(--color-ink-900);
		font-size: 0.95rem;
		white-space: nowrap;
	}

	/* 몬스터 쪽으로 날아가며 작아진다 */
	.strike.flying {
		transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.35) rotate(14deg);
		opacity: 0;
		transition:
			transform 0.5s cubic-bezier(0.5, -0.2, 0.8, 0.6),
			opacity 0.5s ease-in;
	}

	@keyframes strike-pop {
		0% {
			transform: translate(-50%, -50%) scale(0.2);
			opacity: 0;
		}
		60% {
			transform: translate(-50%, -50%) scale(1.12);
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.strike {
			animation: none;
		}

		.strike.flying {
			transition: opacity 0.05s linear;
		}
	}
</style>
