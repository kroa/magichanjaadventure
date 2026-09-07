<script lang="ts">
	import { jsonLd } from '$lib/dict/jsonld';
	import { DICT_ORIGIN } from '$lib/sites';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const site = DICT_ORIGIN;

	/**
	 * 구조화 데이터.
	 *
	 * 사전 항목의 묶음이므로 `DefinedTermSet` 이 맞다. 검색결과에서 이 페이지가
	 * "용어 목록" 으로 이해되도록 하는 것이 목적이고, 개별 글자는 각 글자 페이지에서
	 * `DefinedTerm` 으로 다시 선언한다.
	 */
	const ld = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'DefinedTermSet',
			name: `한국어문회 ${data.grade} 배정한자`,
			url: `${site}/hanja/급수/${data.grade}`,
			inDefinedTermSet: `${site}/hanja`,
			hasDefinedTerm: data.characters.slice(0, 50).map((c) => ({
				'@type': 'DefinedTerm',
				name: c.character,
				description: `${c.meaning} ${c.reading}`,
				url: `${site}/hanja/${encodeURIComponent(c.character)}`
			}))
		})
	);
</script>

<svelte:head>
	<!--
		제목에 '한자표' 를 쓴다.

		처음에는 '목록' 이었다. 그런데 사람들이 검색창에 치는 말은 `8급 한자표` 다 —
		두 엔진의 자동완성이 급수마다 똑같이 그 말을 제안한다. 뜻이 같은 말이라도
		**찾는 사람의 말**로 적혀 있어야 그 사람에게 닿는다. 실제로 표이기도 하다.
	-->
	<title>{data.grade} 한자표 — 배정한자 {data.characters.length}자 훈·음·총획 | 한자사전</title>
	<meta
		name="description"
		content="한국어문회 {data.grade} 배정한자 {data.characters
			.length}자를 표로 정리했습니다. 훈과 음, 총획을 한눈에 보고, 글자를 누르면 쓰이는 낱말과 획순까지 볼 수 있습니다. 인쇄용 따라쓰기 활동지와 훈·음 맞히기 퀴즈도 함께 있습니다."
	/>
	<link rel="canonical" href="{site}/hanja/급수/{data.grade}" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- jsonLd 가 `<` 를 이스케이프해 태그 조기 종료를 막는다 -->
	{@html ld}
</svelte:head>

<nav class="crumb" aria-label="위치">
	<a href="/hanja">한자사전</a> <span aria-hidden="true">›</span> <span>{data.grade}</span>
</nav>

<header class="head">
	<p class="kicker">한국어문회 배정한자</p>
	<h1>{data.grade} 한자표</h1>
	<p class="count">{data.characters.length}자</p>
	{#if data.info}
		<!--
			`N급 한자 개수` 로 찾아오는 사람이 알고 싶은 것은 **누적 자수**다.
			시험은 상위 급수가 하위를 포함해 나오므로, 신규만 적으면
			7급을 50자로 알고 돌아간다 — 실제로 7급 시험 범위는 150자다.

			공식 자수와 이 사전이 담은 자수가 다를 때는 감추지 않고 나란히 적는다.
		-->
		<dl class="facts">
			<div>
				<dt>{data.grade}에 새로 나오는 글자</dt>
				<dd>{data.info.official}자</dd>
			</div>
			<div>
				<dt>{data.grade} 시험 범위 (8급부터 누적)</dt>
				<dd><strong>{data.info.cumulative}자</strong></dd>
			</div>
			{#if !data.info.complete}
				<div>
					<dt>이 표에 실린 글자</dt>
					<dd>{data.info.ours}자</dd>
				</div>
			{/if}
		</dl>
	{/if}
	<p class="lead">
		훈과 음, 총획을 함께 실었다. 글자를 누르면 쓰이는 낱말과 글자를 이루는 조각을 볼 수 있다.
		{#if data.info && !data.info.complete}
			공식 {data.grade} 배정한자는 {data.info.official}자이고, 그중 {data.info.ours}자를 담았다.
		{/if}
	</p>
</header>

<p class="tools">
	<a href="/hanja/급수/{data.grade}/따라쓰기">따라쓰기 활동지 (인쇄용)</a>
	<a href="/hanja/급수/{data.grade}/퀴즈">훈·음 맞히기 퀴즈</a>
</p>

<table>
	<caption class="sr">{data.grade} 배정한자 목록</caption>
	<thead>
		<tr>
			<th scope="col">한자</th>
			<th scope="col">훈</th>
			<th scope="col">음</th>
			<th scope="col" class="num">총획</th>
		</tr>
	</thead>
	<tbody>
		{#each data.characters as c (c.character)}
			<tr>
				<td class="ch"><a href="/hanja/{c.character}">{c.character}</a></td>
				<td>{c.meaning}</td>
				<td>{c.reading}</td>
				<td class="num">{c.strokeCount}</td>
			</tr>
		{/each}
	</tbody>
</table>

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
		padding-bottom: 2rem;
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
		font-size: clamp(2.5rem, 9vw, 4.5rem);
		font-weight: 500;
		line-height: 1;
	}

	.count {
		margin: 0.4rem 0 0;
		color: var(--accent);
		font-family: var(--ui);
		font-size: 0.8125rem;
		letter-spacing: 0.04em;
	}

	/* 급수의 숫자들 — 신규·누적·실린 자수를 한눈에 */
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 0 2rem;
		margin: 1.25rem 0 0;
	}

	.facts div {
		padding: 0.5rem 0;
	}

	.facts dt {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
	}

	.facts dd {
		margin: 0.1rem 0 0;
		font-size: 1.375rem;
		font-variant-numeric: tabular-nums;
	}

	.facts strong {
		color: var(--accent);
		font-weight: 500;
	}

	.lead {
		max-width: 34rem;
		margin: 1.25rem 0 0;
		color: #3a3a44;
	}

	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 1.5rem 0 0;
	}

	.tools a {
		display: inline-grid;
		place-items: center;
		min-height: 48px;
		padding: 0 1rem;
		border: 1px solid var(--ink);
		color: var(--ink);
		font-family: var(--ui);
		font-size: 0.875rem;
		text-decoration: none;
	}

	.tools a:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	table {
		width: 100%;
		margin-top: 1.25rem;
		border-collapse: collapse;
	}

	caption.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}

	th,
	td {
		padding: 0.3rem 0.6rem 0.3rem 0;
		border-bottom: 1px solid var(--line);
		text-align: left;
	}

	th {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.06em;
	}

	td {
		font-size: 0.95rem;
	}

	/* 손가락이 닿는 자리를 48px 로 — 목록에서 옆 글자를 누르면 짜증이 난다 */
	.ch a {
		display: inline-grid;
		place-items: center;
		min-width: 48px;
		min-height: 48px;
		color: var(--ink);
		font-size: 1.5rem;
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.ch a:hover {
		color: var(--accent);
	}

	.num {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
</style>
