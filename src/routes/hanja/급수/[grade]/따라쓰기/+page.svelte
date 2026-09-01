<script lang="ts">
	import { DICT_ORIGIN } from '$lib/sites';
	import { jsonLd } from '$lib/dict/jsonld';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const url = $derived(`${DICT_ORIGIN}/hanja/급수/${data.grade}/따라쓰기`);

	/**
	 * 따라쓰기 활동지.
	 *
	 * 검색에서 사람들이 실제로 찾는 것은 `8급 한자 따라쓰기 pdf`, `8급 한자 활동지` 다.
	 * 그런데 지금 그 자리를 채우고 있는 것은 블로그에 올린 PDF 파일들이라,
	 * **받아서 열어야** 볼 수 있고 미리 볼 수도 없다.
	 *
	 * 여기서는 화면에서 바로 보이고, 인쇄하면 그대로 활동지가 되게 한다.
	 * 파일을 만들어 두지 않는 이유는 그편이 낫기 때문이 아니라 —
	 * 브라우저의 인쇄가 이미 PDF 저장을 해 주므로 **파일을 따로 둘 이유가 없다.**
	 */
	const PER_ROW = 8;

	/** 옅게 깔 글자 — 획순 좌표가 있으면 폴리라인, 없으면 글자 자체 */
	const rows = $derived(data.characters);

	const ld = $derived(
		jsonLd({
			'@context': 'https://schema.org',
			'@type': 'LearningResource',
			name: `${data.grade} 한자 따라쓰기 활동지`,
			url,
			learningResourceType: '연습지',
			educationalLevel: `한국어문회 ${data.grade}`,
			inLanguage: 'ko',
			teaches: data.characters.map((c) => c.character).join(' ')
		})
	);
</script>

<svelte:head>
	<title>{data.grade} 한자 따라쓰기 활동지 — 인쇄용 {data.characters.length}자 | 한자사전</title>
	<meta
		name="description"
		content="한국어문회 {data.grade} 배정한자 {data.characters
			.length}자 따라쓰기 활동지입니다. 화면에서 바로 보고 인쇄하거나 PDF로 저장할 수 있습니다."
	/>
	<link rel="canonical" href={url} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- jsonLd 가 `<` 를 이스케이프한다 -->
	{@html ld}
</svelte:head>

<nav class="crumb" aria-label="위치">
	<a href="/hanja">한자사전</a> <span aria-hidden="true">›</span>
	<a href="/hanja/급수/{data.grade}">{data.grade}</a> <span aria-hidden="true">›</span>
	<span>따라쓰기</span>
</nav>

<header class="head">
	<p class="kicker">인쇄용 활동지</p>
	<h1>{data.grade} 한자 따라쓰기</h1>
	<p class="lead">
		한국어문회 {data.grade} 배정한자 {data.characters.length}자입니다. 옅은 글자를 따라 쓴 다음 빈
		칸에 혼자 써 보세요. <strong>인쇄</strong>하면 그대로 활동지가 되고, 인쇄 창에서 ‘PDF로 저장’을
		고르면 파일로도 남습니다.
	</p>
	<p class="actions">
		<button type="button" onclick={() => window.print()}>인쇄하기</button>
		<a href="/hanja/급수/{data.grade}">{data.grade} 글자 목록</a>
	</p>
</header>

<div class="sheet">
	{#each rows as c (c.character)}
		<section class="row">
			<div class="label">
				<b>{c.character}</b>
				<span>{c.meaning} {c.reading}</span>
				<i>{c.strokeCount}획</i>
			</div>

			<div class="boxes">
				<!--
					앞쪽 두 칸은 옅은 밑글자를 깔아 따라 쓰게 하고, 나머지는 빈 칸이다.
					획순 좌표가 있는 글자는 폴리라인으로 깐다 — 글꼴 메트릭에 기대지 않아
					서체를 바꿔도 어긋나지 않는다(사전의 획순 상자와 같은 방식이다).
				-->
				{#each Array(PER_ROW), i (i)}
					<div class="cell">
						{#if i < 2}
							{#if c.strokes}
								<svg viewBox="0 0 100 100" aria-hidden="true">
									{#each c.strokes as s, k (k)}
										<polyline points={s.map(([x, y]) => `${x},${y}`).join(' ')} />
									{/each}
								</svg>
							{:else}
								<span class="ghost" aria-hidden="true">{c.character}</span>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>

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

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 1.25rem 0 0;
	}

	button,
	.actions a {
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

	button {
		border-color: var(--ink);
	}

	button:hover,
	.actions a:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.sheet {
		margin-top: 2rem;
	}

	.row {
		margin-bottom: 1.1rem;
		break-inside: avoid;
	}

	.label {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		margin-bottom: 0.3rem;
	}

	.label b {
		font-size: 1.25rem;
		font-weight: 500;
	}

	.label span {
		font-family: var(--ui);
		font-size: 0.8125rem;
	}

	.label i {
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.75rem;
		font-style: normal;
	}

	.boxes {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 0;
		border: 1px solid var(--ink);
	}

	@media (max-width: 34rem) {
		.boxes {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.cell {
		position: relative;
		aspect-ratio: 1;
		border-right: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}

	/* 네모 칸 가운데의 십자 보조선 — 글자 자리를 잡아 준다 */
	.cell::before,
	.cell::after {
		position: absolute;
		background: var(--line);
		content: '';
	}

	.cell::before {
		top: 50%;
		right: 8%;
		left: 8%;
		height: 1px;
	}

	.cell::after {
		top: 8%;
		bottom: 8%;
		left: 50%;
		width: 1px;
	}

	.cell svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.cell svg polyline {
		fill: none;
		stroke: #c9c9d0;
		stroke-width: 7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.ghost {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: #c9c9d0;
		font-size: 2.4rem;
		line-height: 1;
	}

	/*
		인쇄 — 화면의 군더더기를 걷고 종이에 맞춘다.
		활동지는 **연필로 쓰는 물건**이므로 배경을 깔지 않고 선만 남긴다.
	*/
	@media print {
		.crumb,
		.actions {
			display: none;
		}

		.head {
			padding-bottom: 0.75rem;
			border-bottom-width: 1px;
		}

		h1 {
			font-size: 1.25rem;
		}

		.lead {
			display: none;
		}

		.sheet {
			margin-top: 0.75rem;
		}

		.row {
			margin-bottom: 0.5rem;
		}

		.cell {
			aspect-ratio: 1;
		}
	}
</style>
