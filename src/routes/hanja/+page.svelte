<script lang="ts">
	import { DICT_ORIGIN } from '$lib/sites';
	import { GRADES, ALL } from '$lib/dict';

	const total = ALL.length;
	const withStrokes = 99;
</script>

<svelte:head>
	<title>한자사전 — 8급~4급 배정한자 1,000자 훈·음·획수</title>
	<meta
		name="description"
		content="한국어문회 배정한자 8급부터 4급까지 1,000자의 훈과 음, 총획, 쓰이는 낱말을 급수별로 정리했습니다. 글자를 이루는 조각과 획순도 함께 볼 수 있습니다."
	/>
	<link rel="canonical" href="{DICT_ORIGIN}/hanja" />
</svelte:head>

<header class="head">
	<p class="kicker">한국어문회 배정한자 8급~4급</p>
	<h1>한자사전</h1>
	<p class="lead">
		{total.toLocaleString()}자의 훈·음·총획과 쓰이는 낱말을 급수별로 정리했다. 글자를 이루는 조각(日
		+ 月 = 明)과 획순({withStrokes}자)도 함께 볼 수 있다.
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
	<h2><i>02</i> 이 자료에 대하여</h2>
	<p class="body">
		한국어문회(한국한자능력검정회) 급수별 배정한자를 기준으로 삼았다. 8급이 가장 쉽고 급수가
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
</style>
