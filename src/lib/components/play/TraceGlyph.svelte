<script lang="ts">
	import { untrack } from 'svelte';
	import { PICTOGRAPHS } from '$lib/art/pictographs';
	import { sound } from '$lib/sound/index.svelte';
	import {
		GLYPH_EM,
		GLYPH_SHIFT,
		matchStroke,
		resample,
		strokeLength,
		type Stroke
	} from '$lib/game/stroke';

	interface Props {
		character: string;
		size?: number;
		/**
		 * 지역의 흙 재질. 새싹 마을은 갈색 흙, 시냇가는 모래, 동굴은 돌빛이다.
		 * 이름이 `soil` 이 아닌 이유: 아래 캔버스 그라디언트 지역변수와 `.soil` CSS 클래스가 이미 있다.
		 */
		texture?: { top: string; bottom: string; grit: string };
		/** 지역 대표색 — 칸 테두리에 쓴다 */
		accent?: string;
		/**
		 * 획순 데이터. 있으면 **흙을 아무 데나 문지르는 대신 획을 하나씩 따라 긋는다.**
		 * 없으면 지금까지처럼 파낸다 — 확신이 서는 글자만 데이터가 있다.
		 */
		strokes?: Stroke[] | null;
		/** 다 파내면 한 번 부른다 */
		oncomplete?: () => void;
	}

	let {
		character,
		size = 200,
		texture = { top: '#B08356', bottom: '#8A5A28', grit: '#D9B382' },
		accent = 'var(--color-gold-400)',
		strokes = null,
		oncomplete
	}: Props = $props();

	/** 획순 모드인가 */
	const writing = $derived(!!strokes && strokes.length > 0);

	/** 지금 그어야 할 획 */
	let strokeIndex = $state(0);
	/** 이 획에서 몇 번 빗나갔나 — 도움의 사다리를 올린다 */
	let missCount = $state(0);
	/** 이번 붓질의 궤적 (0..100 좌표) */
	let path: [number, number][] = [];
	/** 유령 손가락이 시범을 보이는 중인가 */
	let demo = $state(false);

	const active = $derived(writing && strokes ? (strokes[strokeIndex] ?? null) : null);

	/*
	 * ── 시범 ────────────────────────────────────────────────────────────────
	 *
	 * **처음 보는 글자를 곧바로 그으라고 하지 않는다.**
	 *
	 * 획순은 아이가 추측해서 알아낼 수 있는 것이 아니다. 통로만 띄워 놓으면
	 * 아이는 "왜 이 순서인지" 를 끝내 모른 채 금색 선만 따라간다 — 그건 따라 그리기지
	 * 획순 배우기가 아니다. 그래서 흙을 걷고 **글자 전체를 한 획씩 써 보인 다음**
	 * 다시 덮고 아이에게 넘긴다. 서예 선생이 먼저 붓을 잡는 순서와 같다.
	 */

	/** 시범을 보이는 중인가 — 이 동안에는 흙이 걷혀 글자가 보인다 */
	let intro = $state(false);
	/** 다시 보기를 누를 때마다 올린다. `{#key}` 가 이걸 보고 애니메이션을 처음부터 돌린다 */
	let introRun = $state(0);
	let introTimer: ReturnType<typeof setTimeout> | null = null;

	/** 획 사이 숨 — 이만큼 쉬어야 "한 획이 끝났다" 가 눈에 보인다 */
	const STROKE_GAP = 150;

	/** 각 획을 언제부터 얼마 동안 그을지. 긴 획은 천천히, 짧은 획은 빠르게 */
	const introPlan = $derived.by(() => {
		if (!strokes) return [];
		let at = 0;
		return strokes.map((stroke, i) => {
			const len = Math.max(strokeLength(stroke), 1);
			const duration = Math.min(900, Math.max(380, len * 11));
			const step = {
				n: i + 1,
				points: stroke.map(([x, y]) => `${x},${y}`).join(' '),
				// dasharray 로 선을 감췄다가 offset 을 0 으로 보내며 그린다
				len,
				duration,
				delay: at,
				from: stroke[0]
			};
			at += duration + STROKE_GAP;
			return step;
		});
	});

	/**
	 * 시범 전체 길이 + 다 쓴 글자를 잠깐 보여 주는 여운.
	 *
	 * 최소 2초는 잡는다 — 一 처럼 획이 하나뿐인 글자는 그냥 두면 눈 깜짝할 새에 끝나
	 * 아이가 "뭐가 지나갔지" 하고 만다. 다 쓴 글자를 보는 시간도 배우는 시간이다.
	 */
	const introMs = $derived(
		Math.max(2000, introPlan.reduce((most, s) => Math.max(most, s.delay + s.duration), 0) + 800)
	);

	function playIntro() {
		if (introTimer) clearTimeout(introTimer);
		introRun += 1;
		intro = true;

		/*
		 * 움직임을 줄여 달라고 한 사람에게는 획이 순서대로 흐르지 않는다 —
		 * 전역 규칙이 애니메이션을 끝 프레임에 앉히기 때문에 글자가 통째로 나타난다.
		 * 그러면 시간을 끌 이유가 없으므로 짧게 보여 주고 넘긴다.
		 */
		const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
		introTimer = setTimeout(() => (intro = false), still ? 1500 : introMs);
	}

	/** 시범을 그만두고 바로 아이 차례로 넘긴다 */
	function skipIntro() {
		if (!intro) return;
		if (introTimer) clearTimeout(introTimer);
		introTimer = null;
		intro = false;
	}

	const picture = $derived(PICTOGRAPHS[character]);

	let canvas = $state<HTMLCanvasElement | null>(null);
	let progress = $state(0);
	let digging = $state(false);
	let finished = $state(false);
	let sparks = $state<{ id: number; x: number; y: number }[]>([]);

	let sparkId = 0;
	let lastSound = 0;
	let lastMeasure = 0;
	/** 직전 붓 위치 — 여기서 현재 점까지 이어 판다 */
	let last: { x: number; y: number } | null = null;

	/*
	 * `willReadFrequently` 를 켠다.
	 *
	 * 진행률을 재려면 `getImageData` 를 반복해서 부르는데, 기본 컨텍스트는 GPU 에 있어서
	 * 부를 때마다 동기 전송이 일어나 프레임이 선다. 이 힌트를 주면 브라우저가
	 * 캔버스를 CPU 쪽에 두어 읽기가 싸진다.
	 */
	function context(el: HTMLCanvasElement): CanvasRenderingContext2D | null {
		return el.getContext('2d', { willReadFrequently: true });
	}

	/**
	 * 이만큼 걷어내면 다 찾은 것으로 본다.
	 *
	 * 처음에 절반(0.52)으로 잡았더니 **너무 오래 문질러야 했다.** 0.26 으로 낮췄는데도
	 * 여전히 오래 걸린다는 말을 들었다 — 진짜 원인은 기준값이 아니라
	 * 붓질 사이가 끊겨 있던 것이었다(아래 dig 주석 참고).
	 *
	 * 이제 궤적이 이어지므로 한 번 가로지르면 29% 가 걷힌다.
	 * 기준을 0.40 으로 **올려** 잡았다 — 낮추면 손이 한 번 스치기만 해도 끝나 버려서
	 * 파냈다는 느낌이 사라진다. 가로 한 번 · 세로 한 번이면 끝난다.
	 */
	const CLEARED = 0.4;
	/** 붓 굵기 — 아이 손가락은 굵다 */
	const BRUSH = 30;

	/*
	 * **발굴**.
	 *
	 * 예전에는 손가락을 굴리면 글자가 위에서부터 차오르기만 했다. 조작은 있었지만
	 * 아이가 하는 일은 "게이지 채우기" 였고, 어디를 문지르든 똑같이 찼다.
	 *
	 * 지금은 흙에 묻힌 글자를 **문지른 자리만** 파낸다. 손이 지나간 곳이 드러나므로
	 * 아이가 자기 손으로 찾아낸 것이 된다. 탐험대라는 이름과도 맞는다.
	 */
	function paintDirt(
		char: string,
		box: number,
		tex: { top: string; bottom: string; grit: string }
	) {
		const el = canvas;
		if (!el) return;
		const ctx = context(el);
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		el.width = box * dpr;
		el.height = box * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		ctx.globalCompositeOperation = 'source-over';
		// 지역마다 다른 땅을 판다 — 같은 흙만 계속 나오면 어디를 가도 같은 곳이다
		const base = ctx.createLinearGradient(0, 0, 0, box);
		base.addColorStop(0, tex.top);
		base.addColorStop(1, tex.bottom);
		ctx.fillStyle = base;
		ctx.fillRect(0, 0, box, box);

		/*
		 * 흙 알갱이.
		 *
		 * 글자를 씨앗으로 삼아 알갱이를 흩는다 — 한자마다 흙 무늬가 조금씩 달라서
		 * 같은 자리를 또 파는 느낌이 덜하다. Math.random 은 쓰지 않는다.
		 * 서버와 화면이 어긋나기 때문이다 (SkyBackground 와 같은 이유다).
		 */
		const grit = char.codePointAt(0) ?? 0;
		ctx.fillStyle = 'rgba(255,255,255,0.14)';
		for (let i = 0; i < 90; i++) {
			const x = ((i * 73 + grit) % 100) * (box / 100);
			const y = ((i * 137 + grit * 7) % 100) * (box / 100);
			ctx.beginPath();
			ctx.arc(x, y, ((i % 3) + 1) * 0.9, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	/** 흙먼지 한 톨 + 사각거리는 소리 */
	function spark(x: number, y: number) {
		sparkId += 1;
		const id = sparkId;
		sparks = [...sparks.slice(-5), { id, x, y }];
		setTimeout(() => (sparks = sparks.filter((s) => s.id !== id)), 420);

		const now = Date.now();
		if (now - lastSound > 140) {
			lastSound = now;
			sound.play('click');
		}
	}

	/** 이 획을 따라 흙을 걷어낸다 (획순 모드에서 통과했을 때) */
	function eraseStroke(stroke: Stroke) {
		const el = canvas;
		if (!el) return;
		const ctx = context(el);
		if (!ctx) return;

		const pts = resample(stroke, 40).map(
			([x, y]) => [(x / 100) * size, (y / 100) * size] as [number, number]
		);
		ctx.globalCompositeOperation = 'destination-out';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.lineWidth = BRUSH * 1.6;
		ctx.beginPath();
		ctx.moveTo(pts[0][0], pts[0][1]);
		for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py);
		ctx.stroke();
	}

	/**
	 * 손을 뗐다. 이 획을 따라갔는지 한 번만 판정한다.
	 *
	 * **어느 획인지 맞히라고 하지 않는다.** 활성 획은 언제나 하나뿐이라
	 * "이 획을 지나갔는가" 만 물으면 되고, 그래서 통로를 손가락 굵기만큼 넉넉히 열 수 있다.
	 */
	function judge() {
		const stroke = active;
		if (!stroke || !strokes) return;

		const result = matchStroke(path, stroke);
		path = [];

		if (!result.passed) {
			missCount += 1;
			// 두 번 빗나가면 유령 손가락이 한 번 그어 보여 준다
			if (missCount === 2) {
				demo = true;
				setTimeout(() => (demo = false), 1400);
			}
			// 네 번이면 그 획을 대신 그어 주고 넘어간다. 막힌 채 앉아 있게 두지 않는다
			if (missCount >= 4) advance(stroke);
			return;
		}
		advance(stroke);
	}

	function advance(stroke: Stroke) {
		eraseStroke(stroke);
		missCount = 0;
		demo = false;
		strokeIndex += 1;
		progress = strokes ? strokeIndex / strokes.length : 0;

		if (strokes && strokeIndex >= strokes.length && !finished) {
			finished = true;
			sound.play('discover');
			oncomplete?.();
		}
	}

	/** 얼마나 걷어냈는지 — 픽셀을 듬성듬성 훑는다 (매번 다 세면 느리다) */
	function measure(ctx: CanvasRenderingContext2D, el: HTMLCanvasElement) {
		const data = ctx.getImageData(0, 0, el.width, el.height).data;
		let clear = 0;
		let total = 0;
		for (let i = 3; i < data.length; i += 4 * 40) {
			total += 1;
			if (data[i] < 40) clear += 1;
		}
		progress = total ? clear / total : 0;
		if (progress >= CLEARED && !finished) {
			finished = true;
			oncomplete?.();
		}
	}

	/**
	 * 손가락이 지나간 **자리를 이어서** 판다.
	 *
	 * 예전에는 `pointermove` 가 올 때마다 원을 하나씩 찍기만 했다. 그래서 빠르게 긁으면
	 * 원들이 **뚝뚝 떨어져** 실제로 지워지는 면적이 눈에 보이는 궤적보다 훨씬 작았다.
	 * 아이는 분명히 여러 번 문질렀는데 흙이 안 걷혔다 — "긁는 게 잘 안 된다" 의 정체가 이것이다.
	 *
	 * 이제 직전 점과 현재 점을 **굵은 선**으로 잇는다. 손가락 속도와 무관하게
	 * 지나간 자리가 전부 걷힌다.
	 */
	function dig(clientX: number, clientY: number, continued: boolean) {
		const el = canvas;
		if (!el || finished) return;
		const ctx = context(el);
		if (!ctx) return;

		const box = el.getBoundingClientRect();
		const x = clientX - box.left;
		const y = clientY - box.top;

		/*
		 * 획순 모드에서는 **아무 데나 문질러도 안 걷힌다.**
		 * 궤적만 모아 두었다가 손을 뗄 때 이 획을 따라갔는지 한 번 판정한다.
		 * 빗나가도 벌은 없다 — 흙먼지만 튀고 흙은 그대로다.
		 */
		if (writing) {
			path.push([(x / size) * 100, (y / size) * 100]);
			spark(x, y);
			return;
		}

		ctx.globalCompositeOperation = 'destination-out';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.lineWidth = BRUSH * 2;

		if (continued && last) {
			ctx.beginPath();
			ctx.moveTo(last.x, last.y);
			ctx.lineTo(x, y);
			ctx.stroke();
		} else {
			ctx.beginPath();
			ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
			ctx.fill();
		}
		last = { x, y };

		spark(x, y);

		/*
		 * 얼마나 걷었는지는 **시간으로** 띄엄띄엄 잰다.
		 *
		 * `getImageData` 는 GPU→CPU 동기 전송이라 부를 때마다 프레임이 선다.
		 * 예전에는 붓질 6번마다 불렀는데, 빠르게 긁으면 그게 곧 초당 여러 번이라
		 * 그때마다 move 이벤트가 유실되고 점 사이가 더 벌어졌다 — 악순환이었다.
		 */
		const at = Date.now();
		if (at - lastMeasure < 120) return;
		lastMeasure = at;
		measure(ctx, el);
	}

	function down(event: PointerEvent) {
		if (finished) return;
		/*
		 * 시범 중에 손을 대면 **무시하지 않고 시범을 접는다.**
		 * 하고 싶어서 손을 댄 아이에게 "지금은 안 돼" 라고 하는 화면은 재미가 없다.
		 */
		skipIntro();
		digging = true;
		last = null;
		path = [];
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dig(event.clientX, event.clientY, false);
	}

	function move(event: PointerEvent) {
		if (!digging) return;
		/*
		 * 브라우저는 여러 개의 포인터 표본을 하나의 move 로 뭉쳐 보낸다.
		 * 뭉친 것을 풀어 전부 훑어야 빠른 손짓에서도 궤적이 끊기지 않는다.
		 */
		const points = event.getCoalescedEvents?.() ?? [];
		if (points.length > 1) {
			for (const p of points) dig(p.clientX, p.clientY, true);
			return;
		}
		dig(event.clientX, event.clientY, true);
	}

	function up() {
		if (digging && writing) judge();
		digging = false;
		last = null;
	}

	$effect(() => {
		// 다른 한자로 넘어가면 흙을 새로 덮는다 — 두 값을 인자로 넘겨야 의존성이 잡힌다
		finished = false;
		progress = 0;
		lastMeasure = 0;
		last = null;
		strokeIndex = 0;
		missCount = 0;
		paintDirt(character, size, texture);

		/*
		 * 새 글자면 시범부터 보인다.
		 * `untrack` 이 필요하다 — playIntro 가 introRun 을 읽고 쓰므로 감싸지 않으면
		 * 이 이펙트가 자기가 바꾼 값을 다시 보고 끝없이 돈다.
		 */
		const teach = writing;
		untrack(() => (teach ? playIntro() : skipIntro()));

		return () => {
			if (introTimer) clearTimeout(introTimer);
		};
	});
</script>

<!--
	한자 발굴 — 흙에 묻힌 글자를 **문질러 파낸다.**

	예전 배우기 화면은 카드에 적힌 뜻·음·획수·설명을 읽고 버튼을 누르는 것이 전부였다.
	그걸 "문지르면 차오르는 게이지" 로 바꿨더니 조작은 생겼지만 여전히 밋밋했다 —
	어디를 문지르든 똑같이 찼기 때문이다.

	지금은 **손이 지나간 자리만** 드러난다. 아이가 자기 손으로 찾아낸 것이 되고,
	그림이 있는 글자는 파낼수록 그림이 옅어지며 글자로 바뀐다.
-->
<div
	class="dig"
	class:done={finished}
	class:intro
	style="--box:{size}px; --accent:{accent}; --grit:{texture.grit}; --glyph-em:{GLYPH_EM}; --glyph-shift:{GLYPH_SHIFT}%"
	data-intro={writing ? (intro ? 'playing' : 'done') : 'none'}
	data-strokes={strokes?.length ?? 0}
>
	{#if picture}
		<svg
			class="picture"
			viewBox="0 0 100 100"
			style="opacity:{intro ? 0 : Math.max(0, 1 - progress / (writing ? 1 : CLEARED))}"
			aria-hidden="true"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- 우리가 직접 쓴 도형이다 -->
			{@html picture.svg}
		</svg>
	{/if}

	<span class="hanja glyph" aria-hidden="true">{character}</span>

	<canvas
		bind:this={canvas}
		class="soil"
		style="width:{size}px; height:{size}px"
		role="button"
		tabindex="0"
		aria-label="{character} 파내기"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onkeydown={(e) => {
			// 키보드로도 끝까지 갈 수 있어야 한다
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				finished = true;
				progress = 1;
				oncomplete?.();
			}
		}}
		data-testid="trace-glyph"
		data-progress={Math.round(progress * 100)}
	></canvas>

	{#if intro}
		<!--
			**시범.** 흙이 걷힌 글자 위로 획이 순서대로 그어지고, 시작점에 번호가 뜬다.
			다 그은 획은 남아 있어서 글자가 완성되는 것이 보인다 — 그게 "획이 모여 글자가 된다" 는 말이다.
		-->
		{#key introRun}
			<svg class="guide" viewBox="0 0 100 100" aria-hidden="true">
				{#each introPlan as step (step.n)}
					<polyline
						class="lane draw"
						points={step.points}
						style="--len:{step.len}; --dur:{step.duration}ms; --at:{step.delay}ms"
					/>
					<circle
						class="seed"
						cx={step.from[0]}
						cy={step.from[1]}
						r="3.4"
						style="--at:{step.delay}ms"
					/>
					<text class="order" x={step.from[0]} y={step.from[1]} style="--at:{step.delay}ms">
						{step.n}
					</text>
				{/each}
			</svg>
		{/key}
		<span class="banner font-display" aria-hidden="true">
			✍️ 이렇게 써요 · {strokes?.length ?? 0}획
		</span>
	{:else if writing && active && !finished}
		<!--
			**지금 그을 획만** 금색으로 보여 준다. 시작점에 점이 뛴다.
			어느 획인지 아이가 고르게 하지 않으므로 순서를 말로 설명할 필요가 없다.
			canvas 를 감싸지 않고 형제로 둔다 — 감싸면 흙 칸의 테두리 검사가 깨진다.
		-->
		<svg class="guide" viewBox="0 0 100 100" aria-hidden="true">
			<polyline class="lane" points={active.map(([x, y]) => `${x},${y}`).join(' ')} class:demo />
			<circle class="from" cx={active[0][0]} cy={active[0][1]} r="4" />
		</svg>
		<span class="count font-display" aria-hidden="true">
			{strokeIndex + 1} / {strokes?.length ?? 0}
		</span>
		<!--
			**다시 보기.** 한 번 보고 못 외우는 게 정상이라 언제든 다시 부를 수 있어야 한다.
			왼쪽 위 모서리에 둔다 — 획순 데이터가 있는 16자 중 이 자리를 지나는 획이 하나도 없다.
			흙 칸(캔버스)과 겹치는 것은 의도다: 여기를 누르면 파는 대신 시범이 돈다.
		-->
		<button
			class="again"
			type="button"
			onclick={playIntro}
			data-testid="stroke-replay"
			data-allow-overlap
		>
			<span aria-hidden="true">↻</span>
			<span class="sr-only">획순 다시 보기</span>
		</button>
	{/if}

	{#each sparks as spark (spark.id)}
		<span class="spark" style="left:{spark.x}px; top:{spark.y}px" aria-hidden="true"></span>
	{/each}

	{#if !finished && !writing}
		<span class="nudge" aria-hidden="true">👆</span>
	{/if}
</div>

<style>
	.dig {
		position: relative;
		width: var(--box);
		height: var(--box);
		border-radius: var(--radius-panel);
		background: rgb(255 255 255 / 0.85);
		box-shadow:
			inset 0 0 0 4px var(--accent, var(--color-gold-400)),
			0 10px 24px rgb(20 12 45 / 0.35);
		overflow: hidden;
	}

	.picture,
	.glyph {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	.picture {
		padding: 12%;
		transition: opacity 0.15s linear;
	}

	/*
		크기와 자리는 **재서 정한 값**이다 (`GLYPH_EM` / `GLYPH_SHIFT` 주석 참고).
		여기 숫자를 직접 적지 않는 이유: 같은 값을 `strokes.e2e.ts` 가 실제 픽셀로 검사하는데,
		두 군데에 적어 두면 한쪽만 고쳐도 검사가 통과해 버린다.

		`transform` 이 아니라 개별 `translate` 를 쓴다 — 다 파냈을 때 도는
		`glyph-pop` 이 transform 을 쓰므로 겹쳐 쓰면 서로를 지운다.

		(줄 상자는 글자보다 커서 위아래로 삐져나가지만 `.dig` 가 overflow:hidden 이라 잘린다 —
		잘리는 것은 빈 여백뿐이고 잉크는 다 들어온다.)
	*/
	.glyph {
		font-size: calc(var(--box) * var(--glyph-em));
		line-height: 1;
		color: var(--color-magic-800);
		translate: 0 var(--glyph-shift);
	}

	/* 지금 그을 획 — 흙 위에 얹힌다 */
	.guide {
		position: absolute;
		inset: 0;
		z-index: 2;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.lane {
		fill: none;
		stroke: var(--color-gold-400);
		stroke-width: 7;
		stroke-linecap: round;
		stroke-linejoin: round;
		opacity: 0.85;
	}

	/*
		시범: 감춰 뒀다가 제 차례에 그어진다.

		`stroke-dasharray` 를 획 길이로 잡고 `dashoffset` 을 길이→0 으로 보내면
		선이 시작점에서 끝점으로 자라난다. `fill-mode: both` 라 제 차례 전에는
		첫 프레임(= 안 보임)에, 지난 뒤에는 끝 프레임(= 다 그어짐)에 머문다 —
		그래서 앞선 획들이 화면에 남아 글자가 쌓인다.
	*/
	.lane.draw {
		stroke-dasharray: var(--len) var(--len);
		stroke-dashoffset: var(--len);
		animation: lane-draw var(--dur) linear var(--at) both;
	}

	@keyframes lane-draw {
		to {
			stroke-dashoffset: 0;
		}
	}

	/* 이 획이 시작하는 자리 */
	.seed {
		fill: var(--color-ember-500, #e85252);
		opacity: 0;
		animation: seed-in 0.28s ease-out var(--at) both;
	}

	@keyframes seed-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 0.95;
		}
	}

	/* 몇 번째 획인지 */
	.order {
		fill: #fff;
		font-size: 5.6px;
		font-weight: 800;
		text-anchor: middle;
		dominant-baseline: central;
		opacity: 0;
		animation: seed-in 0.28s ease-out var(--at) both;
	}

	.banner {
		position: absolute;
		top: 0.45rem;
		left: 50%;
		z-index: 3;
		padding: 0.15rem 0.6rem;
		border-radius: 9999px;
		background: rgb(28 20 58 / 0.78);
		color: #fff;
		font-size: 0.72rem;
		white-space: nowrap;
		translate: -50% 0;
	}

	/* 시범 도중에는 흙을 걷어 글자를 보여 준다 — 안 보이는 글자는 못 배운다 */
	.dig.intro .soil {
		opacity: 0.08;
		pointer-events: auto;
	}

	.soil {
		transition: opacity 0.4s ease;
	}

	/* 획순 다시 보기 */
	.again {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 4;
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border: none;
		background: none;
		color: var(--color-magic-800);
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
	}

	.again span[aria-hidden] {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 9999px;
		background: rgb(255 255 255 / 0.92);
		box-shadow: 0 2px 6px rgb(20 12 45 / 0.3);
	}

	.again:hover span[aria-hidden] {
		background: #fff;
	}

	/* 두 번 빗나가면 유령 손가락처럼 한 번 훑고 지나간다 */
	.lane.demo {
		stroke-dasharray: 4 200;
		animation: lane-demo 1.4s ease-in-out;
	}

	@keyframes lane-demo {
		from {
			stroke-dashoffset: 204;
		}
		to {
			stroke-dashoffset: 0;
		}
	}

	/* 여기서 시작한다 */
	.from {
		fill: #fff;
		stroke: var(--color-gold-700, #b8860b);
		stroke-width: 2;
		animation: from-beat 1.2s ease-in-out infinite;
	}

	@keyframes from-beat {
		0%,
		100% {
			r: 4;
		}
		50% {
			r: 6;
		}
	}

	.count {
		position: absolute;
		right: 0.5rem;
		bottom: 0.4rem;
		z-index: 3;
		padding: 0.1rem 0.5rem;
		border-radius: 9999px;
		background: rgb(28 20 58 / 0.72);
		color: #fff;
		font-size: 0.7rem;
	}

	/* 흙 — 이 위를 문지르면 아래가 드러난다 */
	.soil {
		position: absolute;
		inset: 0;
		cursor: grab;
		/* 파는 동안 화면이 같이 스크롤되면 손가락이 미끄러진다 */
		touch-action: none;
	}

	.soil:active {
		cursor: grabbing;
	}

	/* 다 파내면 흙이 사라지고 글자가 한 번 튄다 */
	.dig.done .soil {
		opacity: 0;
		transition: opacity 0.35s ease;
		pointer-events: none;
	}

	.dig.done .glyph {
		animation: glyph-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes glyph-pop {
		0% {
			transform: scale(1);
		}
		45% {
			transform: scale(1.14);
		}
		100% {
			transform: scale(1);
		}
	}

	/* 튀는 흙먼지 */
	.spark {
		position: absolute;
		width: 8px;
		height: 8px;
		border-radius: 9999px;
		background: var(--grit, #d9b382);
		transform: translate(-50%, -50%);
		pointer-events: none;
		animation: spark-fly 0.42s ease-out forwards;
	}

	@keyframes spark-fly {
		to {
			transform: translate(-50%, -230%) scale(0.2);
			opacity: 0;
		}
	}

	/* 뭘 해야 하는지 모를 때를 위한 손짓 */
	.nudge {
		position: absolute;
		right: 10%;
		bottom: 8%;
		font-size: 1.7rem;
		pointer-events: none;
		animation: nudge-rub 1.6s ease-in-out infinite;
	}

	@keyframes nudge-rub {
		0%,
		100% {
			transform: translate(0, 0) rotate(-10deg);
		}
		50% {
			transform: translate(-26px, -10px) rotate(10deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lane.demo,
		.from,
		.nudge,
		.spark,
		.dig.done .glyph {
			animation: none;
		}
	}
</style>
