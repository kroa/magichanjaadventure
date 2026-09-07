<script lang="ts">
	import { DICT_ORIGIN } from '$lib/sites';
	import { jsonLd } from '$lib/dict/jsonld';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const url = `${DICT_ORIGIN}/hanja/급수`;
	const last = $derived(data.grades[data.grades.length - 1]);

	const ld = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: '한자 급수표 — 8급부터 4급까지 급수별 배정한자 수',
			url,
			inLanguage: 'ko',
			about: { '@type': 'Thing', name: '전국한자능력검정시험' },
			description: `한국어문회 급수별 배정한자 수를 신규·누적으로 정리했습니다. 8급 50자에서 시작해 4급이면 누적 ${last.cumulative}자입니다.`
		})
	);
</script>

<svelte:head>
	<!--
		`한자 급수`, `한자 급수표`, `한자 급수 종류`, `N급 한자 개수` 로 찾는 사람은
		특정 급수 페이지가 아니라 **체계 전체**를 묻는 것이다. 여기가 그 자리다.
	-->
	<title>한자 급수표 — 8급~4급 급수별 한자 수와 순서 | 한자사전</title>
	<meta
		name="description"
		content="한국어문회 한자 급수를 8급부터 4급까지 정리했습니다. 급수마다 새로 나오는 글자 수와 시험 범위가 되는 누적 자수(8급 50자 → 7급 150자 → 5급 500자 → 4급 {last.cumulative}자)를 한 표로 봅니다."
	/>
	<link rel="canonical" href={url} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- jsonLd 가 `<` 를 이스케이프한다 -->
	{@html ld}
</svelte:head>

<nav class="crumb" aria-label="위치">
	<a href="/hanja">한자사전</a> <span aria-hidden="true">›</span>
	<span>급수</span>
</nav>

<header class="head">
	<p class="kicker">전국한자능력검정시험</p>
	<h1>한자 급수표</h1>
	<p class="lead">
		한자 급수는 <strong>8급이 가장 쉽고 숫자가 작아질수록 어려워진다.</strong> 그리고 상위 급수는
		하위 급수를 포함한다 — 7급 시험에는 7급에 새로 나오는 50자만이 아니라 8급·7급II 를 합친 150자가
		모두 나온다. ‘몇 자를 외워야 하는가’ 를 물을 때 필요한 숫자는 <strong>누적</strong> 쪽이다.
	</p>
</header>

<table>
	<caption class="sr">급수별 배정한자 수</caption>
	<thead>
		<tr>
			<th scope="col">급수</th>
			<th scope="col" class="num">새로 나오는 글자</th>
			<th scope="col" class="num">시험 범위 (누적)</th>
			<th scope="col">보기</th>
		</tr>
	</thead>
	<tbody>
		{#each data.grades as g (g.label)}
			<tr>
				<th scope="row"><a href="/hanja/급수/{g.label}">{g.label}</a></th>
				<td class="num">{g.official}자</td>
				<td class="num"><strong>{g.cumulative}자</strong></td>
				<td class="sample">
					{#each g.sample as ch (ch)}
						<a href="/hanja/{ch}">{ch}</a>
					{/each}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<section>
	<h2>급수를 고르는 법</h2>
	<p class="body">
		처음이라면 <a href="/hanja/급수/8급">8급</a>부터 시작한다. 一·二·三 처럼 획이 적고 뜻이 눈에
		보이는 글자 50자다. 초등학교 저학년이 한 학기에 8급~7급을 마치는 것이 보통이다.
	</p>
	<p class="body">
		급수 사이에 있는 <strong>II 급수</strong>(7급II·6급II·5급II·4급II)는 그 위 급수로 가는 중간
		단계다. 예를 들어 7급II 는 8급 50자에 50자를 더한 100자가 시험 범위다. 한 번에 뛰기 어려울 때
		디딤돌로 쓴다.
	</p>
	<p class="body">
		급수마다 <strong>인쇄용 따라쓰기 활동지</strong>와 <strong>훈·음 맞히기 퀴즈</strong>가 있다.
		급수를 눌러 들어가면 그 급수의 한자표와 함께 있다.
	</p>
</section>

<section>
	<h2>이 표에 대하여</h2>
	<p class="body">
		자수는 사단법인 한국어문회가 배포하는 배정한자 자료를 기준으로 했다. 이 사전은 8급~4급을 다루며,
		급수에 따라 공식 배정한자를 다 담지 못한 곳이 있다 — 그런 급수는 해당 페이지에 실린 자수를 따로
		적어 두었다.
	</p>
</section>

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
		padding-bottom: 1.75rem;
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
		max-width: 38rem;
		margin: 1rem 0 0;
		color: #3a3a44;
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	table {
		width: 100%;
		margin-top: 2rem;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.6rem 0.5rem;
		border-bottom: 1px solid var(--line);
		text-align: left;
	}

	thead th {
		border-bottom: 1px solid var(--ink);
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		font-weight: 400;
	}

	tbody th {
		font-size: 1.125rem;
		font-weight: 500;
	}

	/*
		칸 전체를 누를 수 있게 한다.

		`inline-grid` 로 두었더니 '7급' 은 27px 폭이라 손가락으로 짚기 어려웠다 —
		높이만 48px 이고 폭이 모자라면 소용이 없다.
	*/
	tbody th a {
		display: grid;
		align-items: center;
		min-width: 48px;
		min-height: 48px;
		color: var(--ink);
		text-decoration: none;
	}

	tbody th a:hover {
		color: var(--accent);
	}

	.num {
		font-family: var(--ui);
		font-size: 0.9375rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.num strong {
		color: var(--accent);
		font-weight: 500;
	}

	.sample {
		display: flex;
		flex-wrap: wrap;
		gap: 0.1rem;
	}

	.sample a {
		display: grid;
		place-items: center;
		min-width: 48px;
		min-height: 48px;
		color: var(--ink);
		font-size: 1.25rem;
		text-decoration: none;
	}

	.sample a:hover {
		color: var(--accent);
	}

	@media (max-width: 34rem) {
		/* 좁은 화면에서는 보기 열을 접는다 — 숫자가 먼저다 */
		.sample,
		thead th:last-child {
			display: none;
		}
	}

	section {
		margin-top: 2.75rem;
	}

	h2 {
		margin: 0 0 0.9rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--ink);
		font-size: 1rem;
		font-weight: 500;
	}

	.body {
		max-width: 38rem;
		margin: 0 0 0.75rem;
	}

	.body a {
		color: var(--accent);
	}
</style>
