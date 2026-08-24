<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import Panel from '$lib/components/common/Panel.svelte';
	import { STROKES } from '$lib/game/stroke-data';
	import { GLYPH_EM, GLYPH_SHIFT, resample } from '$lib/game/stroke';

	const entries = Object.entries(STROKES);

	/** 획을 하나씩 보여 줄지, 다 겹쳐 보여 줄지 */
	let step = $state(true);
</script>

<svelte:head>
	<title>획순 확인 · 마법한자탐험대</title>
</svelte:head>

<!--
	획순 좌표를 **눈으로 확인하는 자리.**

	좌표가 글자 모양과 맞는지는 기계가 못 본다. 단위 테스트는 획수·범위·방향 같은
	구조만 잡는다. 통로가 글자에서 벗어나 있으면 아이는 글자 없는 자리를 문지르게 되고,
	그건 없느니만 못하다. 그래서 사람이 볼 수 있게 여기 늘어놓는다.

	글자 위에 통로를 겹쳐 그린다 — 벗어난 획은 바로 눈에 띈다.
-->
<AppShell>
	<div class="flex flex-col gap-4">
		<div>
			<h1 class="on-sky text-display-lg">획순 확인</h1>
			<p class="mt-1 text-sm text-white/85">
				금색 선이 아이가 따라 그을 통로입니다. 글자에서 벗어난 획이 있으면 그 글자는
				<strong>데이터에서 빼야 합니다</strong> — 틀린 통로는 없느니만 못합니다. 지금 {entries.length}자
				/ 새싹 마을 50자.
			</p>
		</div>

		<label class="flex items-center gap-2 text-sm text-white/90">
			<input type="checkbox" bind:checked={step} />
			획마다 번호 보기
		</label>

		<Panel title="새싹 마을" icon="✍️">
			<div class="grid">
				{#each entries as [char, strokes] (char)}
					<figure class="cell">
						<div class="box" style="--glyph-em:{GLYPH_EM}; --glyph-shift:{GLYPH_SHIFT}%">
							<span class="hanja ghost" aria-hidden="true">{char}</span>
							<svg viewBox="0 0 100 100" aria-hidden="true">
								{#each strokes as stroke, i (i)}
									<polyline class="lane" points={stroke.map(([x, y]) => `${x},${y}`).join(' ')} />
									<circle class="from" cx={stroke[0][0]} cy={stroke[0][1]} r="3" />
									{#if step}
										{@const mid = resample(stroke, 3)[1]}
										<text class="num" x={mid[0]} y={mid[1]}>{i + 1}</text>
									{/if}
								{/each}
							</svg>
						</div>
						<figcaption>{char} · {strokes.length}획</figcaption>
					</figure>
				{/each}
			</div>
		</Panel>
	</div>
</AppShell>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
		gap: 0.75rem;
	}

	.cell {
		display: grid;
		justify-items: center;
		gap: 0.25rem;
		margin: 0;
	}

	.box {
		container-type: size;
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		border: 2px dashed var(--color-magic-200, #ddd5ff);
		border-radius: var(--radius-button);
		background: #fff;
	}

	/*
		실제 글자를 흐리게 깔아 통로가 맞는지 대조한다.
		크기와 자리는 배우기 화면(TraceGlyph)과 **같은 상수**를 쓴다 — 여기만 달리 그리면
		여기서 맞아 보여도 아이 화면에서는 어긋난다.
	*/
	.ghost {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: var(--color-ink-900);
		font-size: calc(100cqmin * var(--glyph-em));
		line-height: 1;
		opacity: 0.22;
		translate: 0 var(--glyph-shift);
	}

	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.lane {
		fill: none;
		stroke: var(--color-gold-400);
		stroke-width: 5;
		stroke-linecap: round;
		stroke-linejoin: round;
		opacity: 0.8;
	}

	.from {
		fill: #fff;
		stroke: var(--color-ember-500, #e85252);
		stroke-width: 1.6;
	}

	.num {
		fill: var(--color-magic-800);
		font-size: 8px;
		font-weight: 700;
		text-anchor: middle;
	}

	figcaption {
		color: rgb(255 255 255 / 0.9);
		font-size: 0.8rem;
	}
</style>
