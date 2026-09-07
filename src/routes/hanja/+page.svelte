<script lang="ts">
	import { DICT_ORIGIN } from '$lib/sites';
	import { ABOVE_GRADES, GRADES, ALL, IN_GRADE_TABLE } from '$lib/dict';
	import { ALL_WORDS, wordsByInitial } from '$lib/dict/words';
	import { jsonLd } from '$lib/dict/jsonld';

	const total = ALL.length;
	/*
	 * 1,000자를 전부 "8급~4급 배정한자" 라고 적어 왔는데 **사실이 아니었다.**
	 * 공식 배정급수를 대 보니 28자는 3급II·3급·2급이다. 숫자를 갈라 적는다 —
	 * 급수를 보고 들어오는 사람에게 이 한 줄이 틀리면 나머지를 믿을 이유가 없다.
	 */
	const inTable = IN_GRADE_TABLE;
	const aboveTotal = ABOVE_GRADES.reduce((n, g) => n + g.entries.length, 0);
	const wordTotal = ALL_WORDS.length;
	/* 목차에서는 첫소리만 보여 준다 — 815개를 여기에 다 늘어놓을 자리가 아니다 */
	const initials = wordsByInitial();
	const withStrokes = 99;

	/*
	 * 목차에만 구조화 데이터가 빠져 있었다.
	 *
	 * 1,844장을 전수로 훑다가 잡았다 — 나머지 1,843장에는 다 있는데 **문 앞만** 없었다.
	 * 목차는 크롤러가 가장 먼저 닿는 곳이고, 여기서 "이 사이트가 무엇인가" 가 잡히지
	 * 않으면 아래 1,843장을 무엇으로 이해할지 단서가 없다.
	 *
	 * 급수를 `ItemList` 로 실어 목차가 어디로 갈라지는지도 함께 알린다.
	 */
	const ld = jsonLd({
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: '한자사전',
		url: `${DICT_ORIGIN}/hanja`,
		inLanguage: 'ko',
		description: `한국어문회 8급~4급 배정한자 ${inTable}자와 그 위 급수 ${aboveTotal}자, 두 글자 한자어 ${wordTotal}개의 훈·음·총획·뜻풀이`,
		about: { '@type': 'Thing', name: '한자', alternateName: '漢字' },
		mainEntity: {
			'@type': 'ItemList',
			name: '급수별 배정한자',
			numberOfItems: GRADES.length,
			itemListElement: GRADES.map((g, i) => ({
				'@type': 'ListItem',
				position: i + 1,
				name: `${g.label} 배정한자 ${g.count}자`,
				url: `${DICT_ORIGIN}/hanja/급수/${g.label}`
			}))
		}
	});
</script>

<svelte:head>
	<title>한자사전 — 8급~4급 배정한자 {inTable}자 훈·음·획수</title>
	<meta
		name="description"
		content="한국어문회 8급부터 4급까지 배정한자 {inTable}자의 훈과 음, 총획, 쓰이는 낱말을 급수별 한자표로 정리했습니다. 글자를 이루는 조각과 획순, 두 글자 한자어 {wordTotal}개의 풀이도 함께 볼 수 있습니다."
	/>
	<link rel="canonical" href="{DICT_ORIGIN}/hanja" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- jsonLd 가 `<` 를 이스케이프한다 -->
	{@html ld}
</svelte:head>

<header class="head">
	<p class="kicker">한국어문회 배정한자 8급~4급</p>
	<h1>한자사전</h1>
	<p class="lead">
		한자 {total.toLocaleString()}자의 훈·음·총획과 쓰이는 낱말을 정리했다. 그중 {inTable}자가
		8급~4급 배정한자이고, {aboveTotal}자는 그보다 위 급수다. 글자를 이루는 조각(日 + 月 = 明)과
		획순({withStrokes}자), 두 글자 한자어 {wordTotal}개의 풀이도 함께 볼 수 있다.
	</p>
</header>

<section>
	<h2><i>01</i> 급수별로 보기</h2>
	<ul class="grades">
		{#each GRADES as g (g.label)}
			<li>
				<a href="/hanja/급수/{g.label}">
					<span class="label">{g.label}</span>
					<span class="count">{g.count}자</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

<section>
	<h2><i>02</i> 한자어 낱말 {wordTotal}개</h2>
	<p class="body">
		한자 하나만 알아서는 글이 읽히지 않는다. 두 글자가 만나 비로소 우리가 쓰는 말이 된다. 낱말마다
		읽는 소리와 뜻, 그 낱말을 이루는 두 글자의 훈·음과 급수를 붙였다.
	</p>
	<p class="chips">
		{#each initials as g (g.initial)}
			<a href="/hanja/낱말#{g.initial}">{g.initial}<span>{g.words.length}</span></a>
		{/each}
	</p>
	<p class="body">
		<a class="go" href="/hanja/낱말">낱말 전체 보기</a>
	</p>
</section>

<section>
	<h2><i>03</i> 따라쓰기 활동지</h2>
	<p class="body">
		급수마다 인쇄용 따라쓰기 활동지가 있다. 옅은 글자를 따라 쓴 다음 빈 칸에 혼자 써 보는 형식이고,
		브라우저에서 인쇄하거나 PDF 로 저장할 수 있다.
	</p>
	<ul class="grades">
		{#each GRADES as g (g.label)}
			<li>
				<a href="/hanja/급수/{g.label}/따라쓰기">
					<span class="label">{g.label}</span>
					<span class="count">활동지</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

<section>
	<h2><i>04</i> 훈·음 맞히기 퀴즈</h2>
	<p class="body">
		급수마다 한자를 보고 훈과 음을 고르는 퀴즈가 있다. 가입할 필요가 없고, 다시 풀 때마다 문제가
		새로 나온다.
	</p>
	<ul class="grades">
		{#each GRADES as g (g.label)}
			<li>
				<a href="/hanja/급수/{g.label}/퀴즈">
					<span class="label">{g.label}</span>
					<span class="count">퀴즈</span>
				</a>
			</li>
		{/each}
	</ul>
</section>

{#if aboveTotal}
	<!--
		급수표에 못 싣는 글자들을 **감추지 않는다.**

		이 사전은 8급~4급을 다루는데 그보다 위 급수 글자가 {aboveTotal}자 섞여 있다.
		급수표에 끼워 넣으면 3급II 배정한자 500자 중 22자만 담고서 `3급II 한자표` 라고
		말하는 셈이라 거짓이 되고, 빼 버리면 그 글자 페이지가 어디에서도 닿지 않는 섬이 된다.
		따로 모아 그대로 밝히는 것이 둘 다 피하는 유일한 길이다.
	-->
	<section>
		<h2><i>05</i> 4급보다 위 급수 {aboveTotal}자</h2>
		<p class="body">
			이 사전이 다루는 범위는 8급~4급이다. 다만 아래 {aboveTotal}자는 공식 배정급수가 그보다 위라
			급수표에 싣지 않았다. 그 급수의 배정한자를 다 담고 있지 않으므로 ‘한자표’ 라고 부를 수 없기
			때문이다. 글자마다 제 급수는 정확히 적혀 있다.
		</p>
		{#each ABOVE_GRADES as g (g.label)}
			<p class="above">
				<b>{g.label}</b>
				<span>
					{#each g.entries as e (e.character)}
						<a href="/hanja/{e.character}" title="{e.meaning} {e.reading}">{e.character}</a>
					{/each}
				</span>
			</p>
		{/each}
	</section>
{/if}

<section>
	<h2><i>06</i> 이 자료에 대하여</h2>
	<p class="body">
		급수는 사단법인 한국어문회가 배포하는 배정한자 자료를 그대로 따랐다. 8급이 가장 쉽고 급수가
		올라갈수록 어려워지며, 상위 급수는 하위 급수를 포함한다. 각 글자 페이지에는 훈과 음, 총획, 해당
		급수, 쓰이는 낱말, 그리고 그 글자를 이루는 조각을 실었다.
	</p>
	<p class="body">설명 문장은 직접 작성한 것이며 사전이나 교재의 문장을 옮기지 않았다.</p>
</section>

<style>
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
		font-size: clamp(2.5rem, 9vw, 4rem);
		font-weight: 500;
		line-height: 1.05;
	}

	.lead {
		max-width: 36rem;
		margin: 1.25rem 0 0;
		color: #3a3a44;
	}

	section {
		margin-top: 3rem;
	}

	h2 {
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
		margin: 0 0 1rem;
		padding-top: 0.75rem;
		border-top: 2px solid var(--ink);
		font-size: 1.0625rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	h2 i {
		color: var(--accent);
		font-family: var(--ui);
		font-size: 0.6875rem;
		font-style: normal;
		font-variant-numeric: tabular-nums;
	}

	.body {
		max-width: 38rem;
		margin: 0 0 0.75rem;
	}

	.grades {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--line);
	}

	.grades a {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		min-height: 56px;
		padding: 0.5rem 0.75rem 0.5rem 0;
		border-bottom: 1px solid var(--line);
		color: inherit;
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.grades a:hover {
		color: var(--accent);
	}

	.label {
		font-size: 1.25rem;
	}

	.count {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
	}
	/* 첫소리 칩 — 낱말 목록의 그 자리로 곧장 짚어 들어가는 길 */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin: 1rem 0 0;
	}

	.chips a {
		display: flex;
		gap: 0.3rem;
		align-items: baseline;
		justify-content: center;
		min-width: 56px;
		min-height: 48px;
		padding: 0.7rem 0.5rem 0;
		border: 1px solid var(--line);
		color: var(--ink);
		font-family: var(--ui);
		font-size: 0.9375rem;
		text-decoration: none;
	}

	.chips a span {
		color: var(--muted);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
	}

	.chips a:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.go {
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

	.go:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	/* 4급보다 위 급수 — 급수마다 한 줄로 늘어놓는다 */
	.above {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.9rem;
		align-items: baseline;
		margin: 0 0 0.6rem;
	}

	.above b {
		min-width: 3.5rem;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
		font-weight: 400;
	}

	.above span {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem;
	}

	.above a {
		display: grid;
		place-items: center;
		/* 48px — 손가락은 화면이 바뀜다고 작아지지 않는다 */
		min-width: 48px;
		min-height: 48px;
		color: var(--ink);
		font-size: 1.25rem;
		text-decoration: none;
	}

	.above a:hover {
		color: var(--accent);
	}
</style>
