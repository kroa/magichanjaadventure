<script lang="ts">
	import StrokeOrder from '$lib/components/dict/StrokeOrder.svelte';
	import { withParticle } from '$lib/dict';
	import { jsonLd } from '$lib/dict/jsonld';
	import { DICT_ORIGIN } from '$lib/sites';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const site = DICT_ORIGIN;
	const e = $derived(data.entry);
	const url = $derived(`${site}/hanja/${encodeURIComponent(e.character)}`);

	const ld = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'DefinedTerm',
			name: e.character,
			alternateName: `${e.meaning} ${e.reading}`,
			description: data.summary,
			url,
			termCode: e.character,
			inDefinedTermSet: {
				'@type': 'DefinedTermSet',
				name: `한국어문회 ${e.gradeLabel} 배정한자`,
				url: `${site}/hanja/급수/${e.gradeLabel}`
			}
		})
	);
</script>

<svelte:head>
	<title>{e.character} ({e.meaning} {e.reading}) — 뜻·음·획순 | 한자사전</title>
	<meta
		name="description"
		content="{e.character}의 훈과 음은 '{e.meaning} {e.reading}', 총획은 {e.strokeCount}획, 한국어문회 {e.gradeLabel} 배정한자입니다. 쓰이는 낱말과 획순을 함께 정리했습니다."
	/>
	<link rel="canonical" href={url} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- jsonLd 가 `<` 를 이스케이프해 태그 조기 종료를 막는다 -->
	{@html ld}
</svelte:head>

<nav class="crumb" aria-label="위치">
	<a href="/hanja">한자사전</a> <span aria-hidden="true">›</span>
	<a href="/hanja/급수/{e.gradeLabel}">{e.gradeLabel}</a> <span aria-hidden="true">›</span>
	<span>{e.character}</span>
</nav>

<!--
	머리는 활자 견본처럼 짠다 — 한자가 화면에서 가장 큰 것이 되고,
	훈·음과 제원은 오른쪽에 작게 붙는다. 색이 아니라 크기 차이로 위계를 만든다.
-->
<header class="head">
	<div class="specimen">
		<p class="glyph">{e.character}</p>
		<p class="rule"><span>{e.meaning} {e.reading}</span><span>{e.strokeCount}획</span></p>
	</div>

	<div class="facts">
		<p class="kicker">한국어문회 배정한자 · {e.gradeLabel} · {e.category}</p>
		<h1>{e.meaning} {e.reading}</h1>
		<dl>
			<div>
				<dt>훈·음</dt>
				<dd>{e.meaning} {e.reading}</dd>
			</div>
			<div>
				<dt>총획</dt>
				<dd>{e.strokeCount}획</dd>
			</div>
			<div>
				<dt>급수</dt>
				<dd><a href="/hanja/급수/{e.gradeLabel}">{e.gradeLabel}</a></dd>
			</div>
			<div>
				<dt>분류</dt>
				<dd>{e.category}</dd>
			</div>
		</dl>
	</div>
</header>

<section>
	<h2><i>01</i> 뜻풀이</h2>
	<p class="body">{data.summary}</p>
	{#if data.madeOf}
		<figure class="made">
			<p class="eq">
				{#each data.madeOf.parts as part, i (part)}
					{#if i > 0}<span class="op">+</span>{/if}<b>{part}</b>
				{/each}
				<span class="op">=</span><b class="res">{e.character}</b>
			</p>
			<figcaption>{data.madeOf.note}</figcaption>
		</figure>
	{/if}
</section>

{#if data.strokes}
	<section>
		<h2><i>02</i> 획순 <em>{e.strokeCount}획</em></h2>
		<StrokeOrder character={e.character} strokes={data.strokes} />
	</section>
{/if}

{#if e.exampleWords.length}
	<section>
		<h2><i>03</i> 쓰이는 낱말</h2>
		<dl class="words">
			{#each e.exampleWords as w (w.word)}
				<div>
					<dt>{w.word} <span>{w.reading}</span></dt>
					<dd>{w.meaning}</dd>
				</div>
			{/each}
		</dl>
	</section>
{/if}

{#if data.partners.length}
	<section>
		<h2><i>04</i> 함께 쓰는 글자</h2>
		<p class="note">
			{withParticle(e.character, e.reading, '과와')} 짝을 이루어 두 글자 낱말을 만든다.
		</p>
		<p class="chips">
			{#each data.partners as p (p)}
				<a href="/hanja/{p}">{p}</a>
			{/each}
		</p>
	</section>
{/if}

{#if data.buildsInto.length}
	<section>
		<h2><i>05</i> 이 글자가 들어가는 한자</h2>
		<p class="chips">
			{#each data.buildsInto as b (b)}
				<a href="/hanja/{b}">{b}</a>
			{/each}
		</p>
	</section>
{/if}

<section>
	<h2><i>06</i> {e.gradeLabel}의 다른 글자</h2>
	<ul class="nearby">
		{#each data.nearby as n (n.character)}
			<li>
				<a href="/hanja/{n.character}">
					<b>{n.character}</b><span>{n.meaning} {n.reading}</span>
				</a>
			</li>
		{/each}
	</ul>
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

	/* ── 활자 견본 ─────────────────────────────────────────── */
	.head {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: 2.5rem;
		align-items: end;
		padding-bottom: 2.5rem;
	}

	@media (max-width: 44rem) {
		.head {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}

	.glyph {
		margin: 0;
		font-size: clamp(7rem, 22vw, 13rem);
		font-weight: 500;
		line-height: 0.9;
		letter-spacing: 0;
	}

	.rule {
		display: flex;
		justify-content: space-between;
		margin: 0.75rem 0 0;
		padding-top: 0.5rem;
		border-top: 1px solid var(--ink);
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
	}

	.kicker {
		margin: 0 0 0.4rem;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		letter-spacing: 0.06em;
	}

	h1 {
		margin: 0 0 1.25rem;
		font-size: clamp(1.75rem, 5vw, 2.5rem);
		font-weight: 500;
		line-height: 1.2;
	}

	.facts dl {
		margin: 0;
		border-top: 1px solid var(--line);
	}

	.facts div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.55rem 0;
		border-bottom: 1px solid var(--line);
	}

	.facts dt {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
	}

	.facts dd {
		margin: 0;
		font-size: 0.95rem;
	}

	.facts dd a {
		color: var(--ink);
	}

	/* ── 절 ───────────────────────────────────────────────── */
	section {
		margin-top: 3.5rem;
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

	h2 em {
		margin-left: auto;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		font-style: normal;
	}

	.body {
		max-width: 38rem;
		margin: 0;
		font-size: 1.0625rem;
	}

	.note {
		margin: 0 0 0.75rem;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
	}

	/* ── 조합 ─────────────────────────────────────────────── */
	.made {
		max-width: 38rem;
		margin: 1.5rem 0 0;
		padding: 1.25rem 1.5rem;
		background: var(--paper-2);
	}

	.eq {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin: 0 0 0.5rem;
	}

	.eq b {
		font-size: 2rem;
		font-weight: 500;
		line-height: 1;
	}

	.eq .res {
		color: var(--accent);
	}

	.eq .op {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.875rem;
	}

	.made figcaption {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
	}

	/* ── 낱말 ─────────────────────────────────────────────── */
	.words {
		max-width: 38rem;
		margin: 0;
		border-top: 1px solid var(--line);
	}

	.words div {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		align-items: baseline;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--line);
	}

	.words dt {
		min-width: 7rem;
		font-size: 1.125rem;
	}

	.words dt span {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
	}

	.words dd {
		margin: 0;
		color: #3a3a44;
		font-size: 0.95rem;
	}

	/* ── 칩 ───────────────────────────────────────────────── */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0;
	}

	.chips a {
		display: grid;
		place-items: center;
		min-width: 52px;
		min-height: 52px;
		border: 1px solid var(--line);
		color: var(--ink);
		font-size: 1.375rem;
		text-decoration: none;
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			translate 0.15s ease;
	}

	.chips a:hover {
		border-color: var(--accent);
		color: var(--accent);
		translate: 0 -2px;
	}

	/* ── 이웃 글자 ────────────────────────────────────────── */
	.nearby {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--line);
	}

	.nearby a {
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
		min-height: 56px;
		padding: 0.5rem 0.75rem 0.5rem 0;
		border-bottom: 1px solid var(--line);
		color: inherit;
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.nearby a:hover {
		color: var(--accent);
	}

	.nearby b {
		font-size: 1.375rem;
		font-weight: 500;
	}

	.nearby span {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.chips a {
			transition: none;
		}
	}
</style>
