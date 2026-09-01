<script lang="ts">
	import { DICT_ORIGIN } from '$lib/sites';
	import { jsonLd } from '$lib/dict/jsonld';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const url = `${DICT_ORIGIN}/hanja/낱말`;

	const ld = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'CollectionPage',
			name: '한자어 낱말 사전',
			url,
			inLanguage: 'ko',
			description: `두 글자 한자어 ${data.total}개의 훈·음과 뜻풀이`
		})
	);
</script>

<svelte:head>
	<title>한자어 {data.total}개 — 두 글자 낱말 뜻풀이 | 한자사전</title>
	<meta
		name="description"
		content="두 글자 한자어 {data.total}개를 첫소리로 나누어 정리했습니다. 낱말마다 읽는 소리와 뜻, 그리고 그 낱말을 이루는 두 한자의 훈·음을 함께 봅니다."
	/>
	<link rel="canonical" href={url} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- jsonLd 가 `<` 를 이스케이프한다 -->
	{@html ld}
</svelte:head>

<nav class="crumb" aria-label="위치">
	<a href="/hanja">한자사전</a> <span aria-hidden="true">›</span>
	<span>낱말</span>
</nav>

<header class="head">
	<p class="kicker">한자어</p>
	<h1>두 글자 낱말 {data.total}개</h1>
	<p class="lead">
		한자 하나만으로는 뜻이 잡히지 않습니다. 두 글자가 만나 비로소 우리가 쓰는 말이 됩니다. 낱말을
		고르면 그 낱말을 이루는 두 한자의 훈·음과 급수, 같은 글자를 쓰는 다른 낱말을 볼 수 있습니다.
	</p>
</header>

<nav class="jump" aria-label="첫소리">
	{#each data.groups as g (g.initial)}
		<a href="#{g.initial}">{g.initial}</a>
	{/each}
</nav>

{#each data.groups as g (g.initial)}
	<section>
		<h2 id={g.initial}>{g.initial} <span>{g.words.length}</span></h2>
		<ul>
			{#each g.words as w (w.word)}
				<li>
					<a href="/hanja/낱말/{w.word}">
						<b>{w.word}</b>
						<span class="rd">{w.reading}</span>
						<span class="mn">{w.meaning}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/each}

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
		max-width: 36rem;
		margin: 1rem 0 0;
		color: #3a3a44;
	}

	/* 첫소리 바로가기 — 815개를 훑지 않고 짚어 들어가는 길 */
	.jump {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem;
		margin: 1.5rem 0 0;
	}

	.jump a {
		display: inline-grid;
		place-items: center;
		min-width: 48px;
		min-height: 48px;
		border: 1px solid var(--line);
		color: var(--ink);
		font-family: var(--ui);
		font-size: 0.875rem;
		text-decoration: none;
	}

	.jump a:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	section {
		margin-top: 2.5rem;
	}

	h2 {
		margin: 0 0 0.75rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--ink);
		font-size: 1.25rem;
		font-weight: 500;
		scroll-margin-top: 1rem;
	}

	h2 span {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}

	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li a {
		display: flex;
		gap: 0.45rem;
		align-items: baseline;
		min-height: 48px;
		padding: 0.35rem 0.5rem 0.35rem 0;
		color: var(--ink);
		text-decoration: none;
	}

	li a:hover b {
		color: var(--accent);
	}

	li b {
		font-size: 1.0625rem;
		font-weight: 500;
	}

	.rd {
		font-family: var(--ui);
		font-size: 0.8125rem;
	}

	.mn {
		overflow: hidden;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
</style>
