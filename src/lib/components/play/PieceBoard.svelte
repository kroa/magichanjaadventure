<script lang="ts">
	import PictoGlyph from './PictoGlyph.svelte';
	import { findJoinablePair, fuse, type FusionRecipe } from '$lib/game/fusion';
	import { fadeStage } from '$lib/art/pictographs';
	import { draggable } from '$lib/actions/draggable';
	import { mergeInto } from '$lib/anim/merge';
	import { sound } from '$lib/sound/index.svelte';

	export interface Piece {
		/** 이 조각의 고유 번호 (같은 글자가 여러 개 있을 수 있다) */
		id: number;
		character: string;
		mastery: number;
	}

	interface Props {
		pieces: Piece[];
		/** 두 조각이 붙었다. 서버 확인은 바깥에서 한다 */
		onmerge: (recipe: FusionRecipe, used: Piece[]) => Promise<boolean> | boolean;
		/** 판이 비었다 */
		oncleared?: () => void;
		/**
		 * 도움 요청. 값이 바뀔 때마다 판이 **스스로** 붙는 짝을 찾아 빛낸다.
		 *
		 * 바깥에서 조각 id 를 계산해 넘기던 방식은, 앞 판의 합체가 늦게 끝나면
		 * 방금 켠 힌트를 지워 버리는 경합이 났다. 짝을 아는 쪽이 직접 켜는 것이 맞다.
		 */
		hintTick?: number;
		height?: number;
	}

	let { pieces = $bindable(), onmerge, oncleared, hintTick = 0, height = 260 }: Props = $props();

	let hinted = $state<number[]>([]);

	$effect(() => {
		if (hintTick <= 0) return;
		const pair = findJoinablePair(pieces);
		hinted = pair ? [pair[0].id, pair[1].id] : [];
	});

	let picked = $state<number | null>(null);
	let busy = $state(false);
	let shakeId = $state<number | null>(null);
	const els = new Map<number, HTMLElement>();

	/*
	 * 조각을 놓는 자리.
	 *
	 * **겹치면 안 된다.** 처음에는 자유롭게 흩어 놓았는데, 둥근 토큰이 서로 덮으면
	 * 밑에 깔린 조각을 손가락으로 집을 수가 없다 (Playwright 도 클릭을 거부했다).
	 * 그래서 자리는 벌려 두고, 대신 기울기를 제각각 주어 "줄 세운 보기" 로 보이지 않게 한다.
	 *
	 * 고정 좌표를 쓰는 이유는 SkyBackground 와 같다 — Math.random 은 서버와 화면이 어긋난다.
	 */
	const SPOTS = [
		{ x: 15, y: 27, tilt: -9 },
		{ x: 38, y: 21, tilt: 7 },
		{ x: 62, y: 28, tilt: -5 },
		{ x: 85, y: 22, tilt: 10 },
		{ x: 15, y: 73, tilt: 6 },
		{ x: 38, y: 79, tilt: -11 },
		{ x: 62, y: 72, tilt: 8 },
		{ x: 85, y: 78, tilt: -6 }
	];

	function spotOf(index: number) {
		return SPOTS[index % SPOTS.length];
	}

	/** 두 조각을 붙여 본다 */
	async function tryJoin(a: Piece, b: Piece) {
		if (busy || a.id === b.id) return;

		const recipe = fuse([a.character, b.character]);
		if (!recipe) {
			/*
			 * 안 붙는 조합이다. **아무 말도 하지 않는다.**
			 * 살짝 튕겨 나올 뿐이라 아이는 마음 놓고 아무거나 붙여 본다.
			 */
			shakeId = a.id;
			sound.play('click');
			setTimeout(() => (shakeId = null), 340);
			return;
		}

		busy = true;
		hinted = [];
		try {
			const target = els.get(b.id);
			const source = els.get(a.id);
			if (target && source) await mergeInto([source], target);

			const accepted = await onmerge(recipe, [a, b]);
			if (!accepted) {
				shakeId = a.id;
				setTimeout(() => (shakeId = null), 340);
				return;
			}

			sound.play('discover');
			pieces = pieces.filter((p) => p.id !== a.id && p.id !== b.id);
			picked = null;
			if (pieces.length === 0) oncleared?.();
		} finally {
			busy = false;
		}
	}

	/** 탭으로도 붙일 수 있어야 한다 — 끌기가 서툰 아이와 키보드 사용자를 위해서다 */
	function tap(piece: Piece) {
		if (busy) return;
		if (picked === null) {
			picked = piece.id;
			sound.play('click');
			return;
		}
		if (picked === piece.id) {
			picked = null;
			return;
		}
		const first = pieces.find((p) => p.id === picked);
		picked = null;
		if (first) void tryJoin(first, piece);
	}

	function dropped(fromId: number, target: Element) {
		const toId = Number((target as HTMLElement).dataset.pieceId);
		const a = pieces.find((p) => p.id === fromId);
		const b = pieces.find((p) => p.id === toId);
		if (a && b) void tryJoin(a, b);
	}
</script>

<!--
	조각 판 — **보기 목록이 아니라 작업대.**

	예전 화면은 위에 정답을 인쇄해 두고 아래 격자에서 두 개를 고르게 했다.
	그림으로 바꿔도 구조가 객관식이면 아이는 문제를 푸는 것이지 노는 것이 아니다.

	여기서는 목표를 보여 주지 않는다. 조각들이 판에 널브러져 있고, 아이는 아무거나 밀어서 붙여 본다.
	붙는 것끼리 붙으면 사라지고, **판을 비우는 것이 목표다.**
	DragonBox 가 "상자를 한쪽에 혼자 남겨라" 라는 구조적 목표를 주는 것과 같은 자리다.

	조각은 둥근 토큰이다. 네모 타일을 격자에 놓으면 그건 버튼이고, 둥근 것이 흩어져 있으면 물건이다.

	`data-allow-overlap` 을 다는 이유: 판 위에 널브러진 물건은 **겹치는 것이 정상**이다.
	레이아웃 검사는 "버튼끼리 겹치면 오터치" 를 잡으려는 규칙인데, 여기서는 그게 의도다.
-->
<div class="board" style="--h:{height}px" data-testid="piece-board">
	{#each pieces as piece, i (piece.id)}
		{@const spot = spotOf(i)}
		<button
			type="button"
			class="piece"
			class:picked={picked === piece.id}
			class:shake={shakeId === piece.id}
			style="--x:{spot.x}%; --y:{spot.y}%; --tilt:{spot.tilt}deg;"
			data-piece-id={piece.id}
			data-hint={hinted.includes(piece.id) || undefined}
			data-piece={piece.character}
			data-allow-overlap
			bind:this={
				() => els.get(piece.id) ?? null, (el) => (el ? els.set(piece.id, el) : els.delete(piece.id))
			}
			onclick={() => tap(piece)}
			use:draggable={{
				dropSelector: '.piece',
				value: String(piece.id),
				disabled: busy,
				onLift: () => sound.play('click'),
				onDrop: (value, target) => dropped(Number(value), target)
			}}
			aria-label="{piece.character} 조각"
		>
			<PictoGlyph character={piece.character} stage={fadeStage(piece.mastery)} size={54} />
		</button>
	{/each}
</div>

<style>
	.board {
		position: relative;
		width: 100%;
		height: var(--h);
		border-radius: var(--radius-panel);
		background:
			radial-gradient(circle at 30% 25%, rgb(255 255 255 / 0.55), transparent 55%),
			linear-gradient(180deg, #eef4ff 0%, #f6ecff 100%);
		box-shadow: var(--shadow-card);
		overflow: hidden;
		/* 조각을 끄는 동안 화면이 같이 스크롤되면 손가락에서 미끄러진다 */
		touch-action: none;
	}

	.piece {
		position: absolute;
		left: var(--x);
		top: var(--y);
		display: grid;
		/* 아이 손가락 기준 하한선보다 넉넉하게 */
		width: 4.75rem;
		height: 4.75rem;
		place-items: center;
		transform: translate(-50%, -50%) rotate(var(--tilt));
		border: 3px solid var(--color-magic-200);
		/* 둥근 토큰. 네모 격자와 달리 "물건" 으로 읽힌다 */
		border-radius: 9999px;
		background: #fff;
		box-shadow:
			0 5px 0 var(--color-magic-200),
			0 8px 16px rgb(60 40 120 / 0.16);
		cursor: grab;
		transition:
			box-shadow 0.15s ease,
			border-color 0.15s ease;
	}

	.piece:hover:not(:disabled) {
		border-color: var(--color-magic-400);
	}

	/* 탭으로 고른 조각 */
	.piece.picked {
		border-color: var(--color-gold-400);
		box-shadow:
			0 0 0 4px rgb(255 209 102 / 0.45),
			0 5px 0 var(--color-gold-400);
	}

	/*
	 * 도움을 눌렀을 때 빛나는 짝.
	 * 클래스가 아니라 속성으로 표시한다 — 스타일 이름이 다른 곳과 겹칠 여지를 없앤다.
	 */
	:global(.piece[data-hint]) {
		border-color: var(--color-gold-400);
		box-shadow:
			0 0 0 6px rgb(255 209 102 / 0.5),
			0 5px 0 var(--color-gold-400);
	}

	/* 끌어온 조각이 이 조각 위에 있을 때 */
	:global(.piece[data-drop-hover]) {
		border-color: var(--color-gold-400);
		box-shadow: 0 0 0 5px rgb(255 209 102 / 0.5);
	}

	:global(.piece[data-dragging]) {
		cursor: grabbing;
		transition: none;
		filter: drop-shadow(0 10px 16px rgb(60 40 120 / 0.35));
	}

	/* 안 붙는 조합. 짧게 튕기고 끝 — 실패를 오래 붙들지 않는다 */
	.piece.shake {
		animation: piece-bounce 0.34s ease;
	}

	@keyframes piece-bounce {
		0%,
		100% {
			transform: translate(-50%, -50%) rotate(var(--tilt));
		}
		30% {
			transform: translate(-64%, -54%) rotate(calc(var(--tilt) - 10deg));
		}
		65% {
			transform: translate(-38%, -47%) rotate(calc(var(--tilt) + 8deg));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.piece.shake {
			animation: none;
		}
	}
</style>
