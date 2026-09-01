<script lang="ts">
	import { DICT_ORIGIN } from '$lib/sites';
	import { jsonLd } from '$lib/dict/jsonld';
	import { roundFor, type QuizQuestion } from '$lib/dict/quiz';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const url = $derived(`${DICT_ORIGIN}/hanja/급수/${data.grade}/퀴즈`);

	/**
	 * 급수 퀴즈.
	 *
	 * 첫 판은 서버가 구운 문제 그대로 쓴다(씨앗 '1'). 하이드레이션이 어긋나지 않아야 하기 때문이다.
	 * "다시 풀기" 를 누르면 그때 비로소 씨앗을 바꾼다 — 그 시점은 이미 브라우저 안이라
	 * 서버가 그린 것과 달라도 문제가 없다.
	 */
	let round = $state(1);
	/** 지금 풀고 있는 판. `null` 이면 아직 갈아 끼우기 전이라 서버가 구운 것을 쓴다 */
	let custom = $state<QuizQuestion[] | null>(null);
	let picked = $state<(number | null)[]>([]);

	const questions = $derived(custom ?? data.questions);

	/*
	 * 다른 급수로 옮기면 **그 급수 문제로 갈아 끼운다.**
	 *
	 * `$state(data.questions)` 는 처음 값만 잡는다. 그래서 8급 퀴즈에서 7급 퀴즈로
	 * 넘어가도(브라우저 안에서 화면만 바뀌는 이동) 8급 문제가 그대로 남아 있었다.
	 * 주소는 7급인데 문제는 8급인 화면이 되므로 푸는 사람은 자기가 틀린 줄 안다.
	 */
	$effect(() => {
		const fresh = data.questions;
		round = 1;
		custom = null;
		picked = fresh.map(() => null);
	});

	const answered = $derived(picked.filter((p) => p !== null).length);
	const correct = $derived(picked.filter((p, i) => p !== null && p === questions[i].answer).length);
	const finished = $derived(answered === questions.length && questions.length > 0);

	function choose(q: number, c: number) {
		if (picked[q] !== null) return; // 한 번 고르면 바꾸지 않는다 — 답을 보고 고치면 연습이 안 된다
		picked[q] = c;
	}

	function again() {
		round += 1;
		const next = roundFor(data.grade, String(round));
		custom = next;
		picked = next.map(() => null);
	}

	const ld = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'Quiz',
			name: `${data.grade} 한자 퀴즈`,
			url,
			educationalLevel: `한국어문회 ${data.grade}`,
			inLanguage: 'ko',
			numberOfQuestions: data.questions.length
		})
	);
</script>

<svelte:head>
	<title>{data.grade} 한자 퀴즈 — 훈·음 맞히기 | 한자사전</title>
	<meta
		name="description"
		content="한국어문회 {data.grade} 배정한자 {data.total}자로 만든 훈·음 맞히기 퀴즈입니다. 가입 없이 바로 풀 수 있고 문제는 풀 때마다 새로 나옵니다."
	/>
	<link rel="canonical" href={url} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- jsonLd 가 `<` 를 이스케이프한다 -->
	{@html ld}
</svelte:head>

<nav class="crumb" aria-label="위치">
	<a href="/hanja">한자사전</a> <span aria-hidden="true">›</span>
	<a href="/hanja/급수/{data.grade}">{data.grade}</a> <span aria-hidden="true">›</span>
	<span>퀴즈</span>
</nav>

<header class="head">
	<p class="kicker">훈·음 맞히기</p>
	<h1>{data.grade} 한자 퀴즈</h1>
	<p class="lead">
		한국어문회 {data.grade} 배정한자 {data.total}자에서 {questions.length}문제를 냅니다. 가입할 필요
		없고, ‘다시 풀기’를 누르면 새 문제가 나옵니다.
	</p>
</header>

<p class="score" aria-live="polite">
	{#if finished}
		<strong>{questions.length}문제 중 {correct}문제 맞혔습니다.</strong>
	{:else}
		{answered} / {questions.length} 푸는 중
	{/if}
</p>

<ol class="quiz">
	{#each questions as q, i (`${round}-${i}`)}
		<li>
			<div class="ask">
				<span class="no">{i + 1}</span>
				<b class="ch">{q.character}</b>
			</div>
			<div class="choices">
				{#each q.choices as c, k (c)}
					<button
						type="button"
						class:right={picked[i] !== null && k === q.answer}
						class:wrong={picked[i] === k && k !== q.answer}
						disabled={picked[i] !== null}
						onclick={() => choose(i, k)}
					>
						{c}
					</button>
				{/each}
			</div>
			{#if picked[i] !== null}
				<p class="after">
					정답 <b>{q.choices[q.answer]}</b> ·
					<a href="/hanja/{q.character}">{q.character} 자세히 보기</a>
				</p>
			{/if}
		</li>
	{/each}
</ol>

<p class="again">
	<button type="button" onclick={again}>다시 풀기</button>
	<a href="/hanja/급수/{data.grade}">{data.grade} 글자 목록</a>
	<a href="/hanja/급수/{data.grade}/따라쓰기">따라쓰기 활동지</a>
</p>

<style>
	.crumb {
		margin-bottom: 2.5rem;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
	}

	.crumb a {
		color: var(--muted);
		text-decoration: none;
	}

	.crumb a:hover {
		color: var(--accent);
	}

	.head {
		padding-bottom: 1.5rem;
		border-bottom: 2px solid var(--ink);
	}

	.kicker {
		margin: 0 0 0.3rem;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		letter-spacing: 0.06em;
	}

	h1 {
		margin: 0;
		font-size: clamp(1.75rem, 6vw, 2.75rem);
		font-weight: 500;
		line-height: 1.1;
	}

	.lead {
		max-width: 36rem;
		margin: 1rem 0 0;
		color: #3a3a44;
	}

	.score {
		margin: 1.25rem 0 0;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.875rem;
	}

	.score strong {
		color: var(--accent);
	}

	.quiz {
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
	}

	.quiz li {
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--line);
	}

	.ask {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.no {
		color: var(--accent);
		font-family: var(--ui);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
	}

	.ch {
		font-size: 3rem;
		font-weight: 500;
		line-height: 1;
	}

	.choices {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: 0.4rem;
		max-width: 40rem;
	}

	.choices button {
		min-height: 48px;
		padding: 0 0.9rem;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.95rem;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.choices button:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}

	.choices button:disabled {
		cursor: default;
	}

	/* 정답은 굵은 테두리로, 오답은 흐리게 — 색맹인 사람도 구분되게 형태를 함께 쓴다 */
	.choices button.right {
		border-color: var(--ink);
		border-width: 2px;
		font-weight: 700;
	}

	.choices button.wrong {
		border-style: dashed;
		color: var(--muted);
		text-decoration: line-through;
	}

	.after {
		margin: 0.6rem 0 0;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
	}

	.after b {
		color: var(--ink);
	}

	.after a {
		color: var(--accent);
	}

	.again {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 1.75rem 0 0;
	}

	.again button,
	.again a {
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
		text-decoration: none;
		cursor: pointer;
	}

	.again button {
		border-color: var(--ink);
	}

	.again button:hover,
	.again a:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	@media (prefers-reduced-motion: reduce) {
		.choices button {
			transition: none;
		}
	}
</style>
