<script lang="ts">
	import { strokeLength, type Stroke } from '$lib/game/stroke';

	interface Props {
		character: string;
		strokes: Stroke[];
	}

	let { character, strokes }: Props = $props();

	/**
	 * 획순 보기 — **사전 판.**
	 *
	 * 게임의 `TraceGlyph` 를 쓰지 않는다. 저쪽은 흙을 파고 먼지가 튀는, 아이를 위한 물건이다.
	 * 여기서는 같은 좌표로 조용히, 다만 **잘** 보여 준다.
	 *
	 * ── 밑그림을 글꼴로 깔지 않는다 ──────────────────────────────────
	 * 예전에는 획 아래에 실제 글자(`<span>明</span>`)를 옅게 깔았다. 그러려면 글자를
	 * 통로 좌표계에 맞춰야 하는데(`GLYPH_EM` / `GLYPH_SHIFT`), 그 값은 **Noto Sans KR 기준**이다.
	 * 사전은 명조를 쓰므로 폭과 자리가 어긋난다.
	 * 그래서 **같은 좌표의 폴리라인을 옅게 한 벌 더** 깐다 — 글꼴이 바뀌어도 어긋날 수가 없다.
	 *
	 * ── 획 길이를 정규화한다 ────────────────────────────────────────
	 * `pathLength="100"` 을 주면 실제 길이와 무관하게 dash 를 100 기준으로 다룰 수 있다.
	 * 안 그러면 짧은 점획은 순식간에, 긴 가로획은 느리게 그어져 리듬이 깨진다.
	 */
	const CELL = 100;

	let playing = $state(false);
	let done = $state(false);
	let run = $state(0);

	const plan = $derived(
		strokes.map((s, i) => ({
			n: i + 1,
			points: s.map(([x, y]) => `${x},${y}`).join(' '),
			from: s[0],
			// 긴 획은 조금 더 오래 — 완전히 같은 속도면 기계처럼 보인다
			duration: Math.min(900, Math.max(380, strokeLength(s) * 9)),
			delay: 0
		}))
	);

	const timed = $derived.by(() => {
		let at = 0;
		return plan.map((p) => {
			const item = { ...p, delay: at };
			at += p.duration + 140;
			return item;
		});
	});

	const totalMs = $derived(timed.reduce((m, t) => Math.max(m, t.delay + t.duration), 0));

	let timer: ReturnType<typeof setTimeout> | null = null;

	function play() {
		if (timer) clearTimeout(timer);
		run += 1;
		playing = true;
		done = false;
		timer = setTimeout(() => {
			playing = false;
			done = true;
		}, totalMs + 200);
	}

	function showAll() {
		if (timer) clearTimeout(timer);
		playing = false;
		done = true;
		run += 1;
	}

	$effect(() => {
		// 다른 글자로 넘어가면 처음 상태로. 완성된 모습으로 시작한다 —
		// 빈 칸으로 시작하면 무엇을 볼지 모른다
		if (character) {
			done = true;
			playing = false;
		}
		return () => {
			if (timer) clearTimeout(timer);
		};
	});
</script>

<div class="order">
	<!-- 큰 상자: 순서대로 그어지는 것 -->
	<div class="stage" class:playing class:done>
		<svg viewBox="0 0 {CELL} {CELL}" role="img" aria-label="{character} 획순 {strokes.length}획">
			<g class="grid" aria-hidden="true">
				<line x1="50" y1="6" x2="50" y2="94" />
				<line x1="6" y1="50" x2="94" y2="50" />
			</g>

			<!-- 밑그림: 같은 좌표를 옅게 한 벌 -->
			<g class="ghost" aria-hidden="true">
				{#each plan as p (p.n)}
					<polyline points={p.points} />
				{/each}
			</g>

			{#key run}
				<g class="live">
					{#each timed as t (t.n)}
						<polyline
							class="lane"
							points={t.points}
							pathLength="100"
							style="--dur:{t.duration}ms; --at:{t.delay}ms"
						/>
						<g class="badge" style="--at:{t.delay}ms">
							<circle cx={t.from[0]} cy={t.from[1]} r="5.2" />
							<text x={t.from[0]} y={t.from[1]}>{t.n}</text>
						</g>
					{/each}
				</g>
			{/key}
		</svg>

		<!-- 다 그으면 방금 쓴 글자가 낙관으로 찍힌다 -->
		<span class="seal" aria-hidden="true">{character}</span>
	</div>

	<!-- 옆칸: 정지 화면만으로도 순서를 읽을 수 있게 -->
	<div class="sheet">
		<ol aria-label="획 순서">
			{#each plan as p, i (p.n)}
				<li>
					<svg viewBox="0 0 {CELL} {CELL}" aria-hidden="true">
						<g class="ghost"><polyline points={plan.map((q) => q.points).join(' ')} /></g>
						{#each plan.slice(0, i + 1) as q (q.n)}
							<polyline class="upto" class:tip={q.n === p.n} points={q.points} />
						{/each}
					</svg>
					<span>{p.n}</span>
				</li>
			{/each}
		</ol>
	</div>
</div>

<div class="controls">
	<button type="button" onclick={play} disabled={playing}>순서대로 보기</button>
	<button type="button" onclick={showAll}>전체 보기</button>
	<a class="try" href="/">직접 그어 보기</a>
</div>

<style>
	.order {
		display: grid;
		grid-template-columns: minmax(0, 15rem) minmax(0, 1fr);
		gap: 1.25rem;
		align-items: start;
	}

	@media (max-width: 34rem) {
		.order {
			grid-template-columns: 1fr;
		}
	}

	.stage {
		position: relative;
		aspect-ratio: 1;
		border: 1px solid var(--line);
		background: var(--paper-2);
	}

	.stage svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.grid line {
		stroke: var(--line);
		stroke-dasharray: 2 3;
		stroke-width: 0.5;
	}

	.ghost polyline {
		fill: none;
		stroke: var(--ghost);
		stroke-width: 7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.lane {
		fill: none;
		stroke: var(--ink);
		stroke-width: 7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.badge circle {
		fill: var(--accent);
	}

	.badge text {
		fill: #fff;
		font-family: var(--ui);
		font-size: 6px;
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: central;
	}

	/*
		순서대로 보기 — 획이 **그어지는 것처럼** 보이게.

		`pathLength="100"` 덕분에 길이가 제각각인 획을 같은 규칙으로 다룰 수 있다.
		`fill-mode: both` 라 제 차례 전에는 첫 프레임(안 보임)에, 지난 뒤에는
		끝 프레임(다 그어짐)에 머문다 — 그래서 앞선 획이 화면에 쌓인다.
	*/
	.stage.playing .lane {
		stroke-dasharray: 100 100;
		stroke-dashoffset: 100;
		animation: draw var(--dur) linear var(--at) both;
	}

	.stage.playing .badge {
		opacity: 0;
		animation: pop 0.3s ease-out var(--at) both;
	}

	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes pop {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* 아직 안 눌렀거나 다 끝났으면 그대로 다 보인다 */
	.stage.done .lane,
	.stage.done .badge {
		animation: none;
		opacity: 1;
	}

	/* 낙관 — 다 그으면 찍힌다 */
	.seal {
		position: absolute;
		right: 0.5rem;
		bottom: 0.5rem;
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		border-radius: 2px;
		background: var(--accent);
		color: #fff;
		font-family: var(--serif);
		font-size: 1.15rem;
		opacity: 0;
		scale: 0.8;
		transition:
			opacity 0.35s ease,
			scale 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.stage.done .seal {
		opacity: 1;
		scale: 1;
	}

	/* 옆칸 — 애니메이션을 못 봐도 순서를 읽는다 */
	.sheet ol {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(3.6rem, 1fr));
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.sheet li {
		position: relative;
		border: 1px solid var(--line);
		background: var(--paper-2);
	}

	.sheet svg {
		display: block;
		width: 100%;
		aspect-ratio: 1;
	}

	.sheet .upto {
		fill: none;
		stroke: var(--ink);
		stroke-width: 7;
		stroke-linecap: round;
		stroke-linejoin: round;
		opacity: 0.35;
	}

	.sheet .upto.tip {
		stroke: var(--accent);
		opacity: 1;
	}

	.sheet span {
		position: absolute;
		top: 0.15rem;
		left: 0.3rem;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.65rem;
		font-variant-numeric: tabular-nums;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.9rem;
	}

	button,
	.try {
		display: inline-grid;
		place-items: center;
		min-height: 48px;
		padding: 0 1rem;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-family: var(--ui);
		font-size: 0.875rem;
		letter-spacing: 0.01em;
		text-decoration: none;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}

	button:hover:not(:disabled),
	.try:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	button:disabled {
		color: var(--muted);
		cursor: default;
	}

	.try {
		border-color: var(--ink);
	}

	@media (prefers-reduced-motion: reduce) {
		.stage.playing .lane,
		.stage.playing .badge {
			animation: none;
			stroke-dashoffset: 0;
			opacity: 1;
		}

		.seal {
			transition: none;
		}
	}
</style>
