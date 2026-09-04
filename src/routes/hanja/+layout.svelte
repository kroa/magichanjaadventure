<script lang="ts">
	import { GRADES } from '$lib/dict';
	import * as pub from '$env/static/public';

	let { children } = $props();

	/**
	 * 방문 계측 — **사전에만 단다.**
	 *
	 * ── 왜 사전에만인가 ──────────────────────────────────────────────
	 * `app.html` 에 글꼴을 자체 호스팅하는 이유로 적어 둔 원칙이 있다:
	 * **아이 브라우저가 제3자에게 요청을 보내지 않는다.** 게임에 계측을 달면
	 * 그 원칙이 깨진다. 게임은 로그인 뒤에 있고 robots 가 전부 막고 있어
	 * 애초에 검색에서 들어오는 사람이 없으므로, 재서 얻을 것도 없다.
	 *
	 * 사전은 반대다. 검색으로 들어오는 어른이 독자고, "어느 검색어로 어느
	 * 페이지에 들어왔는가" 를 모르면 다음에 무엇을 더 쓸지 정할 수가 없다.
	 *
	 * ── 왜 이것인가 ──────────────────────────────────────────────────
	 * Cloudflare Web Analytics 는 쿠키를 심지 않고 개인을 식별하지 않는다.
	 * 이미 이 사이트를 내보내고 있는 곳이라 새로 늘어나는 상대도 없다.
	 *
	 * ── 값이 없으면 아무것도 하지 않는다 ─────────────────────────────
	 * 토큰은 `.env` 에 둔다(저장소에 넣지 않는다). 없으면 조용히 빠진다 —
	 * 남이 이 저장소를 받아도 빌드가 깨지지 않아야 하므로 통째로 들여와
	 * 있는지만 본다.
	 */
	const beacon: string = (pub as Record<string, string>).PUBLIC_CF_BEACON ?? '';
</script>

<svelte:head>
	<!--
		검색엔진 소유확인.

		비밀값이 아니라 **공개되어야 하는** 표식이다 — 페이지에 실려야 확인이 된다.
		사전 레이아웃에만 둔다: 게임 도메인은 검색엔진에 등록하지 않는다(robots 가 전부 막는다).

		둘 다 사전 도메인 것이다. 확인이 끝난 뒤에도 지우지 말 것 —
		없어지면 소유가 풀리고 색인 보고서를 못 본다.
	-->
	<meta name="naver-site-verification" content="e4bd6671e4bfdb30e5ceb53bc0059236bb99c41e" />
	<meta name="google-site-verification" content="q_tK5fhWjYZN1cLFRjBcbVXrrMKRO0dJPEY9ISctfK4" />

	{#if beacon}
		<script
			defer
			src="https://static.cloudflareinsights.com/beacon.min.js"
			data-cf-beacon={JSON.stringify({ token: beacon })}
		></script>
	{/if}
</svelte:head>

<!--
	한자사전 — **어른이 읽는 화면.**

	게임의 `AppShell`(하늘 그라디언트·카툰 캐릭터·HUD·보석)을 쓰지 않는다.
	같은 저장소·같은 도메인이지만 여기는 다른 독자를 만난다:
	검색으로 들어오는 사람은 작명·사자성어·검정시험을 찾는 어른이 대부분이고,
	그 사람이 카툰 화면에 떨어지면 "내가 찾던 게 아니네" 하고 나간다.

	말투와 생김새를 나누는 것은 취향이 아니라 **판정 요소**이기도 하다 —
	광고 정책은 시각물·캐릭터·언어를 보고 대상을 가른다.

	조판 방침: **색을 늘려 해결하지 않는다.** 위계는 크기·굵기·간격으로 세우고
	채도 있는 색은 인장 주홍 하나만 쓴다. 2획짜리 一 이든 17획짜리 韓 이든
	같은 골격이 버티게 하기 위해서다.
-->
<div class="doc">
	<header>
		<a class="brand" href="/hanja">한자사전</a>
		<nav aria-label="차례">
			{#each GRADES as g (g.label)}
				<a href="/hanja/급수/{g.label}">{g.label}</a>
			{/each}
			<a class="words" href="/hanja/낱말">낱말</a>
		</nav>
	</header>

	<main id="main">
		{@render children?.()}
	</main>

	<footer>
		<p>
			한국어문회 배정한자 8급~4급 1,000자의 훈·음·총획과 용례를 정리한 자료입니다. 초등학생용 학습
			게임 <a href="/" data-allow-small>마법한자탐험대</a>에서 쓰는 데이터를 공개한 것입니다.
		</p>
		<p class="fine">설명 문장은 직접 작성했으며 사전·교재의 문장을 옮기지 않았습니다.</p>
	</footer>
</div>

<style>
	/*
		게임 토큰(--color-magic-*)을 쓰지 않는 것이 의도다.
		토큰을 공유하면 아무리 조판을 달리해도 결국 같은 얼굴이 된다.
	*/
	.doc {
		--ink: #14141a;
		--muted: #6b6b76;
		--line: #dedee4;
		--accent: #b03a2b;
		--paper: #fff;
		--paper-2: #fbfaf8;
		--ghost: #e8e6e1;
		--serif: 'Noto Serif KR', 'Nanum Myeongjo', 'Apple SD Gothic Neo', serif;
		--ui: system-ui, -apple-system, 'Segoe UI', 'Malgun Gothic', sans-serif;

		min-height: 100dvh;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--serif);
		font-size: 17px;
		line-height: 1.8;
		/* 자간을 살짝 좁혀 명조가 헐거워 보이지 않게 */
		letter-spacing: -0.003em;
	}

	header {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.5rem;
		align-items: center;
		justify-content: space-between;
		max-width: 60rem;
		margin: 0 auto;
		padding: 0 1.25rem;
		border-bottom: 1px solid var(--line);
	}

	.brand {
		display: inline-grid;
		align-items: center;
		min-height: 56px;
		color: var(--ink);
		font-size: 1.0625rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-decoration: none;
	}

	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.1rem;
	}

	/*
		급수 링크도 48px 을 지킨다. 어른이 읽는 화면이지만
		**손가락은 화면이 바뀐다고 작아지지 않는다.**
	*/
	nav a {
		display: inline-grid;
		place-items: center;
		min-width: 48px;
		min-height: 48px;
		padding: 0 0.4rem;
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
		letter-spacing: 0.02em;
		text-decoration: none;
		transition: color 0.15s ease;
	}

	/* 낱말은 급수와 성격이 다른 축이라 한 칸 띄우고 먹색으로 세워 둔다 */
	nav a.words {
		margin-left: 0.4rem;
		border-left: 1px solid var(--line);
		color: var(--ink);
		padding-left: 0.8rem;
	}

	nav a:hover,
	.brand:hover {
		color: var(--accent);
	}

	main {
		max-width: 60rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 4rem;
	}

	footer {
		max-width: 60rem;
		margin: 0 auto;
		padding: 1.75rem 1.25rem 4rem;
		border-top: 1px solid var(--line);
		color: var(--muted);
		font-family: var(--ui);
		font-size: 0.8125rem;
		line-height: 1.7;
	}

	footer a {
		color: var(--accent);
	}

	.fine {
		margin-top: 0.4rem;
	}
</style>
