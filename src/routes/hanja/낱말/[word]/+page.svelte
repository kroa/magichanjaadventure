<script lang="ts">
	import { DICT_ORIGIN } from '$lib/sites';
	import { jsonLd } from '$lib/dict/jsonld';
	import { gradeExists, withParticle } from '$lib/dict';
	import StrokeOrder from '$lib/components/dict/StrokeOrder.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const e = $derived(data.entry);
	const url = $derived(`${DICT_ORIGIN}/hanja/낱말/${e.word}`);
	/* 급수표가 없는 급수(3급II 등)로 링크를 걸면 404 가 된다 — 있을 때만 급수 이름을 준다 */
	const headGrade = $derived(e.head && gradeExists(e.head.gradeLabel) ? e.head.gradeLabel : null);

	/** 앞·뒤 글자를 같은 모양의 카드로 보여 준다 */
	const parts = $derived(
		[
			{ ch: e.word[0], entry: e.head, role: '앞 글자' },
			{ ch: e.word[1], entry: e.tail, role: '뒤 글자' }
		].filter((p) => p.ch)
	);

	const ld = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'DefinedTerm',
			name: e.word,
			alternateName: e.reading,
			description: data.summary,
			url,
			inLanguage: 'ko',
			inDefinedTermSet: {
				'@type': 'DefinedTermSet',
				name: '한자어 낱말 사전',
				url: `${DICT_ORIGIN}/hanja/낱말`
			}
		})
	);
</script>

<svelte:head>
	<title>{e.word} ({e.reading}) — 뜻과 한자 풀이 | 한자사전</title>
	<meta name="description" content={data.summary} />
	<link rel="canonical" href={url} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- jsonLd 가 `<` 를 이스케이프한다 -->
	{@html ld}
</svelte:head>

<nav class="crumb" aria-label="위치">
	<a href="/hanja">한자사전</a> <span aria-hidden="true">›</span>
	<a href="/hanja/낱말">낱말</a> <span aria-hidden="true">›</span>
	<span>{e.word}</span>
</nav>

<header class="head">
	<p class="kicker">한자어</p>
	<h1>{e.word}</h1>
	<p class="reading">{e.reading}</p>
	<p class="meaning">{e.meaning}</p>
</header>

<p class="summary">{data.summary}</p>

<!--
	낱말을 다시 글자로 풀어 놓는다.
	낱말만 외우면 다음 낱말에서 또 막히지만, 글자를 알면 그 글자가 든 낱말이 전부 열린다.
-->
<section>
	<h2>글자로 풀어 보기</h2>
	<div class="parts">
		{#each parts as p (p.ch)}
			<a class="part" href="/hanja/{p.ch}">
				<span class="role">{p.role}</span>
				<b class="part-glyph">{p.ch}</b>
				{#if p.entry}
					<span class="hun">{p.entry.meaning} {p.entry.reading}</span>
					<span class="meta">{p.entry.gradeLabel} · {p.entry.strokeCount}획</span>
				{:else}
					<span class="hun">이 사전에 없는 글자</span>
				{/if}
			</a>
		{/each}
	</div>
</section>

{#if data.parts.length}
	<!--
		글자가 어떻게 만들어졌는지 — 日 + 月 = 明.
		여느 한자 사전에 없는 각도이고, 낱말을 찾은 사람에게는 글자를 외울 실마리가 된다.
	-->
	<section>
		<h2>글자의 짜임</h2>
		{#each data.parts as p (p.character)}
			<p class="recipe">
				<b>{p.character}</b>
				<span class="formula">
					{#each p.recipe.parts as part, i (part)}
						{#if i > 0}<em>+</em>{/if}<a href="/hanja/{part}">{part}</a>
					{/each}
					<em>=</em>
					<a href="/hanja/{p.character}">{p.character}</a>
				</span>
				<span class="story">{p.recipe.note}</span>
			</p>
		{/each}
	</section>
{/if}

{#if data.strokes.length}
	<!--
		낱말을 찾은 사람은 대개 그 글자를 **쓸 줄 모른다.**
		획순은 이 사전이 따로 만들어 가진 것인데 지금까지 글자 페이지에만 있었다.
		한 번 더 눌러 들어가야 보이면 대부분은 안 누른다 — 여기서 바로 보여 준다.
	-->
	<section>
		<h2>획순</h2>
		<div class="strokes">
			{#each data.strokes as s (s.character)}
				<!-- 글자마다 하나로 감싼다 — 컴포넌트가 최상위 요소를 몇 개 내보내든 여기서는 한 칸이다 -->
				<div class="stroke-card">
					<StrokeOrder character={s.character} strokes={s.strokes} />
				</div>
			{/each}
		</div>
	</section>
{/if}

{#if data.homophones.length}
	<!--
		한자어를 배우는 이유가 여기 다 들어 있다 — 소리는 같은데 뜻이 딴판인 낱말.
		'구조' 라고 똑같이 읽어도 救助 와 構造 는 아무 관계가 없고, **한자를 봐야** 갈린다.
	-->
	<section>
		<h2>소리가 같은 다른 낱말</h2>
		<p class="note">
			똑같이 ‘{e.reading}’이라 읽지만 한자가 다르고 뜻도 다르다. 소리만으로는 가릴 수 없다.
		</p>
		<ul class="words">
			{#each data.homophones as w (w.word)}
				<li>
					<a href="/hanja/낱말/{w.word}">
						<b>{w.word}</b><span>{w.reading}</span><i>{w.meaning}</i>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if data.sharesHead.length}
	<section>
		<h2>{withParticle(e.word[0], e.head?.reading ?? e.word[0], '이가')} 들어가는 다른 낱말</h2>
		<ul class="words">
			{#each data.sharesHead as w (w.word)}
				<li>
					<a href="/hanja/낱말/{w.word}">
						<b>{w.word}</b><span>{w.reading}</span><i>{w.meaning}</i>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if data.sharesTail.length}
	<section>
		<h2>{withParticle(e.word[1], e.tail?.reading ?? e.word[1], '이가')} 들어가는 다른 낱말</h2>
		<ul class="words">
			{#each data.sharesTail as w (w.word)}
				<li>
					<a href="/hanja/낱말/{w.word}">
						<b>{w.word}</b><span>{w.reading}</span><i>{w.meaning}</i>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<p class="more">
	<a href="/hanja/낱말">낱말 전체 보기</a>
	{#if headGrade}
		<a href="/hanja/급수/{headGrade}">{headGrade} 글자 목록</a>
	{/if}
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
		font-size: clamp(2.5rem, 10vw, 4rem);
		font-weight: 500;
		line-height: 1.05;
		letter-spacing: 0.02em;
	}

	.reading {
		margin: 0.4rem 0 0;
		color: var(--accent);
		font-family: var(--ui);
		font-size: 1rem;
		letter-spacing: 0.04em;
	}

	.meaning {
		margin: 0.2rem 0 0;
		font-size: 1.25rem;
	}

	.summary {
		max-width: 38rem;
		margin: 1.5rem 0 0;
		color: #3a3a44;
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

	.parts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.75rem;
	}

	.part {
		display: grid;
		gap: 0.15rem;
		padding: 1rem;
		border: 1px solid var(--line);
		color: var(--ink);
		text-decoration: none;
		transition: border-color 0.15s ease;
	}

	.part:hover {
		border-color: var(--accent);
	}

	.role {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.6875rem;
		letter-spacing: 0.06em;
	}

	.part-glyph {
		font-size: 3rem;
		font-weight: 500;
		line-height: 1.1;
	}

	.part:hover .part-glyph {
		color: var(--accent);
	}

	.hun {
		font-family: var(--ui);
		font-size: 0.875rem;
	}

	.meta {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
	}

	.words {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.words a {
		display: flex;
		gap: 0.45rem;
		align-items: baseline;
		min-height: 48px;
		padding: 0.35rem 0.5rem 0.35rem 0;
		color: var(--ink);
		text-decoration: none;
	}

	.words a:hover b {
		color: var(--accent);
	}

	.words b {
		font-size: 1.0625rem;
		font-weight: 500;
	}

	.words span {
		font-family: var(--ui);
		font-size: 0.8125rem;
	}

	.words i {
		overflow: hidden;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		font-style: normal;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.recipe {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 0.75rem;
		align-items: baseline;
		margin: 0 0 0.75rem;
	}

	.recipe > b {
		font-size: 1.5rem;
		font-weight: 500;
	}

	.formula {
		display: inline-flex;
		gap: 0.35rem;
		align-items: baseline;
		font-size: 1.125rem;
	}

	.formula a {
		color: var(--ink);
		text-decoration: none;
		border-bottom: 1px solid var(--line);
	}

	.formula a:hover {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	.formula em {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
		font-style: normal;
	}

	.story {
		color: #3a3a44;
		font-size: 0.9375rem;
	}

	.strokes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1.25rem;
	}

	.stroke-card {
		display: grid;
		gap: 0.5rem;
		align-content: start;
	}

	.note {
		max-width: 34rem;
		margin: 0 0 0.9rem;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
	}

	.more {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 2.5rem 0 0;
	}

	.more a {
		display: inline-grid;
		place-items: center;
		min-height: 48px;
		padding: 0 1rem;
		border: 1px solid var(--line);
		color: var(--ink);
		font-family: var(--ui);
		font-size: 0.875rem;
		text-decoration: none;
	}

	.more a:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
</style>
